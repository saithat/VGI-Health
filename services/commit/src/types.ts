import { createHash } from 'node:crypto';
import { z } from 'zod';

/** Opaque JSON stays unknown until a consumer checks its shape. */
export type Obj = Record<string, unknown>;
export function obj(value: unknown): Obj {
  if (!isObj(value)) throw new TypeError('Expected JSON object');
  return value;
}
export function isObj(value: unknown): value is Obj {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export const maybeObj = (value: unknown) => value == null ? undefined : obj(value);
export const maybeObjs = (value: unknown) => value == null ? undefined : objs(value);
export const maybeStr = (value: unknown) => value == null ? undefined : str(value);
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError('Expected array');
  return value;
}
function isObjs(value: unknown): value is Obj[] {
  return Array.isArray(value) && value.every(isObj);
}
export function objs(value: unknown): Obj[] {
  if (!isObjs(value)) throw new TypeError('Expected JSON object array');
  return value;
}
export function str(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected string');
  return value;
}
export function num(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Expected finite number');
  return value;
}
export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new TypeError('Missing required value');
  return value;
}
export const adtRole = z.enum(['chargeNurse', 'bedManager', 'admittingClerk']);
const id = z.string().regex(/^[A-Za-z0-9.-]{1,64}$/);
export const version = z.number().int().min(0).max(2147483646);
const nat = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const shared = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('dose'), order: nat, occurrence: nat }).strict(),
  z.object({ kind: z.literal('assignBed'), bed: nat }).strict(),
  z.object({ kind: z.literal('releaseBed'), bed: nat }).strict(),
]);
export const configSchema = z.object({
  tenant: id,
  oidc: z.object({ issuer: z.url(), audience: z.string().min(1), clientId: z.string().min(1), jwksUrl: z.url().optional() }).strict().optional(),
  units: z.record(id, z.object({ name: z.string().min(1), marOnService: z.boolean() }).strict()).optional(),
  adt: z.object({ patients: z.array(id).min(1).max(64), beds: z.array(z.object({ id: nat, unit: id, active: z.boolean().default(true), resource: id.optional() }).strict()).min(1).max(64) }).strict().optional(),
  actors: z.array(z.object({
    token: z.string().min(24).optional(), subject: id.optional(), persona: id.optional(), name: z.string().optional(), user: z.object({ id, role: z.enum(['rn', 'physician', 'np', 'surgeon', 'chargeNurse', 'bedManager', 'admittingClerk']) }).strict(),
    modelId: nat, patients: z.array(id), units: z.array(id).optional(), adtRoles: z.array(adtRole).optional(),
  }).strict()).min(1),
  releases: z.record(id, z.object({
    spec: z.record(z.string(), z.unknown()), program: z.record(z.string(), z.unknown()),
    workflows: z.record(id, z.object({ commit: id, commits: z.array(id).optional(), project: z.boolean().optional(), shared: shared.optional(),
      mar: z.object({ unit: id.optional(), patient: id, medicationRequest: id, encounter: id, scheduledTime: z.iso.datetime({ offset: true }) }).strict().optional(),
    }).strict()),
  }).strict()),
}).strict().superRefine((c, ctx) => {
  for (const key of ['token', 'modelId'] as const) {
    if (new Set(c.actors.map(a => a[key]).filter(v => v !== undefined)).size !== c.actors.filter(a => a[key] !== undefined).length)
      ctx.addIssue({ code: 'custom', message: `duplicate actor ${key}` });
  }
  if (c.oidc && c.actors.some(a => !a.subject || a.token))
    ctx.addIssue({ code: 'custom', message: 'OIDC actors require subjects and forbid static tokens' });
  if (!c.oidc && c.actors.some(a => !a.token))
    ctx.addIssue({ code: 'custom', message: 'prototype actors require static tokens' });
  if (new Set(c.actors.map(a => a.subject).filter(Boolean)).size !== c.actors.filter(a => a.subject).length)
    ctx.addIssue({ code: 'custom', message: 'duplicate OIDC subject' });
  if (c.adt) {
    if (new Set(c.adt.patients).size !== c.adt.patients.length || new Set(c.adt.beds.map(b => b.id)).size !== c.adt.beds.length)
      ctx.addIssue({ code: 'custom', message: 'duplicate ADT identifiers' });
    if (c.adt.beds.some(b => !c.units?.[b.unit])) ctx.addIssue({ code: 'custom', message: 'unknown ADT unit' });
    for (const r of Object.values(c.releases)) for (const w of Object.values(r.workflows))
      if (w.shared && w.shared.kind !== 'dose') ctx.addIssue({ code: 'custom', message: 'ADT forbids legacy bed writers' });
  }
  const doses = new Map<string, string>();
  const occurrences = new Map<string, string>();
  for (const r of Object.values(c.releases)) for (const w of Object.values(r.workflows)) {
    if (c.units && w.mar && !w.mar.unit) ctx.addIssue({ code: 'custom', message: 'unit-configured deployments require explicit MAR units' });
    if (w.mar?.unit && !c.units?.[w.mar.unit]) ctx.addIssue({ code: 'custom', message: 'unknown MAR unit' });
    if (w.mar && (!c.oidc || w.commit !== 'administerMed' || w.shared?.kind !== 'dose'))
      ctx.addIssue({ code: 'custom', message: 'MAR requires OIDC and a scheduled dose workflow' });
    if (w.mar && w.shared?.kind === 'dose') {
      const dose = `${w.mar.patient}/${w.shared.order}/${w.shared.occurrence}`;
      const occurrence = `${w.mar.patient}/${w.mar.medicationRequest}/${w.mar.scheduledTime}`;
      if ((doses.has(dose) && doses.get(dose) !== occurrence) ||
          (occurrences.has(occurrence) && occurrences.get(occurrence) !== dose))
        ctx.addIssue({ code: 'custom', message: 'MAR dose keys and scheduled occurrences must be one-to-one' });
      doses.set(dose, occurrence); occurrences.set(occurrence, dose);
    }
  }
  if (new Set(c.actors.map(a => a.user.id)).size !== c.actors.length)
    ctx.addIssue({ code: 'custom', message: 'duplicate user id' });
});
export type Config = z.infer<typeof configSchema>;
export type Actor = Config['actors'][number];
/** RN2 is an independent authenticated nurse using the P3 clinical layout. */
export const clinicalPersona = (actor: Actor) => actor.persona === 'RN2' ? 'P3' : actor.persona ?? actor.user.id;
export type Release = Config['releases'][string];
export type Workflow = Release['workflows'][string];
export const sessionInput = z.object({ patient: id, release: id, workflow: id, expectedVersion: version.optional(), encounter: id.optional(), task: id.optional(), bed: id.optional() }).strict();
export const cosignInput = sessionInput.extend({ expectedVersion: version }).strict();
export const eventInput = z.object({ revision: version, event: z.record(z.string(), z.unknown()) }).strict();
export const commandInput = z.object({
  requestId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/), sessionId: z.uuid(),
  revision: version, expectedVersion: version, expectedSharedVersion: version.optional(), commit: id.optional(), bed: id.optional(), expectedBoard: z.array(z.object({ key: z.string(), version }).strict()).max(128).optional(),
  event: z.record(z.string(), z.unknown()),
  // Optional in the codec so absence receives the same retry-safe refusal as a
  // mismatch, rather than a generic malformed-command response.
  screens: z.object({ requestId: z.string(), frames: z.array(z.object({
    step: version, phase: z.enum(['ready', 'loading']), hash: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict()).max(1024) }).strict().optional(),
}).strict();
export type Command = z.infer<typeof commandInput>;
export const importSchema = z.object({
  patient: id, modelId: nat, bundle: z.record(z.string(), z.unknown()),
  context: z.record(z.string(), z.unknown()),
}).strict();
export type Patient = z.infer<typeof importSchema>;
export const emptyShared = () => ({ administrations: [], placements: [] });

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(obj(value)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
export function sharedKey(patient: string, w: Workflow): string | undefined {
  if (!w.shared) return;
  return w.shared.kind === 'dose'
    ? `dose:${patient}:${w.shared.order}:${w.shared.occurrence}` : `bed:${w.shared.bed}`;
}
export function sharedAction(actor: Actor, patient: { modelId: number }, w: Workflow): Obj {
  const s = required(w.shared);
  return s.kind === 'dose'
    ? { administer: { actor: actor.modelId, dose: { patient: patient.modelId, order: s.order, occurrence: s.occurrence } } }
    : { [s.kind]: { actor: actor.modelId, patient: patient.modelId, bed: s.bed } };
}
export class Fault extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message = code) { super(message); this.status = status; this.code = code; }
}

