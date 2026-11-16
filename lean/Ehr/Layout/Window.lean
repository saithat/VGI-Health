import Ehr.Layout.Semantic

/-! # Bounded lists

New specifications for owner review. A clinical list (an info table, a result
list, a history) can hold any number of records. Shown whole, it makes a
screen as long as its data: the records further down need more scrolling to
reach, an abnormal record can sit far below the first viewport, and the
screen's inventory, and with it the work of checking and painting it, grows
with the record count (`WindowProofs` states these on the layout model).

The layout therefore bounds every list it can page. A list is shown one page
at a time, in the order the renderer gives its records; the page shown is view
state (`State.tabSel`, the same place as the selected tab), selected by the same
`selectTab` event and guards as a tab (`Ehr.selectTabCore`). Each paged list
shows where its page is ("Records 26–50 of 705"), how many flagged records are
on other pages, and four targets: the previous page, the next page, a page
selector that offers every page, and the next page holding a flagged record
(`Display.pagerParts`).

The renderer is unchanged: every record stays in the `UiScreen`, so the
clinical display theorems (D2, T11) still speak of the complete list. The
window is a layout decision on top of it, like scrolling, and `windowScreen`
is the function the layout applies. Nothing here is a clinical claim: the page
size, the order and what counts as flagged are modelling choices.

Paging rather than a scroll window: a window that follows the scroll offset
keeps the scroll distance to a record linear in its position, and makes the
inventory depend on a scroll offset that is not interpreter state. Pages are a
discrete view state like tabs, go through the interpreter's event path, give a
bounded number of actions to any record and keep the inventory a function of the
page size. -/
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

/-! ## Flagged records -/

/-- New specification for owner review: a cell is flagged when it is a result
flag with a tone (critical, high or low) or a state with the red tone (high,
abnormal, critical, urgent, STAT, overdue, rejected), as `cellRole` classifies
it for display. -/
def flaggedCell (cell : String × String) : Bool :=
  match cellRole cell.1 cell.2 with
  | (.badge, tone) => tone != ""
  | (.status, tone) => tone == "red"
  | _ => false

/-- New specification for owner review: a record is flagged when one of its cells is. -/
def flaggedRow (row : List (String × String)) : Bool := row.any flaggedCell

/-- The positions of the flagged records. -/
def flaggedIndices (rows : List (List (String × String))) : List Nat :=
  (List.range rows.length).filter fun i => (rows[i]?.map flaggedRow).getD false

/-- The number of flagged records off page `p`. -/
def flaggedOff (rows : List (List (String × String))) (k p : Nat) : Nat :=
  ((flaggedIndices rows).filter fun i => i / k != p).length

/-- Page `q` holds a flagged record. -/
def pageHasFlag (rows : List (List (String × String))) (k q : Nat) : Bool :=
  (flaggedIndices rows).any fun i => i / k == q

/-- The pages after `p`, then the pages from the first up to `p`. -/
def cyclic (pages p : Nat) : List Nat :=
  (List.range pages).filter (fun q => p < q) ++ (List.range pages).filter (fun q => q ≤ p)

/-- New specification for owner review: the next page after `p`, cyclically,
that holds a flagged record, other than `p` itself. -/
def nextFlagged (rows : List (List (String × String))) (k pages p : Nat) : Option Nat :=
  (cyclic pages p).find? fun q => q != p && pageHasFlag rows k q

/-- New specification for owner review: the window of a list of `rows` asked
to show page `asked`. -/
def windowOf (cfg : Config) (comp : String) (rows : List (List (String × String))) (asked : Nat) : UiWindow :=
  let k := cfg.sizeOf comp
  let page := clampPage rows.length k asked
  { comp, page, pages := pageCount rows.length k, size := k, total := rows.length,
    flagged := (flaggedIndices rows).length, flaggedElsewhere := flaggedOff rows k page,
    nextFlagged? := nextFlagged rows k (pageCount rows.length k) page }

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

/-! ## The window of a screen -/

