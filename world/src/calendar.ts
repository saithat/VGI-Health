/**
 * Simulation calendar. Day 1 is Monday. The continuous world uses calendar
 * days; the legacy scope (library default) skips weekends.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { Persona } from "./schema";

export type WorldClock = "continuous" | "legacy";
// Scoped and re-entrant: independent world generations never share calendar mode.
const calendar = new AsyncLocalStorage<WorldClock>();
export function withCalendar<T>(mode: WorldClock, build: () => T): T { return calendar.run(mode, build); }
export function continuousCalendar(): boolean { return calendar.getStore() === "continuous"; }

/** First simulated work-day (a Monday). Ages and FHIR dates are computed from it. */
export const SIM_START_DATE = "2026-11-02";
/** Fixed UTC offset written into FHIR dateTimes (Pacific Standard Time in November). */
export const TZ_OFFSET = "-08:00";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
const WEEKDAYS: readonly Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** Shift start (minutes since midnight) and length per persona. `Task.startMin` counts from the start. */
export const SHIFTS: Record<Persona, { startClock: number; lengthMin: number; label: string }> = {
  P1: { startClock: 7 * 60 + 30, lengthMin: 660, label: "clinic 07:30-18:30" },
  P2: { startClock: 7 * 60, lengthMin: 600, label: "ED shift 07:00-17:00" },
  P3: { startClock: 7 * 60, lengthMin: 720, label: "ward day shift 07:00-19:00" },
  P4: { startClock: 8 * 60, lengthMin: 570, label: "pediatric clinic 08:00-17:30" },
  P5: { startClock: 6 * 60 + 30, lengthMin: 660, label: "surgery 06:30-17:30" },
};

export function weekdayOf(day: number): Weekday {
  if (continuousCalendar()) return (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const)[((day - 1) % 7 + 7) % 7] ?? "Mon";
  const w = WEEKDAYS[(((day - 1) % 5) + 5) % 5];
  if (w === undefined) throw new Error(`bad day ${day}`);
  return w;
}

/** 1-based calendar week of the simulation. */
export function weekOf(day: number): number {
  return Math.floor((day - 1) / (continuousCalendar() ? 7 : 5)) + 1;
}

/** ISO date (YYYY-MM-DD) of a simulation day. Day 0 is the Friday before day 1; negative days go back further. */
export function dateOf(day: number): string {
  const start = Date.UTC(2026, 10, 2); // SIM_START_DATE
  const idx = day - 1; // work-day offset from day 1
  const weeks = Math.floor(idx / 5);
  const rem = idx - weeks * 5;
  const calendarDays = continuousCalendar() ? idx : weeks * 7 + rem;
  const d = new Date(start + calendarDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** FHIR dateTime for a sim day and a clock time (minutes since midnight). */
export function dateTimeOf(day: number, clockMin: number): string {
  const rounded = Math.round(clockMin);
  const carry = continuousCalendar() ? Math.floor(rounded / 1440) : 0;
  const c = continuousCalendar() ? ((rounded % 1440) + 1440) % 1440 : Math.max(0, Math.min(1439, rounded));
  const hh = String(Math.floor(c / 60)).padStart(2, "0");
  const mm = String(c % 60).padStart(2, "0");
  return `${dateOf(day + carry)}T${hh}:${mm}:00${TZ_OFFSET}`;
}

/** Whole years between an ISO birth date and a sim day. */
export function ageYearsOn(birthDate: string, day: number): number {
  return Math.floor(ageDaysOn(birthDate, day) / 365.25);
}

export function ageDaysOn(birthDate: string, day: number): number {
  const b = Date.parse(`${birthDate.slice(0, 10)}T00:00:00Z`);
  const d = Date.parse(`${dateOf(day)}T00:00:00Z`);
  if (Number.isNaN(b)) return 40 * 365;
  return Math.max(0, Math.round((d - b) / 86_400_000));
}

/** Days between an ISO date and a sim day (positive if the date is earlier). */
export function daysBefore(isoDate: string, day: number): number {
  const a = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
  const d = Date.parse(`${dateOf(day)}T00:00:00Z`);
  if (Number.isNaN(a)) return 9999;
  return Math.round((d - a) / 86_400_000);
}

/** Minutes since a persona's shift start for an absolute clock time, clamped into the shift. */
export function toShiftMin(persona: Persona, clockMin: number): number {
  const s = SHIFTS[persona];
  return Math.max(0, Math.min(s.lengthMin, Math.round(clockMin - s.startClock)));
}

export function clockLabel(clockMin: number): string {
  const hh = String(Math.floor(clockMin / 60)).padStart(2, "0");
  const mm = String(Math.round(clockMin) % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
