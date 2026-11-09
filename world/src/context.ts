/**
 * Day context: calendar position, volume (busy/quiet days, Monday surge, flu
 * week), allergy share, lb-weight share, interruptions, and scripted events.
 * Calendar-level structure (which week is the flu week, which weekday is the
 * quiet one) comes from the seed alone; the day-to-day noise comes from the
 * day seed, which also hashes the previous world state.
 */
import { dateOf, weekdayOf, weekOf, continuousCalendar } from "./calendar";
import { Rng } from "./rng";
import type { Load, Persona } from "./schema";
import { perPersona } from "./schema";
import type { DayContext } from "./state";

/** Scripted: P1 covers urgent care (BRIEF section 9). */
export const URGENT_CARE_DAY = 5;
/** Scripted: vendor releases (BRIEF sections 9a, 9b). The world itself does not change for them. */
export const RELEASE_V2_DAY = 4;
export const RELEASE_V3_DAY = 7;
/** Scripted: the canonical surgical flow starts with an appendicitis consult on this day. */
export const SCRIPTED_APPENDICITIS_DAYS: readonly number[] = [1];

/** P5 alternates: odd days are clinic days, even days are OR days. */
export function p5DayType(day: number): "clinic" | "or" {
  return day % 2 === 1 ? "clinic" : "or";
}

export function fluWeekOf(seed: number): number {
  return new Rng(`${seed}:flu-week`).chance(0.7) ? 2 : 1;
}

/** The quiet weekday (2 = Tue, 3 = Wed, 4 = Thu) of a calendar week. */
export function quietWeekdayIndex(seed: number, week: number): number {
  return new Rng(`${seed}:quiet:${week}`).pick([2, 3, 4]);
}

function loadOf(v: number): Load {
  if (v >= 1.1) return "busy";
  if (v <= 0.9) return "quiet";
  return "normal";
}

const WEEKDAY_VOLUME = [1.22, 1.0, 1.0, 0.98, 0.93];

export function computeContext(seed: number, day: number, daySeed: string): DayContext {
  const rng = new Rng(`${daySeed}:context`);
  const weekday = weekdayOf(day);
  const week = weekOf(day);
  const daysPerWeek = continuousCalendar() ? 7 : 5;
  const wdIdx = (((day - 1) % daysPerWeek) + daysPerWeek) % daysPerWeek; // 0 = Mon
  const fluWeek = week === fluWeekOf(seed);
  const quiet = wdIdx + 1 === quietWeekdayIndex(seed, week);
  let volume = WEEKDAY_VOLUME[wdIdx] ?? 1;
  if (quiet) volume *= 0.8;
  if (fluWeek) volume *= 1.1;
  volume *= Math.min(1.12, Math.max(0.9, rng.normal(1, 0.05)));
  volume = Math.round(volume * 1000) / 1000;

  const personaVolume = perPersona((p: Persona) => {
    // Pediatrics feels the flu week hardest; the ward feels it least.
    const fluBoost = fluWeek ? (p === "P4" ? 1.08 : p === "P3" ? 0.96 : 1) : 1;
    return Math.round(volume * fluBoost * Math.min(1.08, Math.max(0.92, rng.normal(1, 0.04))) * 1000) / 1000;
  });
  const personaLoad = perPersona((p) => loadOf(personaVolume[p]));

  const scriptedEvents: string[] = [];
  if (day === 1) scriptedEvents.push("day-1-canonical-ui");
  if (SCRIPTED_APPENDICITIS_DAYS.includes(day)) scriptedEvents.push("appendicitis-consult-P2-to-P5");
  if (day === RELEASE_V2_DAY) scriptedEvents.push("vendor-release-v2-prior-auth");
  if (day === URGENT_CARE_DAY) scriptedEvents.push("P1-covers-urgent-care");
  if (day === RELEASE_V3_DAY) scriptedEvents.push("vendor-release-v3-antibiotic-indication");
  if (wdIdx === 0) scriptedEvents.push("monday-surge");
  if (fluWeek) scriptedEvents.push("flu-week");

  return {
    day,
    date: dateOf(day),
    weekday,
    week,
    monday: wdIdx === 0,
    fluWeek,
    urgentCareDay: day === URGENT_CARE_DAY,
    p5DayType: p5DayType(day),
    volume,
    globalLoad: loadOf(volume),
    allergyShare: Math.round(rng.real(0.12, 0.4) * 100) / 100,
    lbShare: Math.round(rng.real(0.15, 0.4) * 100) / 100,
    interruptionFactor: Math.round(Math.min(1.5, Math.max(0.6, volume * rng.normal(1, 0.1))) * 100) / 100,
    personaVolume,
    personaLoad,
    scriptedEvents,
  };
}
