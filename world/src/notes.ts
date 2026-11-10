/**
 * Note section text from Synthetic Hospital v1.3 chart sections
 * (synthetic-benchmark). Each task borrows one donor encounter from its
 * setting, matched by diagnosis key (ED scenario, or clinic/pediatric visit
 * kind), then sex and age band; every mapped
 * note section retains that donor's full text, so section sizes follow the
 * dataset. Sections with no dataset counterpart keep Lean's fixed phrase
 * (A45 placeholders). `legacy` omits all text, which reproduces the fixed
 * phrases of earlier worlds.
 */
import { readFileSync } from "node:fs";
import { z } from "zod";
import { hashHex } from "./rng";
import type { PatientProfile } from "./patients";
import type { DaySchedule, Task } from "./schema";

export type NoteTextMode = "synthetic-hospital" | "legacy";
export const NOTE_TEXT_MODES: readonly NoteTextMode[] = ["synthetic-hospital", "legacy"];

/** Local note-section element id → dataset section types, typed in this order. */
export const NOTE_SECTION_TYPES: Readonly<Record<string, readonly string[]>> = {
  hpi: ["hpi"],
  ros: ["ros"],
  exam: ["physical_exam"],
  footExam: ["physical_exam"],
  neuroExam: ["physical_exam"],
  woundExam: ["physical_exam"],
  mentalStatusExam: ["physical_exam"],
  respiratoryAssessment: ["physical_exam"],
  hydrationAssessment: ["physical_exam"],
  pmh: ["pmh"],
  socialHistory: ["social_history"],
  familyHistory: ["family_history"],
  medRec: ["medications"],
  allergyReview: ["allergies"],
  vitals: ["vitals"],
  triage: ["chief_complaint", "vitals"],
  urgentCareTriage: ["chief_complaint", "vitals"],
  mdm: ["assessment"],
  assessment: ["assessment"],
  assessmentPlan: ["assessment", "plan"],
  disposition: ["plan"],
  dischargeInstructions: ["plan"],
  surgicalDecision: ["plan"],
  imagingReview: ["imaging"],
  labReview: ["labs"],
  resultNote: ["labs"],
  ecgReview: ["other_studies"],
  pathologyReview: ["pathology"],
  consultNote: ["hpi", "physical_exam", "assessment", "plan"],
  surgicalConsult: ["hpi", "physical_exam", "assessment", "plan"],
};

const SettingSchema = z.enum(["ed", "inpatient", "outpatient"]);
export type Setting = z.infer<typeof SettingSchema>;
const SectionDonorSchema = z.object({
  encounter: z.number().int(),
  patient: z.number().int(),
  setting: SettingSchema,
  sex: z.string(),
  age: z.number().int(),
  scenarios: z.array(z.string()),
  sections: z.array(z.object({ type: z.string(), order: z.number().int(), text: z.string() })),
});
export type SectionDonor = z.infer<typeof SectionDonorSchema>;
const SectionsFileSchema = z.object({ label: z.literal("synthetic-benchmark"), encounters: z.array(SectionDonorSchema) });

export function loadSectionDonors(path: string): SectionDonor[] {
  return SectionsFileSchema.parse(JSON.parse(readFileSync(path, "utf8"))).encounters;
}

export const ageBand = (age: number): number => (age < 18 ? 0 : age < 45 ? 1 : age < 65 ? 2 : 3);
const sexCode = (p: PatientProfile): string => (p.gender === "male" ? "M" : p.gender === "female" ? "F" : "");

export function taskSetting(task: Task): Setting {
  if (task.persona === "P2") return "ed";
  if (task.persona === "P5" && task.workflow === "W6") return "inpatient";
  return "outpatient";
}

const pickBy = <T>(items: readonly T[], key: string): T | undefined =>
  items.length === 0 ? undefined : items[parseInt(hashHex(key).slice(-8), 16) % items.length];

export class NoteTexts {
  private readonly bySetting = new Map<Setting, SectionDonor[]>();

  constructor(donors: readonly SectionDonor[]) {
    for (const d of [...donors].sort((a, b) => a.encounter - b.encounter)) {
      const list = this.bySetting.get(d.setting) ?? [];
      list.push(d);
      this.bySetting.set(d.setting, list);
    }
  }

  /** Candidate donors, most specific match first. */
  private tiers(setting: Setting, p: PatientProfile | undefined, scenario: string | undefined): SectionDonor[][] {
    const pool = this.bySetting.get(setting) ?? [];
    const band = p === undefined ? undefined : ageBand(p.ageYears);
    const sex = p === undefined ? "" : sexCode(p);
    const inBand = pool.filter((d) => band === undefined || ageBand(d.age) === band);
    const sameSex = inBand.filter((d) => sex === "" || d.sex === sex);
    const tiers: SectionDonor[][] = [];
    if (scenario !== undefined) tiers.push(sameSex.filter((d) => d.scenarios.includes(scenario)), inBand.filter((d) => d.scenarios.includes(scenario)));
    tiers.push(sameSex, inBand, pool);
    return tiers.filter((t) => t.length > 0);
  }