/-- New specification for owner review: a node with each of its paged lists
cut to the page asked for. Inside a board or a patient pane nothing is paged. -/
def windowNode (cfg : Config) (eligible : String → String → Bool) (asked : String → Nat) : UiNode → UiNode
  | .info comp label infoId display rows =>
    if paged cfg eligible comp infoId rows then
      .info comp label infoId display
        (pageRows rows (cfg.sizeOf comp) (clampPage rows.length (cfg.sizeOf comp) (asked comp)))
    else .info comp label infoId display rows
  | .board urgent cs => .board urgent (cs.map (windowNode cfg (fun _ _ => false) asked))
  | .patientPane patient banner metadata cs modal =>
    .patientPane patient banner metadata (cs.map (windowNode cfg (fun _ _ => false) asked))
      (modal.map (windowNode cfg (fun _ _ => false) asked))
  | .datedTimeline title dated undated cs => .datedTimeline title dated undated (cs.map (windowNode cfg eligible asked))
  | .timeline title cs => .timeline title (cs.map (windowNode cfg eligible asked))
  | .presentation kind cs => .presentation kind (cs.map (windowNode cfg eligible asked))
  | .valueSet options custom cs => .valueSet options custom (cs.map (windowNode cfg eligible asked))
  | .chartReferences refs cs => .chartReferences refs (cs.map (windowNode cfg eligible asked))
  | .rowAction target row cs => .rowAction target row (cs.map (windowNode cfg eligible asked))
  | .section id title cs => .section id title (cs.map (windowNode cfg eligible asked))
  | .columns cs => .columns (cs.map (windowNode cfg eligible asked))
  | .tabs id labels selected cs => .tabs id labels selected (cs.map (windowNode cfg eligible asked))
  | node => node

/-- New specification for owner review: the windows of the paged lists under a node. -/
def windowsOf (cfg : Config) (eligible : String → String → Bool) (asked : String → Nat) : UiNode → List UiWindow
  | .info comp _ infoId _ rows =>
    if paged cfg eligible comp infoId rows then [windowOf cfg comp rows (asked comp)] else []
  | .board _ cs => cs.flatMap (windowsOf cfg (fun _ _ => false) asked)
  | .patientPane _ _ _ cs modal =>
    cs.flatMap (windowsOf cfg (fun _ _ => false) asked) ++ modal.flatMap (windowsOf cfg (fun _ _ => false) asked)
  | .datedTimeline _ _ _ cs | .timeline _ cs | .presentation _ cs | .valueSet _ _ cs
  | .chartReferences _ cs | .rowAction _ _ cs | .section _ _ cs | .columns cs | .tabs _ _ _ cs =>
    cs.flatMap (windowsOf cfg eligible asked)
  | _ => []

/-- New specification for owner review: the screen as the layout shows it.
Every paged list of the workspace and the side shows the page asked for (the
last page when a later one is asked), and the screen carries the windows, which
the display parts read (`Display.windowParts`). A screen without a list long
enough to page carries no windows. The modal and the urgent strip are never
paged. -/
def windowScreen (cfg : Config) (screen : UiScreen) : UiScreen :=
  if !cfg.enabled then screen else
  let ws := (screen.workspace ++ screen.side).flatMap (windowsOf cfg (eligibleIn screen) (askedIn screen))
  { screen with workspace := screen.workspace.map (windowNode cfg (eligibleIn screen) (askedIn screen)),
                side := screen.side.map (windowNode cfg (eligibleIn screen) (askedIn screen)),
                windows? := if ws.isEmpty then screen.windows? else some ws }

/-- The layout's entry: a screen that already carries windows is shown as it is. -/
def windowOnce (cfg : Config) (screen : UiScreen) : UiScreen :=
  if screen.windows?.isSome then screen else windowScreen cfg screen

/-- New specification for owner review: the view state after the pager selects
page `p` of list `comp`, as the renderer passes it on (`Render.uiPages`). -/
def askPage (screen : UiScreen) (comp : String) (p : Nat) : UiScreen :=
  { screen with pages? := some ((comp, p) :: (screen.pages?.getD []).filter (·.1 != comp)) }

/-! ## Pages: bounded, complete, in order -/

