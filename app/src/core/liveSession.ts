import { createMarSession, type MarConnection } from "./marSession";
import { clinicalDate } from "../data/clinicalDate";
import { z } from "zod";
import type {
  Event,
  FactsOutput,
  Receipt,
  State,
} from "../../../lean/generated/ehr-types";
import { fhirDisplayContext } from "../data/fhirContext";
import { keepFocusedTask, selectedRowSource } from "../data/patientDirectory";
import { createSession } from "./session";
import { screenJournal } from "../data/screenFingerprint";
import type { UiScreen } from "../ehr/ui/types";
import type { Interp } from "./interp";
import {
  bundleResources,
  invalidateDirectory,
  patientVersion,
  loadReviewReceipts,
  loadPatientBundle,
  type Bundle,
  type Encounter,
  type LiveUser,
  type Location,
  type MedicationRequest,
  type Patient,
  type Task,
} from "../data/liveStore";
import {
  MarRejected,
  MarConflict,
  marRequest,
  marEvent,
  openMar,
  type MarOpened,
} from "../data/commitService";

export interface LiveContext {
  patient: Patient;
  encounter: Encounter;
  task?: Task;
  medication?: MedicationRequest;
  renewal?: MedicationRequest;
  bed?: Location;
  worldContext?: Bundle;
}
export function factsContext(
  user: LiveUser,
  now: string,
  receipts: Receipt[] = [],
  context?: LiveContext,
) {
  const date = new Date(now);
  const renewal = context?.renewal;
  const record: [string, string][] = [];
  if (context?.encounter.id)
    record.push(["selectedEncounterId", context.encounter.id]);
  if (context?.medication?.id)
    record.push(["selectedMedicationRequestId", context.medication.id]);
  if (renewal) {
    const dosage = renewal.dosageInstruction?.[0];
    for (const [key, value] of Object.entries({
      requestDose: dosage?.doseAndRate?.[0]?.doseQuantity?.value,
      requestQuantity: renewal.dispenseRequest?.quantity?.value,
      requestRefills: renewal.dispenseRequest?.numberOfRepeatsAllowed,
      requestPharmacy: renewal.dispenseRequest?.performer?.display,
    }))
      if (value !== undefined) record.push([key, String(value)]);
  }
  return {
    today: now.slice(0, 10),
    now: date.getUTCHours() * 60 + date.getUTCMinutes(),
    receipts,
    record: [
      ["viewerPersona", user.persona === "RN2" ? "P3" : user.persona],
      ...record,
    ],
    ...(context?.encounter.id ? { encounterId: context.encounter.id } : {}),
    ...(user.persona === "P2"
      ? { encounterKind: "emergency" }
      : user.persona === "P3" || user.persona === "RN2"
        ? { encounterKind: "inpatient" }
        : {}),
  };
}
export function projectLive(
  interp: Interp,
  bundle: Bundle,
  user: LiveUser,
  now: string,
  receipts: Receipt[],
  context: LiveContext,
  screen = "home",
  workflow = "shell",
): FactsOutput {
  const focusedSource = context.task?.id
    ? `Task/${context.task.id}`
    : undefined;
  const inFocus = (entry: NonNullable<Bundle["entry"]>[number]) =>
    keepFocusedTask(entry.resource, focusedSource, context.patient.id ?? "");
  const worldContext = context.worldContext
    ? {
        ...context.worldContext,
        entry: context.worldContext.entry?.filter(inFocus),
      }
    : undefined;
  const projection: FactsOutput = JSON.parse(
    interp.facts(
      JSON.stringify({
        // Pass the authenticated FHIR profile intact; Lean binds its name to User.id.
        bundle: {
          ...bundle,
          entry: [
            ...(bundle.entry ?? [])
              .filter(inFocus)
              .filter(
                (entry) =>
                  entry.resource?.resourceType !== "Practitioner" ||
                  entry.resource.id !== user.practitioner.id,
              ),
            { resource: user.practitioner },
          ],
        },
        context: factsContext(user, now, receipts, context),
        ...(worldContext ? { worldContext } : {}),
      }),
    ),
  );
  const drug = projection.display.meds.find(
    (m) => m.id === context.medication?.id,
  )?.drug;
  if (context.medication && !drug)
    throw new Error(
      "The selected MAR order is outside the Lean demo formulary",
    );
  const phase =
    screen === "home"
      ? "care"
      : /Orders|Labs|Sign|Verify|PreOp|PostOp|Rx|Refill/.test(screen)
        ? "order-entry"
        : screen;
  const displayContext = fhirDisplayContext(
    bundle,
    context.patient.id ?? "",
    projection.facts.patientId,
    context.encounter.id,
  );
  return {
    ...projection,
    facts: {
      ...projection.facts,
      ...(drug ? { medToGive: drug } : {}),
      ...displayContext,
      // Keep Lean's read-only FHIR projections. An explicit adapter payload
      // replaces the same view rather than creating an ambiguous duplicate.
      infoPayloads: [
        ...(projection.facts.infoPayloads ?? []).filter(
          (p) =>
            !displayContext.infoPayloads.some((other) => other.info === p.info),
        ),
        ...displayContext.infoPayloads,
      ],
      artifactBindings: [
        ...(projection.facts.artifactBindings ?? []).filter(
          (b) =>
            !displayContext.artifactBindings.some(
              (other) => other.key === b.key,
            ),
        ),
        ...displayContext.artifactBindings,
      ],
      phase: { workflow, phase },
      episodeId: context.encounter.id ?? "",
      epochMinute: Math.floor(Date.parse(now) / 60000),
    },
  };
}

