import Ehr.Render.Types
import Ehr.Core.Basics
import Init.Data.List.Sort.Lemmas

/-! Offset-bearing FHIR time projection. Date-only, local, invalid and unsupported
precision values remain explicitly unpositioned; they never acquire invented UTC. -/
namespace Ehr.Render.Dated
open Ehr

private def slice (s : String) (start count : Nat) : String :=
  (s.toList.drop start |>.take count).foldl String.push ""

/-- The existing FHIR wasm32 reconstruction avoids String.ofList's heap-nil
runtime path without changing the logical substring contract. -/
theorem slice_exact (s start count) :
    slice s start count = String.ofList (s.toList.drop start |>.take count) := by
  have aux (xs : List Char) (accText : String) :
      xs.foldl String.push accText = accText ++ String.ofList xs := by
    induction xs generalizing accText with
    | nil => simp
    | cons c cs ih =>
      rw [List.foldl_cons, ih, String.ofList_cons, String.push_eq_append, String.append_assoc]
  simpa [slice] using aux (s.toList.drop start |>.take count) ""

private def digits (s : String) : Option Nat :=
  if s.isEmpty || !s.toList.all Char.isDigit then none else s.toNat?

/-- Parse FHIR dateTime/instant with seconds and explicit Z or ±HH:MM.
Leap seconds are unpositioned. Up to nanosecond precision is exact. -/
private def parseClock (s : String) : Option (Int × Nat) := do
  if s.length < 20 || slice s 4 1 != "-" || slice s 7 1 != "-" ||
      slice s 10 1 != "T" || slice s 13 1 != ":" || slice s 16 1 != ":" then none else do
  let year ← digits (slice s 0 4)
  let month ← digits (slice s 5 2)
  let day ← digits (slice s 8 2)
  let hour ← digits (slice s 11 2)
  let minute ← digits (slice s 14 2)
  let second ← digits (slice s 17 2)
  if hour ≥ 24 || minute ≥ 60 || second ≥ 60 then none else do
  let zoneStart := if s.endsWith "Z" then s.length - 1 else s.length - 6
  let offset ← if s.endsWith "Z" then some (0 : Int) else do
    let sign := slice s zoneStart 1
    if (sign != "+" && sign != "-") || slice s (zoneStart + 3) 1 != ":" then none else do
    let h ← digits (slice s (zoneStart + 1) 2)
    let m ← digits (slice s (zoneStart + 4) 2)
    if h > 14 || m ≥ 60 || (h == 14 && m != 0) || (sign == "-" && h == 0 && m == 0) then none else
      some (if sign == "-" then -(Int.ofNat (h * 60 + m)) else Int.ofNat (h * 60 + m))
  let nano ← if zoneStart == 19 then some 0 else do
    if zoneStart ≤ 20 || zoneStart > 29 || slice s 19 1 != "." then none else do
    let fraction ← digits (slice s 20 (zoneStart - 20))
    some (fraction * 10 ^ (9 - (zoneStart - 20)))
  let utc ← stampMinute {
    time := 0, year := year, month := month, day := day,
    minuteOfDay := hour * 60 + minute, utcOffsetMinutes := offset, zone := "FHIR" }
  some (utc * 60 + Int.ofNat second, nano)

/-- Only offset-bearing timestamps can acquire a coordinate. -/
def hasOffset (s : String) : Bool :=
  s.endsWith "Z" || (s.length ≥ 25 &&
    ((slice s (s.length - 6) 1 == "+") || (slice s (s.length - 6) 1 == "-")))

def parse (s : String) : Option (Int × Nat) :=
  if hasOffset s then parseClock s else none

theorem offset_required (s instant) (h : parse s = some instant) : hasOffset s = true := by
  unfold parse at h
  split at h
  · assumption
  · contradiction

def project (source : UiSourceDate) : Option UiDatedItem := do
  let (utcSecond, nanosecond) ← parse source.timestamp
  some { source, utcSecond, nanosecond }

def key (item : UiDatedItem) : Int := item.utcSecond * 1000000000 + Int.ofNat item.nanosecond

def before (a b : UiDatedItem) : Bool := decide (key a ≤ key b)

def dated (sources : List UiSourceDate) : List UiDatedItem :=
  (sources.filterMap project).mergeSort before