/-- New specification for owner review: a page holds at most `k` records. -/
theorem pageRows_length {α : Type} (rows : List α) (k p : Nat) : (pageRows rows k p).length ≤ k :=
  List.length_take_le _ _

/-- New specification for owner review: record `i` is on page `i / k`, at
position `i % k`. -/
theorem pageRows_get {α : Type} (rows : List α) (k i : Nat) (hk : 0 < k) :
    (pageRows rows k (i / k))[i % k]? = rows[i]? := by
  unfold pageRows
  rw [List.getElem?_take_of_lt (Nat.mod_lt i hk), List.getElem?_drop]
  congr 1
  have h := Nat.div_add_mod i k
  rw [Nat.mul_comm (i / k) k]
  omega

/-- New specification for owner review: record `i` lies in the positions of
exactly one page, page `i / k`. -/
theorem page_unique (k i p : Nat) (hk : 0 < k) : (p * k ≤ i ∧ i < p * k + k) ↔ p = i / k := by
  constructor
  · rintro ⟨lo,hi⟩
    have upper : i / k < p + 1 := by
      rw [Nat.div_lt_iff_lt_mul hk]; rw [Nat.succ_mul]; exact hi
    have lower : p ≤ i / k := (Nat.le_div_iff_mul_le hk).mpr lo
    omega
  · rintro rfl
    have h1 := Nat.div_add_mod i k
    have h2 := Nat.mod_lt i hk
    rw [Nat.mul_comm (i / k) k]
    omega

/-- A record's page is a page of the list. -/
theorem pageOf_lt (n k i : Nat) (hk : 0 < k) (hi : i < n) : i / k < pageCount n k := by
  unfold pageCount
  have h : (i / k + 1) * k ≤ n + k - 1 := by
    have := Nat.div_mul_le_self i k
    rw [Nat.succ_mul]; omega
  have := (Nat.le_div_iff_mul_le hk).mpr h
  omega

theorem clampPage_lt (n k p : Nat) : clampPage n k p < pageCount n k := by
  unfold clampPage pageCount; omega

theorem clampPage_of_lt (n k p : Nat) (hp : p < pageCount n k) : clampPage n k p = p := by
  unfold clampPage; omega

/-- The first `m` pages are the first `m * k` records. -/
theorem pages_prefix {α : Type} (rows : List α) (k : Nat) :
    ∀ m, (List.range m).flatMap (pageRows rows k) = rows.take (m * k)
  | 0 => by simp
  | m+1 => by
    rw [List.range_succ, List.flatMap_append, pages_prefix rows k m, Nat.succ_mul, List.take_add]
    simp [pageRows]

/-- New specification for owner review: the pages, in order, are the list:
every record is on exactly one page, in its order, and no record is invented. -/
theorem pages_cover {α : Type} (rows : List α) (k : Nat) (hk : 0 < k) :
    (List.range (pageCount rows.length k)).flatMap (pageRows rows k) = rows := by
  rw [pages_prefix]
  apply List.take_of_length_le
  unfold pageCount
  have h1 : rows.length ≤ (rows.length + k - 1) / k * k := by
    have e1 := Nat.div_add_mod (rows.length + k - 1) k
    have e2 := Nat.mod_lt (rows.length + k - 1) hk
    rw [Nat.mul_comm ((rows.length + k - 1) / k) k]
    omega
  have h2 : (rows.length + k - 1) / k * k ≤ max 1 ((rows.length + k - 1) / k) * k :=
    Nat.mul_le_mul_right k (Nat.le_max_right _ _)
  omega

/-! ## The pager reaches every page -/

/-- New specification for owner review: from the first page, `p` presses of the
next-page target reach page `p`; every page is reachable from the first. -/
theorem next_reaches (pages : Nat) : ∀ p, p < pages → (List.range p).foldl (fun q _ => nextPage pages q) 0 = p
  | 0, _ => rfl
  | p+1, hp => by
    rw [List.range_succ, List.foldl_append, next_reaches pages p (by omega)]
    simp [nextPage, hp]