export const adtCommandInput = z.object({
  requestId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
  // A complete board read vector prevents stale UI intent from silently rebasing.
  expected: z.array(z.object({ key: z.string().min(1).max(100), version }).strict()).min(1).max(128),
  action: z.enum(['admit', 'assign', 'transfer', 'swap', 'cancelAdmit', 'cancelTransfer', 'cancelDischarge', 'release', 'discharge', 'clean', 'ready']),
  patient: id, bed: nat.optional(), source: nat.optional(), other: id.optional(), event: nat.optional(),
}).strict().superRefine((c, ctx) => {
  const needsBed = !['discharge', 'cancelAdmit', 'cancelTransfer'].includes(c.action);
  const needsSource = ['transfer', 'swap'].includes(c.action);
  const cancellation = ['cancelAdmit', 'cancelTransfer', 'cancelDischarge'].includes(c.action);
  if (needsBed !== (c.bed !== undefined) || needsSource !== (c.source !== undefined) ||
      (c.action === 'swap') !== (c.other !== undefined) || cancellation !== (c.event !== undefined) ||
      (cancellation && c.event === 0))
    ctx.addIssue({ code: 'custom', message: 'incorrect ADT operands' });
});
export type AdtCommand = z.infer<typeof adtCommandInput>;

export const encounterInput = z.object({ patient: id, expectedVersion: version, requestId: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/) }).strict();
