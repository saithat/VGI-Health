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