/-- New specification for owner review: the page selector offers every page,
so one selection reaches any record's page from any page. -/
theorem selector_offers (w : UiWindow) (q : Nat) (hq : q < w.pages) :
    ∃ p ∈ pagerParts w, p.role = .pager ∧ p.target = true ∧ p.comp = w.comp ∧ p.kind = "page" ∧
      (toString q, pageOption w q) ∈ p.options := by
  refine ⟨_, List.mem_cons_of_mem _ (List.mem_cons_of_mem _ (List.mem_cons_of_mem _
    (List.mem_cons_of_mem _ (List.mem_cons_self)))), rfl, rfl, rfl, rfl, ?_⟩
  exact List.mem_map.mpr ⟨q, List.mem_range.mpr hq, rfl⟩

/-- New specification for owner review: the next-page target selects the next
page and is enabled exactly when there is one. -/
theorem next_target (w : UiWindow) :
    ∃ p ∈ pagerParts w, p.role = .pager ∧ p.target = true ∧ p.comp = w.comp ∧ p.kind = "next" ∧
      p.col = some (w.page + 1) ∧ (p.enabled = true ↔ w.page + 1 < w.pages) := by
  refine ⟨_, List.mem_cons_of_mem _ (List.mem_cons_of_mem _ (List.mem_cons_of_mem _ List.mem_cons_self)),
    rfl, rfl, rfl, rfl, rfl, by simp⟩

/-- New specification for owner review: every window says where it is,
"Records a–b of n". -/
theorem position_shown (w : UiWindow) :
    ∃ p ∈ pagerParts w, p.role = .position ∧ p.comp = w.comp ∧
      p.text = "Records " ++ toString (w.page * w.size + 1) ++ "–" ++
        toString (min w.total ((w.page + 1) * w.size)) ++ " of " ++ toString w.total :=
  ⟨_, List.mem_cons_self, rfl, rfl, rfl⟩

/-! ## Nothing flagged is buried -/

theorem mem_flaggedIndices (rows : List (List (String × String))) (i : Nat) :
    i ∈ flaggedIndices rows ↔ ∃ row, rows[i]? = some row ∧ flaggedRow row = true := by
  unfold flaggedIndices
  simp only [List.mem_filter, List.mem_range]
  constructor
  · rintro ⟨lt, flag⟩
    exact ⟨rows[i], by simp [lt], by simpa [lt] using flag⟩
  · rintro ⟨row, get, flag⟩
    have lt : i < rows.length := by
      rcases Nat.lt_or_ge i rows.length with h | h
      · exact h
      · simp [List.getElem?_eq_none h] at get
    exact ⟨lt, by simp [get, flag]⟩

private theorem cyclic_mem (pages p q : Nat) (hq : q < pages) : q ∈ cyclic pages p := by
  unfold cyclic
  simp only [List.mem_append, List.mem_filter, List.mem_range, decide_eq_true_eq]
  omega

/-- New specification for owner review: when a flagged record is off the page,
the next-flagged target selects another page that holds a flagged record. -/
theorem nextFlagged_found (rows : List (List (String × String))) (k pages p i : Nat)
    (flag : i ∈ flaggedIndices rows) (off : i / k ≠ p) (inside : i / k < pages) :
    ∃ q, nextFlagged rows k pages p = some q ∧ q ≠ p ∧ pageHasFlag rows k q = true := by
  have holds : (fun q => q != p && pageHasFlag rows k q) (i / k) = true := by
    simp only [Bool.and_eq_true, bne_iff_ne, ne_eq]
    exact ⟨off, List.any_eq_true.mpr ⟨i, flag, by simp⟩⟩
  obtain ⟨q, hq⟩ : ∃ q, (cyclic pages p).find? (fun q => q != p && pageHasFlag rows k q) = some q := by
    cases h : (cyclic pages p).find? (fun q => q != p && pageHasFlag rows k q) with
    | some q => exact ⟨q, rfl⟩
    | none => exact absurd holds (List.find?_eq_none.mp h (i / k) (cyclic_mem pages p _ inside))
  have sat := List.find?_some hq
  simp only [Bool.and_eq_true, bne_iff_ne, ne_eq] at sat
  exact ⟨q, hq, sat.1, sat.2⟩

