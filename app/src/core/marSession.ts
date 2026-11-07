import type { Event } from "../../../lean/generated/ehr-types";
import type { Interp } from "./interp";
import { createSession } from "./session";
import { screenJournal } from "../data/screenFingerprint";
import type { UiScreen } from "../ehr/ui/types";
import {
  MarConflict,
  MarRejected,
  marCommit,
  marEvent,
  openMar,
  subscribeMar,
  type MarOpened,
} from "../data/commitService";

export interface MarConnection {
  patient: string;
  release: string;
  workflow: string;
  onUpdate?(message: string): void;
}
/** W4 authority: the browser renders the server's pinned program/state. It
 * submits interactions and final intent, never a state/user/role/clinical effect. */
export async function createMarSession(
  interp: Interp,
  connection: MarConnection,
) {
  let current = await openMar(connection);
  const screens = screenJournal(interp.screenCanonical);
  const release = JSON.stringify([current.spec, current.program, current.user]);
  const session = createSession(
    interp,
    current.spec,
    current.program,
    current.projection,
    current.user,
  );
  session.accept({ state: current.state, result: "ok" }, current.projection);
  let pending = false;
  let disposed = false;
  let savedNeedsRefresh = false;
  let refreshVersion = current.version;
  let uncertain:
    | {
        event: Event;
        requestId: string;
        session: MarOpened;
        screens: Awaited<ReturnType<typeof screens.evidence>>;
      }
    | undefined;
  async function refresh(message: string) {
    const fresh = await openMar(connection);
    if (disposed) return;
    if (JSON.stringify([fresh.spec, fresh.program, fresh.user]) !== release)
      throw new Error(
        "The MAR release or identity changed. Reopen MAR before continuing.",
      );
    current = fresh;
    screens.clear();
    refreshVersion = current.version;
    session.accept({ state: current.state, result: "ok" }, current.projection);
    connection.onUpdate?.(message);
  }
  const stop = subscribeMar(
    connection.patient,
    current.version,
    (version) => {
      refreshVersion = Math.max(refreshVersion, version);
      if (!pending && !uncertain)
        void refresh(
          "MAR updated by another nurse. Review the current dose.",
        ).catch(
          connection.onUpdate
            ? (error) => connection.onUpdate?.(String(error))
            : () => {},
        );
    },
    (error) => connection.onUpdate?.(String(error)),
  );
  return {
    getSnapshot: session.getSnapshot,
    subscribe: session.subscribe,
    onPaint: (screen: UiScreen) => screens.observe(screen, current.revision),
    getContext: () => undefined,
    getGeneration: () => current.sessionId,
    close() {
      disposed = true;
      stop();
    },
    async dispatch(
      event: Event,
    ): Promise<
      { links: string[]; message: string; refreshRequired?: true } | undefined
    > {
      if (pending) throw new Error("An administration is already saving");
      if (savedNeedsRefresh)
        throw new Error(
          "Administration saved. Reopen MAR to refresh before continuing.",
        );
      pending = true;
      try {
        // Preview determines only which endpoint to use. The server reconstructs
        // and checks every event independently, under the current stream lock.
        const staged = session.preview(event);
        const commits =
          staged.state.commits.length >
          session.getSnapshot().state.commits.length;
        if (uncertain || commits) {
          if (
            uncertain &&
            JSON.stringify(uncertain.event) !== JSON.stringify(event)
          )
            throw new Error(
              "Reconcile the previous save before entering another action.",
            );
          const requestId = uncertain?.requestId ?? crypto.randomUUID();
          const intent = uncertain ?? {
            event,
            requestId,
            screens: await screens.evidence(requestId),
            session: current,
          };
          uncertain = intent;
          const result = await marCommit(
            intent.session,
            intent.event,
            intent.requestId,
            staged.state.commits.find(
              (id) => !session.getSnapshot().state.commits.includes(id),
            ),
            intent.screens,
          );
          uncertain = undefined;
          current.version = result.version;
          session.accept({ state: result.state, result: "ok" });
          try {
            await refresh("Administration saved. MAR refreshed.");
          } catch {
            savedNeedsRefresh = true;
            const message =
              "Administration saved. Reopen MAR to refresh before continuing.";
            connection.onUpdate?.(message);
            return { links: [], message, refreshRequired: true };
          }
          return { links: [], message: "Administration saved" };
        }
        const next = await marEvent(current, event);
        current = { ...current, revision: next.revision, state: next.state };
        session.accept(next);
        return undefined;
      } catch (error) {
        if (error instanceof MarRejected) uncertain = undefined;
        if (error instanceof MarConflict) {
          uncertain = undefined;
          await refresh(error.message);
        }
        throw error;
      } finally {
        pending = false;
        if (!uncertain && refreshVersion > current.version)
          await refresh(
            "MAR updated. Review the current dose before continuing.",
          );
      }
    },
  };
}
