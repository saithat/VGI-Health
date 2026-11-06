import { createMarSession, type MarConnection } from "./marSession";
import { clinicalDate } from "../data/clinicalDate";
import { z } from "zod";
import type {
  Event,
  FactsOutput,
  Receipt,
} from "../../../lean/generated/ehr-types";
import { fhirDisplayContext } from "../data/fhirContext";
import { keepFocusedTask, selectedRowSource } from "../data/patientDirectory";
import { createSession } from "./session";
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
  const initialActivity = session.getSnapshot().state.patientContext?.activity;
  let pending = false;
  let refreshNeeded = false;
  let remote: MarOpened | undefined;
  let history: Event[] = [];
  let unsent: Event[] = [];
  function appendEvent(events: Event[], event: Event, accepted: boolean) {
    const previous = events.at(-1);
    // A field edit submits the final human value. Keep intervening navigation,
    // acknowledgments, confirmations and macros in their original order.
    if (
      accepted &&
      "enter" in event &&
      previous &&
      "enter" in previous &&
      previous.enter.comp === event.enter.comp
    )
      events[events.length - 1] = event;
    else events.push(event);
  }
  let uncertain:
    { requestId: string; body: unknown; event: string } | undefined;
  async function synchronize() {
    if (remote) {
      while (unsent.length) {
        const event = unsent[0];
        if (!event) break;
        remote = { ...remote, ...(await marEvent(remote, event)) };
        unsent.shift();
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
  const projectionFor = scopedProjection;
  return {
    getSnapshot: session.getSnapshot,
    subscribe: session.subscribe,
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
        remote = undefined;
        unsent = [];
        // Directory interactions contain no clinical evidence. A new patient
        // starts from a fresh native state and must earn its own guards.
        const selectedContext = staged.state.patientContext;
        history = [];
        if (
          selectedContext?.activity &&
          selectedContext.activity !== initialActivity
        )
          history.push({
            click: {
              comp:
                selectedContext.activity === "lookup"
                  ? "workspace.lookup"
                  : `workspace.activity|${selectedContext.activity}`,
            },
          });
        if (selectedContext?.query)
          history.push({
            enter: {
              comp: "workspace.search",
              value: { text: { s: selectedContext.query } },
            },
          });
        if (selected) history.push(event);
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
          const reviews = await loadReviewReceipts(
            chart,
            user,
            new Date().toISOString(),
          );
          const projection = projectionFor(staged.state.screen, reviews);
          if (projection.facts.sourcePatientId !== selected)
            throw new Error(
              "Patient identity does not match the selected chart",
            );
          const hydrated = JSON.parse(
            interp.step(
              JSON.stringify(spec),
              JSON.stringify(program),
              JSON.stringify(projection),
              JSON.stringify({ id: user.practitioner.id, role: user.role }),
              JSON.stringify(staged.state),
              JSON.stringify({ scroll: { screen: staged.state.screen } }),
            ),
          );
          session.accept(hydrated, projection);
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
        appendEvent(history, event, staged.result === "ok");
        if (remote) appendEvent(unsent, event, staged.result === "ok");
        session.accept(
          staged,
          staged.state.screen !== before.state.screen
            ? projectionFor(staged.state.screen, staged.state.receipts)
            : undefined,
        );
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
        const intent = uncertain ?? {
          requestId: crypto.randomUUID(),
          event: JSON.stringify(event),
          body: {
            requestId: crypto.randomUUID(),
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
        };
        try {
          accepted = JSON.parse(
            JSON.stringify(await marRequest("/commands", intent.body)),
          );
        } catch (error) {
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
        invalidateDirectory();
        remote = {
          ...authority,
          state: accepted.state,
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
          session.accept(
            staged,
            projectionFor(staged.state.screen, staged.state.receipts),
          );
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
