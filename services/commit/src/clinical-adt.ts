import { digest, Fault, maybeObj, obj, objs, required, type Config, type Obj } from './types.ts';
import { adtBedSchema, adtPatientSchema } from './projection-codecs.ts';
/** Clinical disposition and administrative placement share the same locked board. */

export function boardKeys(config: Config) {
  if (!config.adt) return [];
  return [...config.adt.patients.map(p => `patient:${p}`), ...config.adt.beds.map(b => `bed:${b.id}`)].sort();
}
/** Read old imported boards with explicit defaults without publishing default-
 * only events or resetting their stream versions. Ordinal zero is not cancellable. */
export function normalizeAdtStream<T extends Obj>(row: T) {
  const current = obj(row.snapshot);
  const snapshot = row.kind === 'bed' ? adtBedSchema.parse(current) :
    row.kind === 'patient' && current.adt ? { ...current, adt: adtPatientSchema.parse(current.adt) } : current;
  return { ...row, snapshot };
}
export function boardFrom(config: Config, streams: Map<string, Obj>) {
  const keys = boardKeys(config);
  return { state: {
    patients: keys.filter(k => k.startsWith('patient:')).map(k => adtPatientSchema.parse(obj(required(streams.get(k)).snapshot).adt)),
    beds: keys.filter(k => k.startsWith('bed:')).map(k => adtBedSchema.parse(required(streams.get(k)).snapshot)),
  }, versions: keys.map(key => ({ key, version: required(streams.get(key)).version })) };
}
export function clinicalAction(commit: string, state: Obj) {
  const choice = maybeObj(maybeObj(objs(state.captured).find((c: Obj) => c.element === 'dispositionChoice' && c.confirmed)?.value)?.code)?.c;
  if (commit === 'recordAdmission' || commit === 'disposition' && choice === 'admit') return 'admit';
  if (commit === 'discharge' || commit === 'disposition' && choice === 'discharge') return 'discharge';
}
const sequenceUrl = 'https://vgi-health.example/fhir/StructureDefinition/adt-encounter-sequence';
interface ProjectionContext { action?: string; event?: number; actor?: string; encounterId?: string }
/** Compensate the current encounter in place. Documentation and its encounter
 * references survive; cancellation adds provenance instead of restoring a bundle.
 * The ordinal is patient-scoped and resolves against the immutable ADT event log. */
export function projectAdt(snapshot: Obj, afterValue: Obj, config: Config, transactionId: string, now: string, context: ProjectionContext = {}) {
  const before = adtPatientSchema.parse(snapshot.adt), after = adtPatientSchema.parse(afterValue);
  if (digest(before) === digest(after)) return snapshot.bundle;
  const bed = config.adt?.beds.find(b => b.id === after.bed);
  const entries = objs(obj(snapshot.bundle).entry);
  const inpatient = entries.map(e => obj(e.resource)).filter(r => r.resourceType === 'Encounter' &&
    maybeObj(r.class)?.code === 'IMP' && maybeObj(r.subject)?.reference === `Patient/${after.id}`);
  const newAdmission = after.last?.kind === 'admit' && !before.admitted;
  let candidates = context.encounterId ? inpatient.filter(r => r.id === context.encounterId) : [];
  // ED disposition creates a child inpatient encounter; the source session still
  // names the finished ED episode. Select that newly projected inpatient child.
  if (!candidates.length) candidates = newAdmission ? inpatient.filter(r => r.status === 'in-progress') : inpatient.filter(r =>
    objs(r.extension ?? []).some(e => e.url === sequenceUrl && e.valueInteger === after.encounter));
  if (!candidates.length && before.admitted) candidates = inpatient.filter(r => r.status === 'in-progress');
  if (candidates.length > 1) throw new Fault(422, 'adt_ambiguous_encounter');
  const original = candidates[0];
  if (!original && !newAdmission) throw new Fault(422, 'adt_encounter_missing');
  const r = original ?? { resourceType: 'Encounter', id: transactionId, class: { code: 'IMP' },
    subject: { reference: `Patient/${after.id}` }, period: { start: now } };
  const status = context.action === 'cancelAdmit' ? 'entered-in-error' : after.admitted ? 'in-progress' : 'finished';
  const period = { ...obj(r.period ?? {}) };
  if (after.admitted) delete period.end; else period.end = now;
  const reference = bed?.resource ? `Location/${bed.resource}` : undefined;
  let location = objs(r.location ?? []);
  if (before.bed !== after.bed || before.admitted !== after.admitted || !original) {
    location = location.map(l => l.status === 'active' ? { ...l, status: 'completed', period: { ...obj(l.period ?? {}), end: now } } : l);
    if (after.admitted && reference) location.push({ location: { reference }, status: 'active', period: { start: now } });
  }
  const resource = { ...r, meta: { ...obj(r.meta ?? {}), versionId: String(Number(maybeObj(r.meta)?.versionId ?? 0) + 1) },
    status, period, location,
    extension: [...objs(r.extension ?? []).filter(e => e.url !== sequenceUrl), { url: sequenceUrl, valueInteger: after.encounter }],
    ...(original && original.status !== status ? { statusHistory: [...objs(r.statusHistory ?? []),
      { status: r.status, period: { start: obj(r.period ?? {}).start ?? now, end: now } }] } : {}) };
  const entry = entries.map(e => e.resource === original ? { ...e, resource } : e);
  if (!original) entry.push({ resource });
  if (context.event !== undefined) entry.push({ resource: {
    resourceType: 'Provenance', id: `${transactionId}-cancel`, meta: { versionId: '1' }, recorded: now,
    target: [{ reference: `Encounter/${r.id}` }], activity: { text: context.action },
    agent: [{ who: { reference: `Practitioner/${context.actor}` } }],
    entity: [{ role: 'revision', what: { identifier: { system: 'urn:vgi:adt-event', value: `${after.id}:${context.event}` } } }],
    extension: [{ url: 'https://vgi-health.example/fhir/StructureDefinition/adt-documentation-policy',
      valueString: 'Retained with original encounter links; cancellation does not retract clinical documentation.' }],
  } });
  return { ...obj(snapshot.bundle), entry };
}
