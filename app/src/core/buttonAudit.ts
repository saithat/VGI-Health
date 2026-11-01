import type { State } from "../../../lean/generated/ehr-types";
import type { UiScreen } from "../ehr/ui/types";

/** Opt-in inspection seam for the browser audit. Checkpoints are opaque: tests
 * can restore an observed episode, but cannot manufacture clinical state. */
export interface ButtonAuditSession {
  program: unknown;
  snapshot: () => { state: State; result: unknown; ui: UiScreen | undefined };
  checkpoint: () => number;
  restore: (id: number) => void;
}
declare global {
  interface Window {
    __buttonAuditObservation?: { at: number | null; disconnect: () => void };
    __buttonAuditSession?: ButtonAuditSession;
  }
}
export function installButtonAudit(session: ButtonAuditSession) {
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("audit") === "buttons"
  )
    window.__buttonAuditSession = session;
}
