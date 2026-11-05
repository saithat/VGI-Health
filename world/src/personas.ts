/** Behavior defaults shared with the agent lane's fixture personas (BRIEF §6).
 * These affect simulator behavior, never the world's clinical choices. */
import { type Persona, type PersonaParams, PersonaParamsSchema } from "./schema";

export const PERSONA_PARAMS: Record<Persona, PersonaParams> = {
  P1: { id: "P1", role: "physician", keyboardShare: 80, reviewsAllergiesEarly: true, scansSidebar: true, backtrackRate: 60, searchWhenBuried: true, overrideRate: 700 },
  P2: { id: "P2", role: "physician", keyboardShare: 20, reviewsAllergiesEarly: false, scansSidebar: false, backtrackRate: 30, searchWhenBuried: false, overrideRate: 850 },
  P3: { id: "P3", role: "rn", keyboardShare: 10, reviewsAllergiesEarly: true, scansSidebar: true, backtrackRate: 90, searchWhenBuried: false, overrideRate: 400 },
  P4: { id: "P4", role: "np", keyboardShare: 50, reviewsAllergiesEarly: true, scansSidebar: false, backtrackRate: 40, searchWhenBuried: true, overrideRate: 500 },
  P5: { id: "P5", role: "surgeon", keyboardShare: 30, reviewsAllergiesEarly: false, scansSidebar: false, backtrackRate: 20, searchWhenBuried: false, overrideRate: 900 },
};

for (const params of Object.values(PERSONA_PARAMS)) PersonaParamsSchema.parse(params);

/** Simulation assumption: independently seeded hidden tastes. Default output
 * remains byte-compatible with historical persona parameters. Lean owns rating. */
export function personaParams(id: Persona, seed: number, policy: "expert" | "bounded" = "expert", hidden = false): PersonaParams {
  // Same FNV/taskSeed and SplitMix64 stream as Bounded.seededPreferences.
  const wrap = (n: bigint) => BigInt.asUintN(64, n);
  let stream = 14695981039346656037n ^ BigInt(seed);
  for (const byte of new TextEncoder().encode(id)) stream = wrap((stream ^ BigInt(byte)) * 1099511628211n);
  let n = wrap(stream + 0x9e3779b97f4a7c15n);
  n = wrap((n ^ (n >> 30n)) * 0xbf58476d1ce4e5b9n);
  n = wrap((n ^ (n >> 27n)) * 0x94d049bb133111ebn);
  n ^= n >> 31n;
  return PersonaParamsSchema.parse({...PERSONA_PARAMS[id],
    ...(policy === "bounded" ? {policy} : {}),
    ...(hidden ? {hiddenPreferences:{placements:[{tag:"w1Orders.patientSidebar.allergyList",nearTag:"w1Orders.dose",weight:1+Number(n%3n)}],changeSensitivity:100+Number(n%801n)}} : {}),
  });
}