/-- New specification for owner review: when the next-flagged target has no
page to select, every flagged record is on the page shown. -/
theorem nextFlagged_none (rows : List (List (String × String))) (k pages p : Nat)
    (none : nextFlagged rows k pages p = none) :
    ∀ i ∈ flaggedIndices rows, i / k < pages → i / k = p := by
  intro i flag inside
  apply Classical.byContradiction
  intro off
  obtain ⟨q, some, _⟩ := nextFlagged_found rows k pages p i flag off inside
  rw [none] at some; cases some

/-- New specification for owner review: the flagged count of other pages is
positive exactly when a flagged record is off the page. -/
theorem flaggedOff_pos (rows : List (List (String × String))) (k p : Nat) :
    0 < flaggedOff rows k p ↔ ∃ i ∈ flaggedIndices rows, i / k ≠ p := by
  unfold flaggedOff
  rw [List.length_pos_iff_exists_mem]
  simp only [List.mem_filter, bne_iff_ne, ne_eq, decide_eq_true_eq]

/-- New specification for owner review: nothing flagged is buried. Whatever
page a list shows, either every flagged record is on it, or its window counts
the flagged records on other pages (a positive number) and its next-flagged
target is enabled and selects another page that holds one. -/
theorem nothing_buried (cfg : Config) (comp : String) (rows : List (List (String × String))) (asked : Nat) :
    let w := windowOf cfg comp rows asked
    (∀ i ∈ flaggedIndices rows, i / w.size = w.page) ∨
    (0 < w.flaggedElsewhere ∧ ∃ q, w.nextFlagged? = some q ∧ q ≠ w.page ∧ pageHasFlag rows w.size q = true ∧
      ∃ p ∈ pagerParts w, p.role = .pager ∧ p.target = true ∧ p.enabled = true ∧ p.comp = comp ∧ p.col = some q) := by
  intro w
  by_cases all : ∀ i ∈ flaggedIndices rows, i / w.size = w.page
  · exact .inl all
  · refine .inr ?_
    have exists_off : ∃ i ∈ flaggedIndices rows, i / w.size ≠ w.page :=
      Classical.byContradiction fun none => all fun i flag =>
        Classical.byContradiction fun off => none ⟨i, flag, off⟩
    obtain ⟨i, flag, off⟩ := exists_off
    have hi : i < rows.length := by
      obtain ⟨row, get, _⟩ := (mem_flaggedIndices rows i).mp flag
      rcases Nat.lt_or_ge i rows.length with h | h
      · exact h
      · simp [List.getElem?_eq_none h] at get
    have inside : i / w.size < w.pages := pageOf_lt rows.length w.size i (sizeOf_pos cfg comp) hi
    obtain ⟨q, found, ne, has⟩ := nextFlagged_found rows w.size w.pages w.page i flag off inside
    refine ⟨(flaggedOff_pos rows w.size w.page).mpr ⟨i, flag, off⟩, q, found, ne, has, ?_⟩
    refine ⟨_, List.mem_cons_of_mem _ (List.mem_cons_of_mem _ (List.mem_cons_of_mem _
      (List.mem_cons_of_mem _ (List.mem_cons_of_mem _ List.mem_cons_self)))), rfl, rfl, ?_, rfl, ?_⟩
    · show (w.nextFlagged?).isSome = true
      rw [show w.nextFlagged? = some q from found]; rfl
    · show some ((w.nextFlagged?).getD w.page) = some q
      rw [show w.nextFlagged? = some q from found]; rfl

/-- New specification for owner review: the window's page, page count and size
are those of its list. -/
theorem windowOf_spec (cfg : Config) (comp : String) (rows : List (List (String × String))) (asked : Nat) :
    let w := windowOf cfg comp rows asked
    w.comp = comp ∧ w.size = cfg.sizeOf comp ∧ w.total = rows.length ∧
      w.pages = pageCount rows.length (cfg.sizeOf comp) ∧ w.page < w.pages ∧
      (asked < w.pages → w.page = asked) ∧ w.flaggedElsewhere = flaggedOff rows w.size w.page :=
  ⟨rfl, rfl, rfl, rfl, clampPage_lt _ _ _, clampPage_of_lt _ _ _, rfl⟩

