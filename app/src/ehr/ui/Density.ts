import { createContext, useContext } from "react";

/** IDs are scoped by the screen/patient provider; group markers cascade in CSS. */
export const CompactContext = createContext<readonly string[]>([]);
export function useDensity(id: string) {
  return useContext(CompactContext).includes(id) ? "compact" : undefined;
}
