/** Administrative operator simulation alongside the clinical schedules. Each
 * transition executes the native authority; no TypeScript placement reducer.
 * Independent random streams preserve the frozen clinical scenario seeds. */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { Rng } from './rng';
import type { WorldRun } from './world';

const patientSchema = z.object({ id: z.string(), admitted: z.boolean(), bed: z.number().nullable(),
  revision: z.number(), encounter: z.number(),
  last: z.object({ kind: z.enum(['admit', 'transfer', 'discharge']), source: z.number().nullable(), target: z.number().nullable() }).nullable() });
export const adtStateSchema = z.object({ patients: z.array(patientSchema), beds: z.array(z.object({
  id: z.number(), unit: z.string(), active: z.boolean().default(true), phase: z.enum(['ready', 'occupied', 'dirty', 'cleaning']), occupant: z.string().nullable(),
})) });
export type AdtState = z.infer<typeof adtStateSchema>;
export type NativeCommand = Record<string, Record<string, string | number>>;
export type Authority = (state: AdtState, command: NativeCommand) => Promise<AdtState>;

/** One sequential native child, bounded request timeout, explicit lifecycle. */
export function nativeAdt(binary: string) {
  const child = spawn(binary, ['serve'], { stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, LEAN_NUM_THREADS: '2' } });
  const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
  let sequence = 0;
  let failure: Error | undefined;
  child.on('error', error => { failure = error; });
  const apply: Authority = async (state, command) => {
    if (failure) throw failure;
    const id = ++sequence;
    child.stdin.write(JSON.stringify({ id, op: 'adt-commit', input: { state, versions: [], expected: [], role: 'bedManager', command } }) + '\n');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const line = await Promise.race([lines.next(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('native ADT simulation timeout')), 10000);
      })]);
      if (line.done) throw failure ?? new Error('native ADT simulation exited');
      const response = z.object({ id: z.number(), error: z.string().optional(),
        result: z.object({ state: adtStateSchema.optional(), rejected: z.string().optional() }).optional() }).parse(JSON.parse(line.value));
      if (response.id !== id || response.error || !response.result?.state) throw new Error(`native ADT simulation refused ${JSON.stringify(command)}: ${response.error ?? response.result?.rejected}`);
      return response.result.state;
    } finally { if (timer) clearTimeout(timer); }
  };
  return { apply, close: () => { child.stdin.end(); child.kill(); } };
}

/** Provisional scenario assumptions, not measured incidence estimates. */
export const ADT_RATES = { transferPerPatientDay: 0.03, swapPerBoardDay: 0.05,
  erroneousAdmission: 0.01, erroneousTransfer: 0.02, erroneousDischargePerPatientDay: 0.002 };
export interface AdtEvent { id: number; day: number; minute: number; source: string; command: NativeCommand }
export interface TransportEvent { event: number; patient: string; bed: number; day: number; minute: number; outcome: 'completed' | 'superseded' }

