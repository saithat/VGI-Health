import { Fault, maybeObj, maybeObjs, maybeStr, obj, objs, required, str, type Actor, type Config, type Obj } from './types.ts';
import { reviewedSchema, capturedSchema, elementsSchema, patientSchema, encounterSchema, practitionerSchema, receiptSchema, taskSchema, medicationSchema, locationSchema } from './projection-codecs.ts';

/** Storage projection of native-authorized actions. No browser supplies effects. */
import { mapCommit } from '../../../app/src/data/commitMapper.ts';

/** Reopen only this actor's current-day reviews of unchanged resource versions. */
export function storedReviewReceipts(bundle: Obj, actor: Actor, now: string) {
  const resources = objs(bundle.entry).map((e: Obj) => obj(e.resource));
  const targets = new Set(resources.filter((r: Obj) => maybeObj(r.meta)?.versionId)
    .map((r: Obj) => `${r.resourceType}/${r.id}/_history/${obj(r.meta).versionId}`));
  return resources.flatMap((r: Obj) => {
    if (r.resourceType !== 'Provenance' || maybeStr(r.recorded)?.slice(0, 10) !== now.slice(0, 10) ||
        !maybeObjs(r.agent)?.some((a: Obj) => maybeObj(a.who)?.reference === `Practitioner/${actor.user.id}`) ||
        !maybeObjs(r.target)?.length || !objs(r.target).every((t: Obj) => targets.has(str(t.reference)))) return [];
    try {
      const receipt = JSON.parse(str(maybeObjs(r.extension)?.find((e: Obj) => str(e.url).endsWith('/review-receipt'))?.valueString));
      return typeof receipt.info === 'string' && Number.isSafeInteger(receipt.dataVersion) && receipt.dataVersion >= 0 &&
        Number.isSafeInteger(receipt.time) && receipt.time >= 0 && receipt.user === actor.user.id && receipt.role === actor.user.role
        ? [receipt] : [];
    } catch { return []; }
  });
}

export function projectCommand(snapshot: Obj, release: Obj, context: Obj, actor: Actor, commit: string, state: Obj, transactionId: string, adt?: { state: Obj; config: Config; bed?: number }) {
  const resources = objs(obj(snapshot.bundle).entry).map((e: Obj) => obj(e.resource));
  const profile = resources.find((r: Obj) => r.resourceType === 'Practitioner' && r.id === actor.user.id) ?? {
    resourceType: 'Practitioner', id: actor.user.id, meta: { versionId: '1' }, name: [{ text: actor.name ?? actor.persona ?? actor.user.id }],
    ...(actor.persona ? { identifier: [{ system: 'https://vgi-health.example/fhir/sid/persona', value: actor.persona }] } : {}) };
  if (!resources.includes(profile)) resources.push(profile);
  const patient = resources.find((r: Obj) => r.resourceType === 'Patient' && r.id === snapshot.patient);
  const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === context.encounterId);
  const task = resources.find((r: Obj) => r.resourceType === 'Task' && r.id === context.taskId);
  const focus = maybeObj(maybeObj(task)?.focus)?.reference;
  const renewal = maybeStr(focus)?.startsWith('#') ? maybeObjs(obj(task).contained)?.find((r: Obj) => `#${r.id}` === focus) :
    resources.find((r: Obj) => `MedicationRequest/${r.id}` === focus);
  if (!patient || !encounter || maybeObj(obj(encounter).subject)?.reference !== `Patient/${obj(patient).id}`) throw new Fault(422, 'encounter_required');
  // Legacy clinical writers cannot assign/release shared beds. ADT is the sole
  // bed authority; admission/discharge notes may update only their episode.
  const bedId = adt?.config.adt?.beds.find(b => b.id === adt.bed)?.resource;
  const bed = bedId ? resources.find((r: Obj) => r.resourceType === 'Location' && r.id === bedId) : undefined;
  const receipt = commit === 'markReviewed' ? objs(state.receipts).at(-1) : undefined;
  const reviewed = receipt ? resources.filter((r: Obj) => r.resourceType === 'Patient' ||
    (receipt.info === 'allergyList' && r.resourceType === 'AllergyIntolerance') ||
    (['currentMeds', 'anticoagulantList'].includes(str(receipt.info)) && r.resourceType === 'MedicationRequest') ||
    (['vitals', 'relevantLabs', 'resultDetail', 'resultTrend', 'coagLabs', 'glucoseTrend'].includes(str(receipt.info)) && r.resourceType === 'Observation')) : [];
  let effects;
  try {
    effects = mapCommit({ commitId: commit, captured: capturedSchema.parse(state.captured), elements: elementsSchema.parse(obj(release.spec).elements),
      patient: patientSchema.parse(patient), encounter: encounterSchema.parse(encounter), user: practitionerSchema.parse(profile),
      now: new Date().toISOString(), transactionId, ...(bed ? { bed: { ...locationSchema.parse(bed), operationalStatus: { code: 'U' } } } : {}), ...(task ? { task: taskSchema.parse(task) } : {}), ...(renewal ? { renewal: medicationSchema.parse(renewal) } : {}),
      ...(receipt ? { receipt: receiptSchema.parse(receipt), reviewed: reviewedSchema.parse(reviewed.length ? reviewed : [patient]) } : {}) });
  } catch (error) { throw new Fault(422, 'projection_refused', String(error)); }
  const replacements = new Map(effects.entry?.filter(e => e.fullUrl).map(e => [required(e.fullUrl), `${required(e.resource).resourceType}/${required(e.fullUrl).slice(9)}`]));
  function rewrite(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(rewrite);
    if (!v || typeof v !== 'object') return v;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'reference' ? (typeof x === 'string' ? replacements.get(x) ?? x : x) : rewrite(x)]));
  }
  const byId = new Map<string, Obj>(resources.map((r: Obj) => [`${r.resourceType}/${r.id}`, r]));
  const changed: Obj[] = [];
  for (const entry of effects.entry ?? []) {
    const r = obj(rewrite(required(entry.resource)));
    const key = required(entry.request).method === 'POST' ? required(replacements.get(required(entry.fullUrl))) : required(entry.request).url;
    const old = byId.get(key);
    if (required(entry.request).method === 'PUT' && (!old || required(entry.request).ifMatch !== `W/"${obj(old.meta).versionId}"`)) throw new Fault(409, 'resource_version_conflict');
    if (r.resourceType === 'Location') { if (!adt) throw new Fault(422, 'use_adt_authority'); continue; }
    r.id = key.split('/')[1];
    r.meta = { ...obj(r.meta ?? {}), versionId: String(Number(maybeObj(old?.meta)?.versionId ?? 0) + 1) };
    byId.set(key, r); changed.push(r);
  }
  return { bundle: { ...obj(snapshot.bundle), entry: [...byId.values()].map(resource => ({ resource })) }, changed };
}