/-! ## A paged list node -/

/-- New specification for owner review: a paged list shows at most its page
size of records, and they are the records of the page shown. -/
theorem windowNode_info (cfg : Config) (eligible : String → String → Bool) (asked : String → Nat)
    (comp label infoId display : String) (rows : List (List (String × String)))
    (h : paged cfg eligible comp infoId rows = true) :
    windowNode cfg eligible asked (.info comp label infoId display rows) =
      .info comp label infoId display (pageRows rows (cfg.sizeOf comp) (windowOf cfg comp rows (asked comp)).page) ∧
    (pageRows rows (cfg.sizeOf comp) (windowOf cfg comp rows (asked comp)).page).length ≤ cfg.sizeOf comp := by
  refine ⟨by simp [windowNode, h, windowOf], pageRows_length _ _ _⟩

/-- New specification for owner review: when the view state asks for the page
of record `i`, the paged list shows record `i` at position `i % k`, with every
cell of it a display part at its row and column: the record's complete value,
and its caption in the header row or beside it. -/
theorem record_shown (cfg : Config) (cx : DisplayCx) (eligible : String → String → Bool) (asked : String → Nat)
    (comp label infoId display : String) (rows : List (List (String × String)))
    (h : paged cfg eligible comp infoId rows = true)
    (i : Nat) (row : List (String × String)) (hi : rows[i]? = some row)
    (ask : asked comp = i / cfg.sizeOf comp)
    (c : Nat) (cell : String × String) (hc : row[c]? = some cell) :
    ∃ p ∈ leafParts cx (windowNode cfg eligible asked (.info comp label infoId display rows)),
      p.row = some (i % cfg.sizeOf comp) ∧ p.col = some c ∧ p.raw = cell.2 ∧
      p.text = Format.cellText infoId row cell.1 cell.2 ∧ p.role = (cellRole cell.1 cell.2).1 := by
  have hk := sizeOf_pos cfg comp
  have lt : i < rows.length := by
    rcases Nat.lt_or_ge i rows.length with l | l
    · exact l
    · simp [List.getElem?_eq_none l] at hi
  have page : (windowOf cfg comp rows (asked comp)).page = i / cfg.sizeOf comp := by
    show clampPage rows.length (cfg.sizeOf comp) (asked comp) = _
    rw [ask]; exact clampPage_of_lt _ _ _ (pageOf_lt _ _ _ hk lt)
  rw [(windowNode_info cfg eligible asked comp label infoId display rows h).1, page]
  have get : (pageRows rows (cfg.sizeOf comp) (i / cfg.sizeOf comp))[i % cfg.sizeOf comp]? = some row := by
    rw [pageRows_get rows _ i hk, hi]
  exact (info_complete cx comp label infoId display _ (i % cfg.sizeOf comp) c row cell get hc).2.2.1

/-- New specification for owner review: a record is not on a page other than its own. -/
theorem record_off_page {α : Type} (rows : List α) (k i p : Nat) (hk : 0 < k) (other : p ≠ i / k) (j : Nat)
    (hj : j < (pageRows rows k p).length) : p * k + j ≠ i := by
  intro same
  have : j < k := Nat.lt_of_lt_of_le hj (pageRows_length rows k p)
  exact other ((page_unique k i p hk).mp ⟨by omega, by omega⟩)

#print axioms sizeOf_pos
#print axioms sizeOf_le
#print axioms pageRows_length
#print axioms pageRows_get
#print axioms page_unique
#print axioms pageOf_lt
#print axioms clampPage_lt
#print axioms clampPage_of_lt
#print axioms pages_prefix
#print axioms pages_cover
#print axioms next_reaches
#print axioms selector_offers
#print axioms next_target
#print axioms position_shown
#print axioms mem_flaggedIndices
#print axioms cyclic_mem
#print axioms nextFlagged_found
#print axioms nextFlagged_none
#print axioms flaggedOff_pos
#print axioms nothing_buried
#print axioms windowOf_spec
#print axioms windowNode_info
#print axioms record_shown
#print axioms record_off_page
end Ehr.Layout.Window
