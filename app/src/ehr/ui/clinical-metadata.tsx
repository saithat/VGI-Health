import { createContext } from "react";
import type {
  UiChartReference,
  UiCodeChoice,
} from "../../../../lean/generated/ehr-types";

/** Read-only source metadata around the original semantic field/info child. */
export const ValueSetContext = createContext<
  { options: UiCodeChoice[]; allowCustom: boolean } | undefined
>(undefined);
export const ChartReferenceContext = createContext<UiChartReference[]>([]);
export const ExplicitConfirmContext = createContext<ReadonlySet<string>>(
  new Set(),
);
/** Lean supplies the public caption; raw provenance remains on the field node. */
export const FieldSourceContext = createContext<ReadonlyMap<string, string>>(
  new Map(),
);
