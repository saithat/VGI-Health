/** Validate the mapper's required wire fields while retaining imported extensions.
 * Native Lean remains the authority for clinical facts and commit permission. */
import { z } from 'zod';
import { RoleValues, UnitKindValues } from '../../../lean/generated/ehr-types.ts';

export const capturedSchema = z.array(z.object({
  element: z.string(), slot: z.number(), byHuman: z.boolean(), confirmed: z.boolean(), provenance: z.string().optional(),
  value: z.union([
    z.object({ qty: z.object({ tenths: z.number(), unit: z.enum(UnitKindValues) }) }),
    z.object({ code: z.object({ c: z.string() }) }), z.object({ text: z.object({ s: z.string() }) }),
    z.object({ flag: z.object({ b: z.boolean() }) }), z.object({ user: z.object({ u: z.string() }) }),
  ]),
}));
export const elementsSchema = z.array(z.object({ id: z.string(), label: z.string(), fhirTarget: z.string() }));
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
