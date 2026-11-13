/** Validate the mapper's required wire fields while retaining imported extensions.
 * Native Lean remains the authority for clinical facts and commit permission. */
import { z } from 'zod';
import { RoleValues, UnitKindValues } from '../../../lean/generated/ehr-types.ts';

export const adtPatientSchema = z.object({
  id: z.string(), admitted: z.boolean(), bed: z.number().int().nonnegative().nullable(),
  revision: z.number().int().nonnegative().default(0), encounter: z.number().int().nonnegative().default(0),
  last: z.object({ kind: z.enum(['admit', 'transfer', 'discharge']),
    source: z.number().int().nonnegative().nullable(), target: z.number().int().nonnegative().nullable() }).nullable().default(null),
});
export const adtBedSchema = z.object({ id: z.number().int().nonnegative(), unit: z.string(),
  active: z.boolean().default(true), phase: z.enum(['ready', 'occupied', 'dirty', 'cleaning']), occupant: z.string().nullable() });

export const capturedSchema = z.array(z.object({
  element: z.string(), slot: z.number(), byHuman: z.boolean(), confirmed: z.boolean(), provenance: z.string().optional(), enteredAt: z.number().int().optional(),
  value: z.union([
    z.object({ qty: z.object({ tenths: z.number(), unit: z.enum(UnitKindValues) }) }),
    z.object({ code: z.object({ c: z.string() }) }), z.object({ text: z.object({ s: z.string() }) }),
    z.object({ flag: z.object({ b: z.boolean() }) }), z.object({ user: z.object({ u: z.string() }) }),
  ]),
}));
export const elementsSchema = z.array(z.object({ id: z.string(), label: z.string(), fhirTarget: z.string(), observationOf: z.string().optional() }));
export const entryTimesSchema = z.array(z.object({ element: z.string(), slot: z.number().int(), enteredAt: z.number().int(), observedAt: z.number().int(), signedAt: z.number().int(), lateEntry: z.boolean() }));
export const receiptSchema = z.object({ info: z.string(), dataVersion: z.number(), time: z.number(), role: z.enum(RoleValues), user: z.string() });
export const patientSchema = z.looseObject({ resourceType: z.literal('Patient') });
export const practitionerSchema = z.looseObject({ resourceType: z.literal('Practitioner') });
export const encounterSchema = z.looseObject({ resourceType: z.literal('Encounter'),
  status: z.enum(['planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'entered-in-error', 'unknown']),
  class: z.looseObject({}),
});
export const locationSchema = z.looseObject({ resourceType: z.literal('Location') });
const intent = z.enum(['unknown', 'proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option']);
export const taskSchema = z.looseObject({ resourceType: z.literal('Task'), intent,
  status: z.enum(['draft', 'requested', 'received', 'accepted', 'rejected', 'ready', 'cancelled', 'in-progress', 'on-hold', 'failed', 'completed', 'entered-in-error']),
});
export const medicationSchema = z.looseObject({ resourceType: z.literal('MedicationRequest'), subject: z.looseObject({}),
  intent: z.enum(['proposal', 'plan', 'order', 'original-order', 'reflex-order', 'filler-order', 'instance-order', 'option']),
  status: z.enum(['active', 'on-hold', 'cancelled', 'completed', 'entered-in-error', 'stopped', 'draft', 'unknown']),
});
export const reviewedSchema = z.array(z.union([
  patientSchema, medicationSchema,
  z.looseObject({ resourceType: z.literal('AllergyIntolerance'), patient: z.looseObject({}) }),
  z.looseObject({ resourceType: z.literal('Observation'), status: z.enum(['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown']), code: z.looseObject({}) }),
]));