export async function simulateAdt(run: WorldRun, authority: Authority, rates = ADT_RATES) {
  let state: AdtState = {
    patients: run.pop.all.map(p => ({ id: p.id, admitted: false, bed: null, revision: 0, encounter: 0, last: null })),
    beds: ['medicine', 'surgery'].flatMap((unit, i) => Array.from({length: 12}, (_, j) => ({id: (i+4)*100+j+1, unit, active:true, phase: 'ready' as const, occupant: null}))),
  };
  for (const ip of run.initial.inpatients) {
    const p = state.patients.find(p => p.id === ip.patientId);
    const bed = state.beds.find(b => b.unit === ip.service && b.occupant === null);
    if (!p || !bed) throw new Error('invalid initial ADT census');
    p.admitted = true; p.bed = bed.id; bed.occupant = p.id; bed.phase = 'occupied';
  }
  const initial = structuredClone(state);
  const events: AdtEvent[] = [], transport: TransportEvent[] = [];
  const pending: (TransportEvent & { revision: number })[] = [];
  let instant = 0;
  const flush = (until: number) => {
    for (const t of pending.filter(t => t.day * 1440 + t.minute <= until)) {
      const p = state.patients.find(p => p.id === t.patient);
      const {revision, ...record} = t;
      transport.push({...record, outcome: p?.revision === revision && p.bed === t.bed ? 'completed' : 'superseded'});
    }
    for (let i = pending.length - 1; i >= 0; i--) if ((pending[i]?.day ?? 0)*1440 + (pending[i]?.minute ?? 0) <= until) pending.splice(i,1);
  };
  const step = async (day: number, minute: number, source: string, command: NativeCommand) => {
    instant = Math.max(instant + 1, day*1440+minute);
    flush(instant);
    const before = state;
    state = await authority(state, command);
    const id = events.length + 1;
    events.push({id, day: Math.floor(instant/1440), minute: instant%1440, source, command});
    for (const p of state.patients) if (p.bed !== null && before.patients.find(b => b.id === p.id)?.bed !== p.bed) {
      const done = instant + new Rng(`${run.seed}:adt-transport:${id}:${p.id}`).int(5,20);
      pending.push({event:id, patient:p.id, bed:p.bed, day:Math.floor(done/1440), minute:done%1440, revision:p.revision, outcome:'completed'});
    }
  };
  const ready = async (day: number, minute: number, bed: number, source: string) => {
    if (state.beds.find(b => b.id === bed)?.phase === 'dirty') await step(day,minute,source,{clean:{bed}});
    if (state.beds.find(b => b.id === bed)?.phase === 'cleaning') await step(day,minute+30,source,{ready:{bed}});
  };
  const freeBed = (unit: string) => state.beds.find(b => b.unit === unit && b.active && b.phase === 'ready' && b.occupant === null)?.id;
  const current = (id: string) => {
    const p = state.patients.find(p => p.id === id);
    if (!p) throw new Error(`unknown ADT patient ${id}`);
    return p;
  };
  for (const output of run.days) {
    const day = output.state.day;
    // Cleaning is operational work, independent of clinical discharge documentation.
    for (const b of [...state.beds]) if (b.phase === 'dirty') await ready(day,7*60,b.id,'turnover');
    const jobs = [
      ...output.state.admissions.filter(a => a.day === day).map(a => ({ kind:'admit' as const, patient:a.patientId, minute:a.clock, unit:a.service, source:a.id })),
      ...output.state.discharges.filter(d => d.day === day && d.kind === 'inpatient').map(d => ({kind:'discharge' as const, patient:d.patientId, minute:d.clock, unit:d.service, source:d.id})),
      ...state.patients.filter(p => p.admitted).map(p => ({kind:'operations' as const, patient:p.id, minute:10*60, unit:'',source:'ward-operations'})),
      {kind:'swap' as const,patient:'',minute:14*60,unit:'',source:'capacity-rebalance'},
    ].sort((a,b) => a.minute-b.minute || a.patient.localeCompare(b.patient));
    for (const job of jobs) {
      const r = new Rng(`${run.seed}:adt:${day}:${job.kind}:${job.patient}`);
      const at = (command: NativeCommand) => step(day,job.minute,job.source,command);
      if (job.kind === 'swap') {
        if (!r.chance(rates.swapPerBoardDay)) continue;
        const placed = r.shuffle(state.patients.filter(p => p.admitted && p.bed !== null));
        const p = placed[0];
        const unit = state.beds.find(b => b.id === p?.bed)?.unit;
        const q = placed.find(q => q.id !== p?.id && state.beds.find(b => b.id === q.bed)?.unit === unit);
        if (p?.bed != null && q?.bed != null) await at({swap:{patient:p.id,other:q.id,source:p.bed,target:q.bed}});
        continue;
      }
      const patient = job.patient;
      if (job.kind === 'admit') {
        let bed = freeBed(job.unit);
        if (bed === undefined) {
          // Dirty capacity is not occupied capacity. Wait for explicit native
          // turnover instead of aborting a later admission or bypassing hygiene.
          const turnover = state.beds.find(b => b.unit === job.unit && b.active &&
            b.occupant === null && (b.phase === 'dirty' || b.phase === 'cleaning'));
          if (turnover) {
            await ready(day, job.minute, turnover.id, 'admission-turnover');
            bed = freeBed(job.unit);
          }
        }
        if (bed === undefined) throw new Error('simulated ADT capacity exhausted');
        await at({admit:{patient,bed}});
        if (r.chance(rates.erroneousAdmission)) {
          await at({cancelAdmit:{patient,event:current(patient).revision}});
          await ready(day,job.minute,bed,'admission-correction-turnover');
          await at({admit:{patient,bed}});
        }
      } else if (job.kind === 'discharge') {
        await at({discharge:{patient}});
      } else if (current(patient).admitted && current(patient).bed !== null) {
        if (r.chance(rates.erroneousDischargePerPatientDay)) {
          const bed = current(patient).bed;
          if (bed === null) throw new Error('missing discharge bed');
          await at({discharge:{patient}});
          const event = current(patient).revision;
          await ready(day,job.minute,bed,'erroneous-discharge-turnover');
          await at({cancelDischarge:{patient,event,bed}});
        }
        if (r.chance(rates.transferPerPatientDay)) {
          const source = current(patient).bed;
          const unit = state.beds.find(b => b.id === source)?.unit;
          const target = unit ? freeBed(unit) : undefined;
          if (source === null || target === undefined) continue;
          await at({transfer:{patient,source,target}});
          if (r.chance(rates.erroneousTransfer)) {
            const event = current(patient).revision;
            await ready(day,job.minute,source,'transfer-correction-turnover');
            await at({cancelTransfer:{patient,event}});
          }
        }
      }
    }
  }
  flush(Number.POSITIVE_INFINITY);
  return {protocol:'adt-realism-v1', seed:run.seed, rates, initial, events, transport, final:state};
}
