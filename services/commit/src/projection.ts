/** Storage projection of native-authorized actions. No browser supplies effects. */
import { mapCommit } from '../../../app/src/data/commitMapper.ts';
import type { Obj, Actor, Config } from './types.ts';
import { Fault } from './types.ts';

/** Reopen only this actor's current-day reviews of unchanged resource versions. */
export function storedReviewReceipts(bundle: Obj, actor: Actor, now: string) {
  const resources = bundle.entry.map((e: Obj) => e.resource);
  const targets = new Set(resources.filter((r: Obj) => r.meta?.versionId)
    .map((r: Obj) => `${r.resourceType}/${r.id}/_history/${r.meta.versionId}`));
  return resources.flatMap((r: Obj) => {
    if (r.resourceType !== 'Provenance' || r.recorded?.slice(0, 10) !== now.slice(0, 10) ||
        !r.agent?.some((a: Obj) => a.who?.reference === `Practitioner/${actor.user.id}`) ||
        !r.target?.length || !r.target.every((t: Obj) => targets.has(t.reference))) return [];
    try {
      const receipt = JSON.parse(r.extension?.find((e: Obj) => e.url.endsWith('/review-receipt'))?.valueString);
      return typeof receipt.info === 'string' && Number.isSafeInteger(receipt.dataVersion) && receipt.dataVersion >= 0 &&
        Number.isSafeInteger(receipt.time) && receipt.time >= 0 && receipt.user === actor.user.id && receipt.role === actor.user.role
        ? [receipt] : [];
    } catch { return []; }
  });
}

export function projectCommand(snapshot: Obj, release: Obj, context: Obj, actor: Actor, commit: string, state: Obj, transactionId: string, adt?: { state: Obj; config: Config; bed?: number }) {
  const resources = snapshot.bundle.entry.map((e: Obj) => e.resource);
  const profile = resources.find((r: Obj) => r.resourceType === 'Practitioner' && r.id === actor.user.id) ?? {
    resourceType: 'Practitioner', id: actor.user.id, meta: { versionId: '1' }, name: [{ text: actor.name ?? actor.persona ?? actor.user.id }],
    ...(actor.persona ? { identifier: [{ system: 'https://vgi-health.example/fhir/sid/persona', value: actor.persona }] } : {}) };
  if (!resources.includes(profile)) resources.push(profile);
  const patient = resources.find((r: Obj) => r.resourceType === 'Patient' && r.id === snapshot.patient);
  const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === context.encounterId);
  const task = resources.find((r: Obj) => r.resourceType === 'Task' && r.id === context.taskId);
  const focus = task?.focus?.reference;
  const renewal = focus?.startsWith('#') ? task.contained?.find((r: Obj) => `#${r.id}` === focus) :
    resources.find((r: Obj) => `MedicationRequest/${r.id}` === focus);
  if (!patient || !encounter || encounter.subject?.reference !== `Patient/${patient.id}`) throw new Fault(422, 'encounter_required');
  // Legacy clinical writers cannot assign/release shared beds. ADT is the sole
  // bed authority; admission/discharge notes may update only their episode.
  const bedId = adt?.config.adt?.beds.find(b => b.id === adt.bed)?.resource;
  const bed = bedId ? resources.find((r: Obj) => r.resourceType === 'Location' && r.id === bedId) : undefined;
  const receipt = commit === 'markReviewed' ? state.receipts.at(-1) : undefined;
  const reviewed = receipt ? resources.filter((r: Obj) => r.resourceType === 'Patient' ||
    (receipt.info === 'allergyList' && r.resourceType === 'AllergyIntolerance') ||
    (['currentMeds', 'anticoagulantList'].includes(receipt.info) && r.resourceType === 'MedicationRequest') ||
    (['vitals', 'relevantLabs', 'resultDetail', 'resultTrend', 'coagLabs', 'glucoseTrend'].includes(receipt.info) && r.resourceType === 'Observation')) : [];
  let effects;
  try {
    effects = mapCommit({ commitId: commit, captured: state.captured, elements: release.spec.elements,
      patient, encounter, user: profile,
      now: new Date().toISOString(), transactionId, ...(bed ? { bed: { ...bed, operationalStatus: { code: 'U' } } } : {}), ...(task ? { task } : {}), ...(renewal ? { renewal } : {}),
      ...(receipt ? { receipt, reviewed: reviewed.length ? reviewed : [patient] } : {}) });
  } catch (error) { throw new Fault(422, 'projection_refused', String(error)); }
  const replacements = new Map(effects.entry?.filter(e => e.fullUrl).map(e => [e.fullUrl!, `${e.resource!.resourceType}/${e.fullUrl!.slice(9)}`]));
  function rewrite(v: Obj): Obj {
    if (Array.isArray(v)) return v.map(rewrite);
    if (!v || typeof v !== 'object') return v;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'reference' ? replacements.get(x as string) ?? x : rewrite(x as Obj)]));
  }
  const byId = new Map<string, Obj>(resources.map((r: Obj) => [`${r.resourceType}/${r.id}`, r]));
  const changed: Obj[] = [];
  for (const entry of effects.entry ?? []) {
    const r: Obj = rewrite(entry.resource!);
    const key = entry.request!.method === 'POST' ? replacements.get(entry.fullUrl!)! : entry.request!.url;
    const old = byId.get(key);
    if (entry.request!.method === 'PUT' && (!old || entry.request!.ifMatch !== `W/"${old.meta.versionId}"`)) throw new Fault(409, 'resource_version_conflict');
    if (r.resourceType === 'Location') { if (!adt) throw new Fault(422, 'use_adt_authority'); continue; }
    r.id = key.split('/')[1];
    r.meta = { ...r.meta, versionId: String(Number(old?.meta?.versionId ?? 0) + 1) };
    byId.set(key, r); changed.push(r);
  }
  return { bundle: { ...snapshot.bundle, entry: [...byId.values()].map(resource => ({ resource })) }, changed };
}
