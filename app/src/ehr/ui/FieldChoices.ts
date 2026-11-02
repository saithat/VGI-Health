import { createContext } from "react";
import type { UiCodeChoices } from "../../../../lean/generated/ehr-types";

/** Department quick picks are supplied by Lean; the painter never selects one. */
export const FieldChoicesContext = createContext<[string, UiCodeChoices][]>([]);