def undated (sources : List UiSourceDate) : List UiSourceDate :=
  sources.filter (fun s => (project s).isNone)

/-- Sorted output is a permutation: no positioned row or duplicate disappears. -/
theorem no_dated_drop (sources) : (dated sources).Perm (sources.filterMap project) :=
  List.mergeSort_perm _ _

theorem chronological (sources) : (dated sources).Pairwise (fun a b => key a ≤ key b) := by
  have h := List.pairwise_mergeSort (le := before)
    (by intro a b c; simp only [before, decide_eq_true_eq]; exact Int.le_trans)
    (by intro a b; simp only [before, Bool.or_eq_true, decide_eq_true_eq]; omega)
    (sources.filterMap project)
  simpa [dated, before] using h

/-- Every positioned item retains the exact raw source and normalized instant. -/
theorem source_exact (sources item) (h : item ∈ dated sources) :
    item.source ∈ sources ∧ parse item.source.timestamp = some (item.utcSecond, item.nanosecond) := by
  have hm := (no_dated_drop sources).mem_iff.mp h
  obtain ⟨source, hs, hp⟩ := List.mem_filterMap.mp hm
  unfold project at hp
  cases ht : parse source.timestamp with
  | none => simp [ht] at hp
  | some pair =>
    rcases pair with ⟨sec, nano⟩
    simp [ht] at hp
    subst item
    exact ⟨hs, ht⟩

/-- Every source either appears positioned or remains explicitly undated. -/
theorem complete (sources source) (h : source ∈ sources) :
    (∃ item ∈ dated sources, item.source = source) ∨ source ∈ undated sources := by
  cases hp : project source with
  | none => exact Or.inr (List.mem_filter.mpr ⟨h, by simp [hp]⟩)
  | some item =>
    left
    have hm : item ∈ dated sources := (no_dated_drop sources).mem_iff.mpr
      (List.mem_filterMap.mpr ⟨source, h, hp⟩)
    refine ⟨item, hm, ?_⟩
    unfold project at hp
    cases ht : parse source.timestamp <;> simp [ht] at hp
    next pair => cases hp; rfl

private theorem project_source (s item) (h : project s = some item) : item.source = s := by
  unfold project at h
  cases hp : parse s.timestamp <;> simp [hp] at h
  next pair => cases h; rfl

/-- Partition retains source multiplicity across positioned and unpositioned lists. -/
theorem partition (sources : List UiSourceDate) :
    ((sources.filterMap project).map (·.source) ++ undated sources).Perm sources := by
  induction sources with
  | nil => simp [undated]
  | cons s rest ih =>
    cases hp : project s with
    | none =>
      simp only [List.filterMap_cons, hp, Option.toList_none, List.nil_append,
        List.map_append, List.map_nil, List.nil_append, undated, List.filter_cons,
        hp, Option.isNone_none, ↓reduceIte] at ih ⊢
      exact (List.perm_middle).trans (ih.cons s)
    | some item =>
      have hs := project_source s item hp
      simpa [List.filterMap_cons, hp, hs, undated] using ih.cons s

theorem no_source_drop (sources) :
    ((dated sources).map (·.source) ++ undated sources).Perm sources :=
  ((no_dated_drop sources).map _ |>.append_right _).trans (partition sources)

#guard parse "2026-11-02T01:30:00-07:00" == parse "2026-11-02T08:30:00Z"
#guard parse "2026-11-02T01:30:00-08:00" != parse "2026-11-02T01:30:00-07:00"
#guard parse "1969-12-31T23:59:59Z" == some (-1, 0)
#guard parse "2026-11-02T08:30:00.123456789Z" == some (1793608200, 123456789)
#guard parse "2026-11-02T08:30:00" == none
#guard parse "2026-11-02" == none
#guard parse "2026-11-02T08:30:00-00:00" == none
#guard parse "2026-02-30T08:30:00Z" == none
#guard parse "2026-11-02T24:00:00Z" == none
#guard parse "2026-11-02T08:30:00+14:01" == none

#print axioms slice_exact
#print axioms offset_required
#print axioms partition
#print axioms no_source_drop
#print axioms no_dated_drop
#print axioms chronological
#print axioms source_exact
#print axioms complete
end Ehr.Render.Dated