/** Stage events through real Lean; publish a commit only after the atomic write
 * succeeds. A rejected transaction leaves the pre-click state and all inputs.
 */
/** The clinician's stored deficiency list, or none when the service does not
 * provide one; the workspace works without it. */
async function loadDeficiencyList(): Promise<
  { id: string; activity: unknown } | undefined
> {
  try {
    return z
      .object({
        id: z.string(),
        activity: z.object({ info: z.string() }).passthrough(),
      })
      .parse(await marRequest("/deficiencies"));
  } catch {
    return undefined;
  }
}

export async function createLiveSession(
  interp: Interp,
  spec: unknown,
  program: unknown,
  bundle: Bundle,
  user: LiveUser,
  initialContext?: LiveContext,
  workspaceDate = clinicalDate(),
  mar?: MarConnection,
) {
  if (mar) return createMarSession(interp, mar);
  const labels = z
    .object({
      commits: z
        .array(z.object({ id: z.string(), label: z.string() }))
        .default([]),
      infos: z
        .array(z.object({ id: z.string(), label: z.string() }))
        .default([]),
    })
    .parse(spec);
  const screens = z
    .object({
      screens: z.array(
        z.object({ id: z.string(), workflow: z.string().optional() }),
      ),
    })
    .parse(program).screens;
  let context = initialContext;
  let chart = bundle;
  const patientCharts = new Map<
    string,
    { context: LiveContext; chart: Bundle }
  >();
  if (initialContext?.patient.id)
    patientCharts.set(initialContext.patient.id, {
      context: initialContext,
      chart,
    });
  const selectionEnabled =
    z.object({ patientSelection: z.boolean().optional() }).parse(program)
      .patientSelection === true;
  const directoryBundle = initialContext?.worldContext ?? bundle;
  // The service computes the signed-in clinician's deficiency list natively and
  // stores it; sessions bind it by ID so replay paints the same work list.
  const deficiencyList = selectionEnabled
    ? await loadDeficiencyList()
    : undefined;
  const directoryProjection = (): FactsOutput =>
    JSON.parse(
      interp.facts(
        JSON.stringify({
          bundle: directoryBundle,
          directoryOnly: true,
          context: {
            ...factsContext(user, new Date().toISOString()),
            today: workspaceDate,
          },
          ...(deficiencyList
            ? { extraActivities: [deficiencyList.activity] }
            : {}),
        }),
      ),
    );
  const directory = selectionEnabled ? directoryProjection() : undefined;
  const receipts = context
    ? await loadReviewReceipts(bundle, user, new Date().toISOString())
    : [];
  const scopedProjection = (screen = "home", reviewReceipts = receipts) => {
    if (!context) {
      if (!directory)
        throw new Error("A legacy program requires an encounter context");
      return directory;
    }
    const projection = projectLive(
      interp,
      chart,
      user,
      new Date().toISOString(),
      reviewReceipts,
      context,
      screen,
      screens.find((s) => s.id === screen)?.workflow ?? "shell",
    );
    return directory
      ? {
          ...projection,
          facts: {
            ...projection.facts,
            patientDirectory: directory.facts.patientDirectory,
          },
        }
      : projection;
  };
  const session = createSession(
    interp,
    spec,
    program,
    selectionEnabled && directory ? directory : scopedProjection(),
    { id: user.practitioner.id, role: user.role },
  );
  let pending = false;
  let refreshNeeded = false;
  let remote: MarOpened | undefined;
  let checkpointId: string | undefined;
  let checkpointDrafts: State["patientDrafts"];
  let workspaceActivity: string | undefined;
  const screensSeen = screenJournal(interp.screenCanonical);
  const history: Event[] = [];
  let unsent: Event[] = [];

  let uncertain:
    { requestId: string; body: unknown; event: string } | undefined;
  async function renewAuthority() {
    if (!remote) throw new Error("No chart session to renew");
    const renewed = z
      .object({ sessionId: z.string(), revision: z.number() })
      .passthrough()
      .parse(
        await marRequest(`/sessions/${remote.sessionId}/renew`, {
          revision: remote.revision,
        }),
      );
    remote = {
      ...remote,
      sessionId: renewed.sessionId,
      revision: renewed.revision,
    };
  }
  async function synchronize(renew = true) {
    if (remote) {
      // The existing guarded renewal has no age cap. Ordinary interactions reuse
      // their session and renew only if the service reports that it expired.
      if (selectionEnabled && renew) await renewAuthority();
      while (unsent.length) {
        const event = unsent[0];
        if (!event) break;
        try {
          remote = { ...remote, ...(await marEvent(remote, event)) };
          unsent.shift();
        } catch (error) {
          if (
            selectionEnabled &&
            error instanceof MarConflict &&
            error.code === "session_expired"
          ) {
            await renewAuthority();
          } else throw error;
        }
      }
      return remote;
    }
    if (!context?.patient.id || !context.encounter.id)
      throw new Error("Select an existing encounter before saving");
    const opened = await openMar({
      patient: context.patient.id,
      release: `${user.persona === "RN2" ? "P3" : user.persona}${sessionStorage.getItem("vgi.baseline") === "1" ? "-baseline" : ""}`,
      workflow: "chart",
      encounter: context.encounter.id,
      expectedVersion: patientVersion(context.patient.id),
      ...(context.task?.id ? { task: context.task.id } : {}),
      ...(context.bed?.id ? { bed: context.bed.id } : {}),
      ...(checkpointId ? { checkpointId } : {}),
      ...(workspaceActivity ? { workspaceActivity } : {}),
      ...(deficiencyList ? { deficiencyList: deficiencyList.id } : {}),
    });
    if (
      JSON.stringify([opened.spec, opened.program]) !==
      JSON.stringify([spec, program])
    )
      throw new Error(
        "The service release differs from this screen. Reopen the EHR with the server's current release.",
      );
    let current = opened;
    for (const event of history)
      current = { ...current, ...(await marEvent(current, event)) };
    remote = current;
    return remote;
  }
  if (!selectionEnabled && context) {
    const authority = await synchronize();
    session.accept(
      { state: authority.state, result: "ok" },
      authority.projection,
    );
  }
  return {
    getSnapshot: session.getSnapshot,
    subscribe: session.subscribe,
    onPaint: (screen: UiScreen) => {
      const state = session.getSnapshot().state;
      screensSeen.observe(
        screen,
        history.length,
        state.patientContext?.patient &&
          state.patientContext.bound !== state.patientContext.patient
          ? "loading"
          : "ready",
      );
    },
    getContext: () => context,
    setBed(bed: Location | undefined) {
      if (pending || uncertain)
        throw new Error("Wait for the pending save before selecting a bed");
      if (!context) throw new Error("Open a patient chart first");
      const { bed: previous, ...rest } = context;
      void previous;
      context = { ...rest, ...(bed ? { bed } : {}) };
      if (context.patient.id)
        patientCharts.set(context.patient.id, { context, chart });
    },
    async dispatch(
      event: Event,
    ): Promise<
      { links: string[]; message: string; refreshRequired?: true } | undefined
    > {
      if (pending) throw new Error("A transaction is already saving");
      if (uncertain && uncertain.event !== JSON.stringify(event))
        throw new Error(
          "Reconcile the previous save before entering another action",
        );
      if (refreshNeeded)
        throw new Error(
          "The previous transaction saved. Reopen the chart to refresh before continuing.",
        );
      const before = session.getSnapshot();
      if (selectionEnabled) {
        const selected = before.state.patientContext?.patient;
        const loaded = selected ? patientCharts.get(selected) : undefined;
        context = loaded?.context;
        chart = loaded?.chart ?? directoryBundle;
      }
      const staged = session.preview(event);
      const priorPatient = before.state.patientContext?.patient;
      const selected = staged.state.patientContext?.patient;
      if (selectionEnabled && selected !== priorPatient) {
        if (priorPatient) {
          pending = true;
          try {
            // An unchanged draft store needs no service call, including an
            // empty chart visited between two charts with existing drafts.
            if (
              JSON.stringify(staged.state.patientDrafts ?? []) !==
              JSON.stringify(checkpointDrafts ?? [])
            ) {
              const authority = await synchronize();
              const saved = z.object({ checkpointId: z.string() }).parse(
                await marRequest("/draft-checkpoints", {
                  sessionId: authority.sessionId,
                  revision: authority.revision,
                  event,
                }),
              );
              checkpointId = saved.checkpointId;
              checkpointDrafts = staged.state.patientDrafts;
            }
            workspaceActivity = staged.state.patientContext?.activity;
            remote = undefined;
            unsent = [];
            history.length = 0;
            screensSeen.clear();
            context = undefined;
            // Keep Lean's navigation state, including patientDrafts. Isolation
            // follows Ehr.Runtime.bind_hydrates / Hydrated.eq: a fresh chart
            // receives only its own draft; hydrating_refuses bars unseen signs.
            // The immutable service checkpoint was created at departure; later
            // source-patient writes and command-session expiry cannot affect it.
            // Directory activity is navigation input; the service applies it
            // natively before replaying this directory's new journal.
            session.accept(
              { state: staged.state, result: staged.result },
              directory,
            );
          } finally {
            pending = false;
          }
          return undefined;
        }
        history.push(event);
        session.accept(staged, directory);
        if (!selected) {
          context = undefined;
          return undefined;
        }
        pending = true;
        try {
          const loaded = await loadPatientBundle(selected);
          const resources = bundleResources(loaded);
          const patient = resources.find(
            (r): r is Patient =>
              r.resourceType === "Patient" && r.id === selected,
          );
          if (!patient)
            throw new Error("The store returned a different patient");
          const source = selectedRowSource(
            directory?.facts.patientDirectory,
            staged.state.patientContext,
            event,
            selected,
          );
          const workItem = bundleResources(directoryBundle).find(
            (r) => `${r.resourceType}/${r.id}` === source,
          );
          const encounterRef =
            workItem?.resourceType === "Encounter"
              ? `Encounter/${workItem.id}`
              : workItem?.resourceType === "Task" ||
                  workItem?.resourceType === "ServiceRequest"
                ? workItem.encounter?.reference
                : undefined;
          const encounters = resources.filter(
            (r): r is Encounter => r.resourceType === "Encounter",
          );
          const priorContext = patientCharts.get(selected)?.context;
          const preselectedEncounter = priorContext?.encounter.id
            ? encounters.find((r) => r.id === priorContext.encounter.id)
            : undefined;
          const encounter = encounterRef
            ? encounters.find((r) => `Encounter/${r.id}` === encounterRef)
            : (preselectedEncounter ??
              encounters.sort(
                (a, b) =>
                  Number(
                    b.class.code ===
                      (user.persona === "P2"
                        ? "EMER"
                        : ["P3", "RN2"].includes(user.persona)
                          ? "IMP"
                          : "AMB"),
                  ) -
                    Number(
                      a.class.code ===
                        (user.persona === "P2"
                          ? "EMER"
                          : ["P3", "RN2"].includes(user.persona)
                            ? "IMP"
                            : "AMB"),
                    ) ||
                  Number(b.period?.start?.slice(0, 10) === workspaceDate) -
                    Number(a.period?.start?.slice(0, 10) === workspaceDate) ||
                  Number(b.status === "in-progress") -
                    Number(a.status === "in-progress") ||
                  (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
              )[0]);
          if (!encounter)
            throw new Error(
              "This chart has no matching existing encounter to open",
            );
          const focusedTask =
            workItem?.resourceType === "Task"
              ? (resources.find(
                  (r): r is Task =>
                    r.resourceType === "Task" && r.id === workItem.id,
                ) ?? workItem)
              : undefined;
          const task =
            focusedTask?.for?.reference === `Patient/${selected}`
              ? focusedTask
              : undefined;
          const focus = task?.focus?.reference;
          const requested = focus?.startsWith("#")
            ? task?.contained?.find(
                (r): r is MedicationRequest =>
                  r.resourceType === "MedicationRequest" &&
                  `#${r.id}` === focus,
              )
            : resources.find(
                (r): r is MedicationRequest =>
                  r.resourceType === "MedicationRequest" &&
                  `MedicationRequest/${r.id}` === focus,
              );
          const renewal =
            requested?.subject.reference === `Patient/${selected}`
              ? requested
              : undefined;
          chart = loaded;
          context = {
            patient,
            encounter,
            worldContext: directoryBundle,
            ...(priorContext &&
            priorContext.encounter.id === encounter.id &&
            priorContext.bed
              ? { bed: priorContext.bed }
              : {}),
            ...(task ? { task } : {}),
            ...(renewal ? { renewal } : {}),
          };
          patientCharts.set(selected, { context, chart });
          const authority = await synchronize();
          session.accept(
            { state: authority.state, result: "ok" },
            authority.projection,
          );
          return undefined;
        } finally {
          pending = false;
        }
      }
      const commits = staged.state.commits.filter(
        (id) => !before.state.commits.includes(id),
      );
      if (commits.includes("administerMed"))
        throw new Error(
          "Medication administration now uses the inpatient MAR. Open Inpatient MAR and sign in with Keycloak.",
        );
      const newReceipts = staged.state.receipts.filter(
        (r) =>
          !before.state.receipts.some(
            (prior) => JSON.stringify(prior) === JSON.stringify(r),
          ),
      );
      if (!commits.length && !newReceipts.length) {
        if (uncertain)
          throw new Error(
            "Reconcile the previous save before entering another action",
          );
        history.push(event);
        if (remote) unsent.push(event);
        if (remote) {
          pending = true;
          try {
            const authority = await synchronize(false);
            session.accept(
              { state: authority.state, result: staged.result },
              authority.projection,
            );
          } finally {
            pending = false;
          }
        } else session.accept(staged);
        return undefined;
      }
      if (!context)
        throw new Error(
          "Select a patient and an existing encounter before saving",
        );
      if (
        selectionEnabled &&
        staged.state.patientContext?.patient !== context.patient.id
      )
        throw new Error(
          "The loaded encounter does not belong to the selected patient",
        );
      pending = true;
      try {
        // Current interpreter emits one commit per click. Reject unexpected
        // multi-write events so they cannot be partially persisted.
        if (commits.length + newReceipts.length !== 1)
          throw new Error("Expected one commit or review receipt per action");
        const commitId = commits[0] ?? "markReviewed";
        const receipt = newReceipts[0];
        const authority = await synchronize();
        if (uncertain && uncertain.event !== JSON.stringify(event))
          throw new Error(
            "Reconcile the previous save before entering another action",
          );
        const requestId = uncertain?.requestId ?? crypto.randomUUID();
        const intent = uncertain ?? {
          requestId,
          event: JSON.stringify(event),
          body: {
            requestId,
            screens: await screensSeen.evidence(requestId),
            sessionId: authority.sessionId,
            revision: authority.revision,
            expectedVersion: authority.version,
            ...(authority.board ? { expectedBoard: authority.board } : {}),
            commit: commitId,
            ...(context.bed?.id ? { bed: context.bed.id } : {}),
            event,
          },
        };
        // Retain the exact command, including its ID, after an ambiguous response.
        if (!uncertain)
          intent.body = {
            ...z.record(z.string(), z.unknown()).parse(intent.body),
            requestId: intent.requestId,
          };
        uncertain = intent;
        let accepted: {
          state: typeof staged.state;
          version: number;
          revision: number;
          board?: { key: string; version: number }[];
          links?: string[];
          screenProjection: FactsOutput;
        };
        try {
          accepted = JSON.parse(
            JSON.stringify(await marRequest("/commands", intent.body)),
          );
        } catch (error) {
          if (error instanceof MarRejected || error instanceof MarConflict) {
            uncertain = undefined;
            throw error;
          }
          try {
            const outcome = z
              .object({ status: z.number(), body: z.unknown() })
              .parse(await marRequest(`/requests/${intent.requestId}`));
            if (outcome.status !== 201) {
              uncertain = undefined;
              throw error;
            }
            accepted = JSON.parse(JSON.stringify(outcome.body));
          } catch {
            throw error;
          }
        }
        uncertain = undefined;
        screensSeen.clear();
        history.push(event);
        unsent = [];
        invalidateDirectory();
        remote = {
          ...authority,
          state: accepted.state,
          projection: accepted.screenProjection,
          version: accepted.version,
          revision: accepted.revision,
          ...(authority.board
            ? {
                board:
                  accepted.board ??
                  authority.board.map((v) =>
                    v.key === `patient:${context?.patient.id}`
                      ? { ...v, version: accepted.version }
                      : v,
                  ),
              }
            : {}),
        };
        const result: {
          links: string[];
          bundle: Bundle;
          refreshError?: string;
        } = { links: accepted.links ?? [], bundle: chart };
        try {
          result.bundle = await loadPatientBundle(context.patient.id ?? "");
        } catch (error) {
          result.refreshError = `Saved. Refresh failed: ${String(error)}`;
        }
        staged.state = accepted.state;
        if (result.refreshError) {
          refreshNeeded = true;
          session.accept(staged);
          return {
            links: result.links,
            message: result.refreshError,
            refreshRequired: true,
          };
        }
        chart = result.bundle;
        const encounterId = context.encounter.id;
        const updated = bundleResources(chart).find(
          (r): r is Encounter =>
            r.resourceType === "Encounter" && r.id === encounterId,
        );
        if (updated) context = { ...context, encounter: updated };
        if (context.patient.id)
          patientCharts.set(context.patient.id, { context, chart });
        try {
          session.accept(staged, accepted.screenProjection);
        } catch (error) {
          refreshNeeded = true;
          session.accept(staged);
          return {
            links: result.links,
            refreshRequired: true,
            message: `Saved. Facts refresh failed: ${error instanceof Error ? error.message : String(error)}. Reopen the chart.`,
          };
        }
        const label = receipt
          ? (labels.infos.find((info) => info.id === receipt.info)?.label ??
            "Chart")
          : (labels.commits.find((commit) => commit.id === commitId)?.label ??
            "Changes");
        return {
          links: result.links,
          message: receipt ? `${label} review recorded` : `Saved: ${label}`,
        };
      } finally {
        pending = false;
      }
    },
  };
}
