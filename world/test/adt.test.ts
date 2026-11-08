import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { nativeAdt, simulateAdt } from '../src/adt';
import { run } from './helpers';

it('generates seed-stable native ADT swaps and all corrections with a separate transport process', async () => {
  const world = run(1), original = structuredClone(world);
  const native = nativeAdt(process.env.EHR_BIN ?? resolve(__dirname, '../../lean/.lake/build/bin/ehr'));
  try {
    const rates = {transferPerPatientDay:1, swapPerBoardDay:1, erroneousAdmission:1,
      erroneousTransfer:1, erroneousDischargePerPatientDay:1};
    const first = await simulateAdt(world,native.apply,rates);
    expect(await simulateAdt(world,native.apply,rates)).toEqual(first);
    expect(world).toEqual(original);
    const kinds = new Set(first.events.flatMap(e => Object.keys(e.command)));
    for (const kind of ['admit','discharge','transfer','swap','cancelAdmit','cancelTransfer','cancelDischarge','clean','ready']) expect(kinds.has(kind),kind).toBe(true);
    expect(first.transport.length).toBeGreaterThan(0);
    expect(first.transport.some(t => t.outcome === 'superseded')).toBe(true);
    for (const t of first.transport) {
      const event = first.events.find(e => e.id === t.event);
      expect(event).toBeDefined();
      expect(t.day*1440+t.minute).toBeGreaterThan((event?.day ?? 0)*1440+(event?.minute ?? 0));
    }
    for (const p of first.final.patients) {
      const beds = first.final.beds.filter(b => b.occupant === p.id);
      expect(beds).toHaveLength(p.bed === null ? 0 : 1);
      if (p.bed !== null) expect(beds[0]?.id).toBe(p.bed);
    }
    const normal = await simulateAdt(world,native.apply);
    expect(await simulateAdt(world,native.apply)).toEqual(normal);
    expect(normal.events.length).toBeGreaterThan(0);
  } finally { native.close(); }
}, 120000);

it('waits for native turnover before reusing dirty capacity and still refuses a full board', async () => {
  const base = run(1), profile = base.pop.all[0], inpatient = base.initial.inpatients[0], first = base.days[0];
  if (!profile || !inpatient || !first) throw new Error('Missing synthetic ward inputs');
  const patients = Array.from({length:13}, (_, i) => ({...profile, id:`turnover-${i}`}));
  const world = {...base, pop:{...base.pop, all:patients},
    initial:{...base.initial, inpatients:patients.slice(0,12).map(p =>
      ({...inpatient, patientId:p.id, service:'medicine' as const}))},
    days:[{...first, state:{...first.state, day:1,
      admissions:[{id:'replacement', patientId:'turnover-12', day:1, clock:610, service:'medicine' as const,
        source:'ed' as const, diagnosis:'synthetic turnover', fromTaskId:null, caseId:null}],
      discharges:[{id:'departing', patientId:'turnover-0', day:1, clock:600, kind:'inpatient' as const,
        service:'medicine' as const, admissionId:null, caseId:null, followUps:[], pendingLabs:[], dischargeTaskId:null}],
    }}]};
  const original = structuredClone(world);
  const native = nativeAdt(process.env.EHR_BIN ?? resolve(__dirname, '../../lean/.lake/build/bin/ehr'));
  const rates = {transferPerPatientDay:0, swapPerBoardDay:0, erroneousAdmission:0,
    erroneousTransfer:0, erroneousDischargePerPatientDay:0};
  try {
    const result = await simulateAdt(world,native.apply,rates);
    expect(result.events.map(e => Object.keys(e.command))).toEqual([['discharge'],['clean'],['ready'],['admit']]);
    const clean = result.events.find(e => e.command.clean), ready = result.events.find(e => e.command.ready);
    if (!clean || !ready) throw new Error('Missing native turnover events');
    expect(ready.day*1440+ready.minute-(clean.day*1440+clean.minute)).toBeGreaterThanOrEqual(30);
    expect(result.final.patients.find(p => p.id === 'turnover-12')?.bed).toBe(401);
    expect(result.final.patients.find(p => p.id === 'turnover-0')?.admitted).toBe(false);
    expect(result.final.beds.filter(b => b.unit === 'medicine' && b.phase === 'occupied')).toHaveLength(12);
    expect(world).toEqual(original);
    const full = {...world, days:world.days.map(d => ({...d,state:{...d.state,discharges:[]}}))};
    await expect(simulateAdt(full,native.apply,rates)).rejects.toThrow('simulated ADT capacity exhausted');
  } finally { native.close(); }
});
