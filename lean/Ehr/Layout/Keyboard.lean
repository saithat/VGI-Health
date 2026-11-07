import Lean
/-! Single-select, non-editable APG profiles. Optional deletion, popup menus,
multiselection and editable grid cells are not added by this library.
Normative profiles: https://www.w3.org/WAI/ARIA/apg/patterns/
{tabs,dialog-modal,listbox,grid}/ (consulted 2026-11-06). -/
namespace Ehr.Layout.Keyboard
open Lean
inductive Key | left | right | up | down | home | «end» | ctrlHome | ctrlEnd
  | enter | space | tab | shiftTab | escape
  deriving Repr, DecidableEq, ToJson, FromJson, Inhabited

def next (n i : Nat) := if i+1 < n then i+1 else 0
def prev (n i : Nat) := if i = 0 then n-1 else i-1

structure State where
  focus : Nat := 0
  selected : Nat := 0
  isOpen : Bool := true
  /-- Focus destination on close; retained from the invoking control. -/
  invoker : String := ""
  deriving Repr, DecidableEq, ToJson, FromJson

/-- Manual activation, horizontal tabs. Up/down remain browser scroll keys;
Tab exits the composite; entry focuses the selected tab. -/
def tabs (n : Nat) (s : State) (key : Key) : State := match key with
  | .left => { s with focus := prev n s.focus }
  | .right => { s with focus := next n s.focus }
  | .home => { s with focus := 0 }
  | .end => { s with focus := n-1 }
  | .enter | .space => { s with selected := s.focus }
  | _ => s

def tabsEntry (s : State) := { s with focus := s.selected }

/-- Single-selection listbox with selection following focus. No wrap at ends. -/
def listbox (n : Nat) (s : State) (key : Key) : State :=
  let f := match key with
    | .up => s.focus-1 | .down => min (n-1) (s.focus+1)
    | .home => 0 | .end => n-1 | _ => s.focus
  { s with focus := f, selected := f }

/-- Rectangular data grid: row edges do not wrap; Home/End act within a row;
Control+Home/End address the entire grid. Tab exits the one-tab-stop grid. -/
def grid (rows cols : Nat) (s : State) (key : Key) : State :=
  let c := max 1 cols
  let row := s.focus / c
  let col := s.focus % c
  let f := match key with
    | .left => row*c+(col-1)
    | .right => row*c+min (c-1) (col+1)
    | .up => (row-1)*c+col
    | .down => min (rows-1) (row+1)*c+col
    | .home => row*c | .end => row*c+c-1
    | .ctrlHome => 0 | .ctrlEnd => rows*c-1
    | _ => s.focus
  { s with focus := f }

/-- Modal dialogs trap both Tab directions, Escape closes, and the invoker is
retained for focus restoration. Opening starts inside at index zero. -/
def dialog (n : Nat) (s : State) (key : Key) : State := match key with
  | .tab => { s with focus := next n s.focus }
  | .shiftTab => { s with focus := prev n s.focus }
  | .escape => { s with isOpen := false }
  | _ => s

def openDialog (invoker : String) : State := { invoker }
def closeDestination (s : State) : Option String := if s.isOpen then none else some s.invoker

theorem next_inside (n i : Nat) (h : 0 < n) : next n i < n := by
  unfold next; split <;> omega

theorem prev_inside (n i : Nat) (h : 0 < n) (hi : i < n) : prev n i < n := by
  unfold prev; split <;> omega

theorem tabs_arrows_manual (n s) :
    (tabs n s .left).selected = s.selected ∧ (tabs n s .right).selected = s.selected := by
  exact ⟨rfl,rfl⟩
theorem tabs_activate (n s) :
    (tabs n s .enter).selected = s.focus ∧ (tabs n s .space).selected = s.focus := by
  exact ⟨rfl,rfl⟩
theorem tabs_entry_active (s) : (tabsEntry s).focus = s.selected := rfl

