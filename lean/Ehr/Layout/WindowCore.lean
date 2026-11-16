import Ehr.Render.Types

/-! # Bounded lists: the paging decision

New specifications for owner review. The part of `Ehr.Layout.Window` that
decides which lists are paged and how: page sizes, pages, and the lists a
window may page. It reads only the semantic screen types, so the simulated
clinician (`Ehr.Sim.Policy`) can follow the layout's paging without depending on
the layout library. -/
namespace Ehr.Layout.Window
open Ehr Ehr.Render

/-! ## Configuration -/

/-- New specification for owner review: the page size of a list that declares
none. Twenty records of 24 px rows, with the list's caption, pager row and
header, fill about 550 px, which the dense layout's first viewport at
1440×900 holds below the banner and navigation. -/
def defaultPageSize : Nat := 20

/-- New specification for owner review: the smallest and largest page size a
layout may choose for a list. -/
def minPageSize : Nat := 5
def maxPageSize : Nat := 50

/-- New specification for owner review: the window configuration. A layout may
give a list its own page size; it is kept within `minPageSize` and
`maxPageSize`. -/
structure Config where
  size : Nat := defaultPageSize
  sizes : List (String × Nat) := []
  enabled : Bool := true
  deriving Repr, Inhabited

/-- The page size of a list. -/
def Config.sizeOf (cfg : Config) (comp : String) : Nat :=
  min maxPageSize (max minPageSize ((cfg.sizes.lookup comp).getD cfg.size))

theorem sizeOf_pos (cfg : Config) (comp : String) : 0 < cfg.sizeOf comp := by
  unfold Config.sizeOf maxPageSize minPageSize; omega

theorem sizeOf_le (cfg : Config) (comp : String) : cfg.sizeOf comp ≤ maxPageSize := by
  unfold Config.sizeOf; omega

/-! ## Pages of a list -/

/-- New specification for owner review: the number of pages of `n` records in
pages of `k` (at least one). -/
def pageCount (n k : Nat) : Nat := max 1 ((n + k - 1) / k)

/-- New specification for owner review: the records of page `p`, in order. -/
def pageRows {α : Type} (rows : List α) (k p : Nat) : List α := (rows.drop (p * k)).take k

/-- New specification for owner review: the page shown when page `p` is asked
for; a page past the last shows the last. -/
def clampPage (n k p : Nat) : Nat := min p (pageCount n k - 1)

/-- New specification for owner review: what the next-page target selects. -/
def nextPage (pages p : Nat) : Nat := if p + 1 < pages then p + 1 else p

/-! ## Which lists are paged -/

/-- The components of the info nodes under a node, at any depth, and the
targets of its row-action groups. A row action names its list, so a list
whose records carry actions occurs more than once and is not paged: paging it
would detach its actions from their records. -/
def infoComps : UiNode → List String
  | .info comp _ _ _ _ => [comp]
  | .rowAction target _ cs => target :: cs.flatMap infoComps
  | .board _ cs | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs | .valueSet _ _ cs
  | .chartReferences _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs => cs.flatMap infoComps
  | .patientPane _ _ _ cs modal => cs.flatMap infoComps ++ modal.flatMap infoComps
  | _ => []

def screenInfoComps (screen : UiScreen) : List String :=
  (screen.workspace ++ screen.side ++ screen.modal.toList ++ screen.urgent?.getD []).flatMap infoComps

/-- New specification for owner review: a list the window may page. It belongs
to a component, so the pager's `selectTab` events reach it; it is not a search
result list (the search shows at most 25 matches already) and not the patient
directory list. -/
def pageable (comp infoId : String) : Bool :=
  comp != "" && infoId != "searchResults" && !comp.startsWith "workspace."

/-- New specification for owner review: the lists of a screen that are paged:
pageable lists whose component occurs once on the screen. Lists inside a
multi-patient board or a patient pane are never paged (`windowNode`). -/
def eligibleIn (screen : UiScreen) (comp infoId : String) : Bool :=
  pageable comp infoId && (screenInfoComps screen).count comp == 1

/-- The page asked for a list: the view state the renderer passes on. -/
def askedIn (screen : UiScreen) (comp : String) : Nat := ((screen.pages?.getD []).lookup comp).getD 0

/-- The list is long enough to page. -/
def paged (cfg : Config) (eligible : String → String → Bool) (comp infoId : String)
    (rows : List (List (String × String))) : Bool :=
  eligible comp infoId && decide (cfg.sizeOf comp < rows.length)

/-- The lists under a node that a window may reach: component, info and record
count of every info node outside a board or a patient pane. -/
def listsOf : UiNode → List (String × String × Nat)
  | .info comp _ infoId _ rows => [(comp, infoId, rows.length)]
  | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs | .valueSet _ _ cs
  | .chartReferences _ cs | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs =>
    cs.flatMap listsOf
  | _ => []

/-- New specification for owner review: how the layout pages list `comp` of a
screen, when it does: its page size and the page it shows (the page asked for,
the last page when a later one is asked). The simulated clinician reads it to
page to a record it needs (`Ehr.Sim.Policy.readNeed`). -/
def pagingOf (cfg : Config) (screen : UiScreen) (comp : String) : Option (Nat × Nat) :=
  if !cfg.enabled then none else
  match ((screen.workspace ++ screen.side).flatMap listsOf).find? (·.1 == comp) with
  | some (_, infoId, n) =>
    let k := cfg.sizeOf comp
    if eligibleIn screen comp infoId && decide (k < n) then some (k, clampPage n k (askedIn screen comp)) else none
  | none => none

end Ehr.Layout.Window
