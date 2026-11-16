import type { Event } from "../../../lean/generated/ehr-types";
import type { UiScreen } from "../ehr/ui/types";
interface PatientSession {
  getSnapshot(): { ui?: UiScreen | undefined; result?: unknown };
  dispatch(event: Event): Promise<unknown>;
  onPaint(screen: UiScreen): void;
}
/** Each board route retains a separate existing live session and journal. */
export function createBoardTransport(
  sessions: ReadonlyMap<string, PatientSession>,
) {
  const panes = () =>
    [...sessions].map(([patient, session]) => {
      const screen = session.getSnapshot().ui;
      if (!screen) throw Error("Missing patient screen");
      return { patient, screen };
    });
  return {
    panes,
    async dispatch(patient: string, event: Event) {
      const session = sessions.get(patient);
      if (!session) throw Error("Unknown patient pane");
      const owner = panes().find((p) => p.screen.modal !== null)?.patient;
      if (owner && owner !== patient)
        throw Error("Another patient's alert owns interaction");
      if (
        "click" in event &&
        event.click.comp.startsWith("workspace.open|") &&
        !event.click.comp.startsWith(`workspace.open|${patient}|`)
      )
        throw Error("Choose this pane's patient");
      return session.dispatch(event);
    },
    onPaint() {
      for (const { patient, screen } of panes())
        sessions.get(patient)?.onPaint(screen);
    },
  };
}