theorem tabs_preserves (n s k) (h : 0 < n) (hf : s.focus < n) (hs : s.selected < n) :
    (tabs n s k).focus < n ∧ (tabs n s k).selected < n := by
  cases k <;> simp_all [tabs, next_inside, prev_inside]
  all_goals omega

theorem listbox_follows_focus (n s k) : (listbox n s k).selected = (listbox n s k).focus := rfl

theorem listbox_preserves (n s k) (h : 0 < n) (hf : s.focus < n) :
    (listbox n s k).focus < n := by
  cases k <;> simp [listbox] <;> omega

theorem dialog_traps (n s) (h : 0 < n) (hf : s.focus < n) :
    (dialog n s .tab).focus < n ∧ (dialog n s .shiftTab).focus < n := by
  exact ⟨next_inside _ _ h,prev_inside _ _ h hf⟩
theorem dialog_escape_restores (n s) :
    closeDestination (dialog n s .escape) = some s.invoker := rfl

theorem grid_right_stays_row (rows cols s) (hc : 0 < cols) :
    (grid rows cols s .right).focus / cols = s.focus / cols := by
  have hc' : max 1 cols = cols := by omega
  simp only [grid, hc']
  rw [Nat.add_comm, Nat.add_mul_div_right _ _ hc]
  have hm : min (cols-1) (s.focus % cols+1) < cols := by omega
  simp [Nat.div_eq_of_lt hm]

theorem grid_home (rows cols s) :
    (grid rows cols s .ctrlHome).focus = 0 := rfl

private theorem cell_inside (rows cols r c : Nat) (hr : r < rows) (hc : c < cols) :
    r*cols+c < rows*cols := by
  have hm := Nat.mul_le_mul_right cols (Nat.succ_le_of_lt hr)
  simp only [Nat.succ_mul] at hm
  omega

theorem grid_preserves (rows cols s k) (hr : 0 < rows) (hc : 0 < cols)
    (hf : s.focus < rows*cols) : (grid rows cols s k).focus < rows*cols := by
  have hc' : max 1 cols = cols := by omega
  have rowBound : s.focus / cols < rows := (Nat.div_lt_iff_lt_mul hc).mpr hf
  have colBound := Nat.mod_lt s.focus hc
  have positive := Nat.mul_pos hr hc
  cases k <;> simp only [grid, hc']
  · apply cell_inside <;> omega
  · apply cell_inside <;> omega
  · apply cell_inside <;> omega
  · apply cell_inside <;> omega
  · have := cell_inside rows cols (s.focus/cols) 0 rowBound hc
    simpa using this
  · have := cell_inside rows cols (s.focus/cols) (cols-1) rowBound (by omega)
    omega
  · exact positive
  · omega
  all_goals exact hf

theorem dialog_opens_inside (invoker) : (openDialog invoker).focus = 0 ∧
    (openDialog invoker).isOpen = true := ⟨rfl,rfl⟩


def keys : List Key := [.left,.right,.up,.down,.home,.end,.ctrlHome,.ctrlEnd,.enter,.space,.tab,.shiftTab,.escape]

/-- Native transition tables can be consumed by a painter without duplicating
these semantics in JavaScript. -/
def table (profile : String) (rows cols : Nat) : List (Nat × Key × State) :=
  (List.range (rows*cols)).flatMap fun focus => keys.map fun key =>
    let s : State := { focus, selected := focus }
    (focus,key,match profile with
      | "tabs" => tabs (rows*cols) s key
      | "listbox" => listbox (rows*cols) s key
      | "dialog" => dialog (rows*cols) s key
      | _ => grid rows cols s key)

#print axioms next_inside
#print axioms prev_inside
#print axioms cell_inside
#print axioms tabs_arrows_manual
#print axioms tabs_activate
#print axioms tabs_entry_active
#print axioms tabs_preserves
#print axioms listbox_follows_focus
#print axioms listbox_preserves
#print axioms dialog_traps
#print axioms dialog_escape_restores
#print axioms grid_right_stays_row
#print axioms grid_home
#print axioms grid_preserves
#print axioms dialog_opens_inside
end Ehr.Layout.Keyboard
