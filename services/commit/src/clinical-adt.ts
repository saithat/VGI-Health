import { digest, maybeObj, obj, objs, required, type Config, type Obj } from './types.ts';
/** Clinical disposition and administrative placement share the same locked board. */

export function boardKeys(config: Config) {
  if (!config.adt) return [];
  return [...config.adt.patients.map(p => `patient:${p}`), ...config.adt.beds.map(b => `bed:${b.id}`)].sort();
}
export function boardFrom(config: Config, streams: Map<string, Obj>) {
  const keys = boardKeys(config);
  return { state: {
    patients: keys.filter(k => k.startsWith('patient:')).map(k => obj(required(streams.get(k)).snapshot).adt),
    beds: keys.filter(k => k.startsWith('bed:')).map(k => required(streams.get(k)).snapshot),
  }, versions: keys.map(key => ({ key, version: required(streams.get(key)).version })) };
}
export function clinicalAction(commit: string, state: Obj) {
  const choice = maybeObj(maybeObj(objs(state.captured).find((c: Obj) => c.element === 'dispositionChoice' && c.confirmed)?.value)?.code)?.c;
  if (commit === 'recordAdmission' || commit === 'disposition' && choice === 'admit') return 'admit';
  if (commit === 'discharge' || commit === 'disposition' && choice === 'discharge') return 'discharge';
}
/** Materialize administrative state in the chart without inventing clinical
 * notes, orders, or signed decisions. Bed status itself lives on bed streams. */
export function projectAdt(snapshot: Obj, after: Obj, config: Config, transactionId: string, now: string) {
  if (digest(snapshot.adt ?? null) === digest(after)) return snapshot.bundle;
  const bed = config.adt?.beds.find(b => b.id === after.bed);
  let found = false;
  const entry = objs(obj(snapshot.bundle).entry).map((e: Obj) => {
    const r = e.resource;
    if (obj(r).resourceType !== 'Encounter' || maybeObj(obj(r).class)?.code !== 'IMP' || obj(r).status !== 'in-progress' || maybeObj(obj(r).subject)?.reference !== `Patient/${after.id}`) return e;
    found = true;
    const resource = { ...obj(r), meta: { ...obj(obj(r).meta ?? {}), versionId: String(Number(maybeObj(obj(r).meta)?.versionId ?? 0) + 1) },
      status: after.admitted ? 'in-progress' : 'finished',
      period: { ...obj(obj(r).period ?? {}), ...(!after.admitted ? { end: now } : {}) },
      location: bed?.resource ? [{ location: { reference: `Location/${bed.resource}` }, status: 'active', period: { start: now } }] :
        objs((obj(r).location ?? [])).map((l: Obj) => ({ ...l, status: 'completed', period: { ...obj(l.period ?? {}), end: now } })) };
    return { ...e, resource };
  });
  if (!found && after.admitted) entry.push({ resource: { resourceType: 'Encounter', id: transactionId,
    meta: { versionId: '1' }, status: 'in-progress', class: { code: 'IMP' }, subject: { reference: `Patient/${after.id}` },
    period: { start: now }, ...(bed?.resource ? { location: [{ location: { reference: `Location/${bed.resource}` }, status: 'active' }] } : {}) } });
  return { ...obj(snapshot.bundle), entry };
}