  /** Text for each mapped note section of a task; unmapped sections are omitted. */
  texts(task: Task, p: PatientProfile | undefined, scenario: string | undefined): { id: string; text: string }[] {
    // Nursing documentation (P3) has no counterpart in the dataset's physician chart sections.
    if (task.persona === "P3") return [];
    const mapped = task.choices.noteSections.filter((s) => NOTE_SECTION_TYPES[s] !== undefined);
    if (mapped.length === 0) return [];
    const tiers = this.tiers(taskSetting(task), p, scenario);
    const donor = tiers.length === 0 ? undefined : pickBy(tiers[0] ?? [], `note-donor|${task.id}`);
    const out: { id: string; text: string }[] = [];
    for (const id of [...new Set(mapped)]) {
      const types = NOTE_SECTION_TYPES[id] ?? [];
      const has = (d: SectionDonor) => d.sections.some((s) => types.includes(s.type));
      // Prefer the task's donor; otherwise the first tier holding this section type.
      const source = donor !== undefined && has(donor) ? donor
        : pickBy(tiers.map((t) => t.filter(has)).find((t) => t.length > 0) ?? [], `note-section|${task.id}|${id}`);
      if (source === undefined) continue;
      const text = types.flatMap((t) => source.sections.filter((s) => s.type === t).sort((a, b) => a.order - b.order).map((s) => s.text)).join("\n");
      if (text.length > 0) out.push({ id, text });
    }
    return out;
  }
}

/** Historical opt-out: uniformly charge this typed share, retaining full text. */
export const NOTE_TYPED_SHARE_OFF = 1000;

export const NOTE_AUTHORING_MODES = ["template", "full"] as const;
export type NoteAuthoringMode = typeof NOTE_AUTHORING_MODES[number];
export const NOTE_AUTHORING_PROFILE = {
  sourceId: "N18", doi: "10.1001/jamanetworkopen.2021.15334", dataYear: 2018, publicationYear: 2021,
  label: "calibrated", scope: "OHSU outpatient progress-note character origins; older evidence",
  sharesPerMille: { freeText: 294, copied: 147, template: 559 },
  scenario: { sectionAssignment: "independent hash draw using pooled character shares; no section-specific source estimates",
    nonOutpatient: "extrapolated from outpatient evidence", templateSelections: 2, copiedSelections: 1, copiedEditPerMille: 50 },
} as const;

export function typedPortion(text: string, perMille: number): string {
  if (!Number.isInteger(perMille) || perMille < 0 || perMille > 1000) throw new Error("note typed share must be an integer per mille in 0..1000");
  return perMille === NOTE_TYPED_SHARE_OFF ? text : [...text].slice(0, Math.ceil([...text].length * perMille / 1000)).join("");
}

/** One origin per full section. Pooled probabilities are calibrated (N18, 2018);
 * applying them to sections/other settings and all operator counts are scenarios.
 * Independent hashing avoids changing world random streams. */
export function authorSection(taskId: string, section: {id: string; text: string}, typedShare?: number) {
  if (typedShare !== undefined) return { ...section, authoring: {
    origin: "freeText" as const, typedCharacters: [...typedPortion(section.text, typedShare)].length, selections: 0 } };
  const draw = parseInt(hashHex(`note-origin|${taskId}|${section.id}`).slice(-8), 16) % 1000;
  const shares = NOTE_AUTHORING_PROFILE.sharesPerMille;
  const origin = draw < shares.freeText ? "freeText" : draw < shares.freeText + shares.copied ? "copied" : "template";
  const scenario = NOTE_AUTHORING_PROFILE.scenario;
  return { ...section, authoring: { origin,
    typedCharacters: origin === "freeText" ? [...section.text].length : origin === "copied" ? Math.ceil([...section.text].length * scenario.copiedEditPerMille / 1000) : 0,
    selections: origin === "template" ? scenario.templateSelections : origin === "copied" ? scenario.copiedSelections : 0 } };
}

/** Add full section text and effort without consuming world random draws. */
export function withNoteTexts(schedule: DaySchedule, notes: NoteTexts, patient: (id: string) => PatientProfile | undefined,
  scenario: (taskId: string) => string | undefined, typedShare?: number, authoring: NoteAuthoringMode = "template"): DaySchedule {
  return { ...schedule, tasks: schedule.tasks.map((task) => {
    const texts = notes.texts(task, patient(task.patientId), scenario(task.id))
      .map((n) => typedShare !== undefined || authoring === "template" ? authorSection(task.id, n, typedShare) : n);
    return texts.length === 0 ? task : { ...task, choices: { ...task.choices, noteTexts: texts } };
  }) };
}
