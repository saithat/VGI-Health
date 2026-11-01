import { z } from "zod";
import type {
  Event,
  FactsOutput,
  Receipt,
} from "../../../lean/generated/ehr-types";
import { fhirDisplayContext, reviewSources } from "../data/fhirContext";
import { createSession } from "./session";
import type { Interp } from "./interp";
import {
  bundleResources,
  loadReviewReceipts,
  persistCommit,
  resolveCosigner,
  type Bundle,
  type Encounter,
  type LiveUser,
  type Location,
  type MedicationRequest,
  type Patient,
  type Task,
} from "../data/medplum";
import { valueText } from "../data/commitMapper";

export interface LiveContext {
  patient: Patient;
  encounter: Encounter;
  task?: Task;
  medication?: MedicationRequest;
  renewal?: MedicationRequest;
  bed?: Location;
}
const elementSchema = z.object({
  id: z.string(),
  label: z.string(),
  fhirTarget: z.string(),
});
export function factsContext(
  user: LiveUser,
  now: string,
  receipts: Receipt[] = [],
  context?: LiveContext,
) {
  const date = new Date(now);
  const renewal = context?.renewal;
  const record: [string, string][] = [];
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
    record,
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
  const projection: FactsOutput = JSON.parse(
    interp.facts(
      JSON.stringify({
        bundle,
        context: factsContext(user, now, receipts, context),
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
  initialContext: LiveContext,
) {
  const elements = z
    .object({ elements: z.array(elementSchema) })
    .parse(spec).elements;
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
  const receipts = await loadReviewReceipts(
    bundle,
    user,
    new Date().toISOString(),
  );
  const session = createSession(
    interp,
    spec,
    program,
    projectLive(
      interp,
      chart,
      user,
      new Date().toISOString(),
      receipts,
      context,
    ),
    { id: user.practitioner.id, role: user.role },
  );
  let pending = false;
  let refreshNeeded = false;
  const projectionFor = (screen: string, receipts: Receipt[]) =>
    projectLive(
      interp,
      chart,
      user,
      new Date().toISOString(),
      receipts,
      context,
      screen,
      screens.find((s) => s.id === screen)?.workflow ?? "shell",
    );
  return {
    getSnapshot: session.getSnapshot,
    subscribe: session.subscribe,
    getContext: () => context,
    async dispatch(
      event: Event,
    ): Promise<{ links: string[]; message: string } | undefined> {
      if (pending) throw new Error("A transaction is already saving");
      if (refreshNeeded)
        throw new Error(
          "The previous transaction saved. Reopen the chart to refresh before continuing.",
        );
      const before = session.getSnapshot();
      const staged = session.preview(event);
      const commits = staged.state.commits.filter(
        (id) => !before.state.commits.includes(id),
      );
      const newReceipts = staged.state.receipts.filter(
        (r) =>
          !before.state.receipts.some(
            (prior) => JSON.stringify(prior) === JSON.stringify(r),
          ),
      );
      if (!commits.length && !newReceipts.length) {
        session.accept(
          staged,
          staged.state.screen !== before.state.screen
            ? projectionFor(staged.state.screen, staged.state.receipts)
            : undefined,
        );
        return undefined;
      }
      pending = true;
      try {
        // Current interpreter emits one commit per click. Reject unexpected
        // multi-write events so they cannot be partially persisted.
        if (commits.length + newReceipts.length !== 1)
          throw new Error("Expected one commit or review receipt per action");
        const commitId = commits[0] ?? "markReviewed";
        const receipt = newReceipts[0];
        const reviewed = receipt ? reviewSources(chart, receipt.info) : [];
        // An empty allergy list still has a patient-version target, so its review
        // is auditable; a subsequent allergy invalidates Lean's data version.
        if (receipt && !reviewed.length) reviewed.push(context.patient);
        const cosign = staged.state.captured.find(
          (c) => c.element === "highAlertCosign" && c.confirmed,
        );
        const cosigner = cosign
          ? await resolveCosigner(valueText(cosign.value))
          : undefined;
        const result = await persistCommit({
          commitId,
          captured: staged.state.captured,
          elements,
          patient: context.patient,
          encounter: context.encounter,
          user: user.practitioner,
          now: new Date().toISOString(),
          transactionId: crypto.randomUUID(),
          ...(context.task ? { task: context.task } : {}),
          ...(context.medication ? { medication: context.medication } : {}),
          ...(context.renewal ? { renewal: context.renewal } : {}),
          ...(context.bed ? { bed: context.bed } : {}),
          ...(cosigner ? { cosigner } : {}),
          ...(receipt ? { receipt, reviewed } : {}),
        });
        if (result.refreshError) {
          refreshNeeded = true;
          session.accept(staged);
          return { links: result.links, message: result.refreshError };
        }
        chart = result.bundle;
        const updated = bundleResources(chart).find(
          (r): r is Encounter =>
            r.resourceType === "Encounter" && r.id === context.encounter.id,
        );
        if (updated) context = { ...context, encounter: updated };
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
