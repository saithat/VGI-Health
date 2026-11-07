import Ehr.Layout.Types
import Ehr.Layout.Fonts
namespace Ehr.Layout
open Lean

def glyphWidth : List (Nat × Nat) → Nat → Nat
  | [], _ => 0
  | (code,width)::rest, cp => if code = cp then width else glyphWidth rest cp

def maxWidth (table : List (Nat × Nat)) : Nat := table.foldr (fun p acc => max p.2 acc) 0

theorem glyphWidth_le (table : List (Nat × Nat)) (cp : Nat) : glyphWidth table cp ≤ maxWidth table := by
  induction table with
  | nil => simp [glyphWidth, maxWidth]
  | cons p rest ih =>
    simp only [maxWidth] at ih
    simp only [glyphWidth, maxWidth, List.foldr_cons]
    split <;> omega

/-- Bounded binary lookup in the generated sorted repertoire. Missing entries
never delegate measurement to a system font. Zero advances remain distinguishable
from missing glyphs. The generator checks order, uniqueness and maximum advance. -/
def glyphLookup (table : Array (Nat × Nat)) (cp : Nat) : Nat → Nat → Nat → Option Nat
  | 0, _, _ => none
  | fuel+1, lo, hi =>
    if lo < hi then
      let mid := (lo+hi)/2
      match table[mid]? with
      | none => none
      | some (code,width) => if cp == code then some width
        else if cp < code then glyphLookup table cp fuel lo mid
        else glyphLookup table cp fuel (mid+1) hi
    else none

def rangeLookup (cp : Nat) : Nat → Nat → Nat → Option Nat
  | 0, _, _ => none
  | fuel+1, lo, hi =>
    if lo < hi then
      let mid := (lo+hi)/2
      match Fonts.fallbackRanges[mid]? with
      | none => none
      | some (first,last,width) => if first ≤ cp && cp ≤ last then some width
        else if cp < first then rangeLookup cp fuel lo mid
        else rangeLookup cp fuel (mid+1) hi
    else none

def pinnedWidth (t : TextSlot) (ch : Char) : Option Nat :=
  let table := Fonts.tables[t.font]?.getD #[]
  (glyphLookup table ch.toNat (table.size+1) 0 table.size).orElse fun _ =>
    if t.font < 6 then rangeLookup ch.toNat (Fonts.fallbackRanges.size+1) 0 Fonts.fallbackRanges.size
    else none

/-- Integer advances round upward at 1/64 px. The generated maximum is also
an explicit defensive cap; generation verifies it against every table entry. -/
def advance (t : TextSlot) (ch : Char) : Nat :=
  let units := Fonts.unitsPerEm[t.font]?.getD 1000
  let maximum := Fonts.maxAdvance[t.font]?.getD 0
  (min maximum ((pinnedWidth t ch).getD 0) * t.fontSize + units - 1) / units

def supported (t : TextSlot) (ch : Char) : Bool :=
  (ch == '\n' && t.overflow == .scroll) || (pinnedWidth t ch).isSome

/-- The escape alphabet is deliberately finite and uses only pinned glyphs. -/
def escapeAlphabet : List Char := "[U+0123456789ABCDEF]".toList

def escapeReady (t : TextSlot) : Bool := escapeAlphabet.all (supported t)

def hexChar : Nat → Char
  | 0 => '0' | 1 => '1' | 2 => '2' | 3 => '3' | 4 => '4'
  | 5 => '5' | 6 => '6' | 7 => '7' | 8 => '8' | 9 => '9'
  | 10 => 'A' | 11 => 'B' | 12 => 'C' | 13 => 'D' | 14 => 'E' | _ => 'F'

def codepointInk (ch : Char) : List Char :=
  ['[','U','+'] ++ ((List.range 6).map fun i => hexChar ((ch.toNat / 16^(5-i)) % 16)) ++ [']']

/-- Every input code point has its own atom, even when its visible spelling is
an explicit escape. `original` is also emitted to the painter/ARIA label. -/
structure TextAtom where
  original : Char
  ink : List Char
  deriving Repr

def textAtom (t : TextSlot) (ch : Char) : TextAtom :=
  ⟨ch, if supported t ch then [ch] else codepointInk ch⟩

def textAtoms (t : TextSlot) (s : String) : List TextAtom := s.toList.map (textAtom t)

def paintText (t : TextSlot) (s : String) : String :=
  if t.safety then String.ofList ((textAtoms t s).flatMap TextAtom.ink) else s

theorem textAtoms_preserve (t : TextSlot) (s : String) :
    (textAtoms t s).map TextAtom.original = s.toList := by
  simp [textAtoms, textAtom, List.map_map, Function.comp_def]

theorem hexChar_mem (n : Nat) : hexChar n ∈ escapeAlphabet := by
  unfold hexChar
  split <;> simp [escapeAlphabet]

theorem codepointInk_supported (t : TextSlot) (ready : escapeReady t = true) (ch : Char) :
    ∀ c ∈ codepointInk ch, supported t c = true := by
  have hr := List.all_eq_true.mp ready
  intro c hc
  apply hr c
  simp only [codepointInk, List.mem_append, List.mem_cons, List.not_mem_nil, or_false] at hc
  rcases hc with ((rfl | rfl | rfl) | hm) | rfl
  all_goals try { simp [escapeAlphabet] }
  · obtain ⟨i,_,rfl⟩ := List.mem_map.mp hm
    exact hexChar_mem _

theorem paintText_supported (t : TextSlot) (s : String)
    (safety : t.safety = true) (ready : escapeReady t = true) :
    ∀ c ∈ (paintText t s).toList, supported t c = true := by
  simp only [paintText, safety, ↓reduceIte, String.toList_ofList, textAtoms, List.flatMap_map]
  intro c hc
  obtain ⟨ch,_,hi⟩ := List.mem_flatMap.mp hc
  unfold textAtom at hi
  split at hi
  next hs => simpa using (List.mem_singleton.mp hi ▸ hs)
  next hs => exact codepointInk_supported t ready ch c hi

def cell (t : TextSlot) : Nat :=
  let units := Fonts.unitsPerEm[t.font]?.getD 1000
  (Fonts.maxAdvance[t.font]?.getD 0 * t.fontSize + units - 1) / units

theorem advance_le_cell (t : TextSlot) (ch : Char) : advance t ch ≤ cell t := by
  unfold advance cell
  apply Nat.div_le_div_right
  have := Nat.mul_le_mul_right t.fontSize
    (Nat.min_le_left (Fonts.maxAdvance[t.font]?.getD 0) ((pinnedWidth t ch).getD 0))
  omega

def capacity (t : TextSlot) (w : Nat) : Nat := w / max 1 (cell t)

/-- Total chunking with an explicit line budget. -/
def chunks (cols : Nat) : Nat → List Char → List (List Char)
  | 0, _ => []
  | n+1, chars => chars.take cols :: chunks cols n (chars.drop cols)

theorem chunks_complete (cols n : Nat) (chars : List Char)
    (h : chars.length ≤ n*cols) : (chunks cols n chars).flatten = chars := by
  induction n generalizing chars with
  | zero =>
    have : chars = [] := List.length_eq_zero_iff.mp (by omega)
    simp [chunks, this]
  | succ n ih =>
    simp only [chunks, List.flatten_cons]
    rw [ih]
    exact List.take_append_drop cols chars
    simp only [List.length_drop]
    rw [Nat.succ_mul] at h
    omega

/-- Advance-based line breaking for scroll content. The recursion consumes one
character at each step; long words break without dropping characters. -/
def greedyLines (t : TextSlot) (w : Nat) : List Char → List Char → Nat → List (List Char)
  | [], line, _ => [line]
  | ch::rest, line, used =>
    if line.isEmpty || used+advance t ch ≤ w then
      greedyLines t w rest (line++[ch]) (used+advance t ch)
    else line :: greedyLines t w rest [ch] (advance t ch)

theorem greedy_complete (t w chars line used) :
    (greedyLines t w chars line used).flatten = line++chars := by
  induction chars generalizing line used with
  | nil => simp [greedyLines]
  | cons ch rest ih =>
    simp only [greedyLines]
    split <;> simp [ih, List.append_assoc]

def scrollParagraphs (t : TextSlot) (w : Nat) (s : String) : List (List String) :=
  (s.splitOn "\n").map fun paragraph => (greedyLines t w paragraph.toList [] 0).map String.ofList

/-- Character wrapping also handles unbroken drug names. Truncation is explicit;
scroll preserves all characters and reserves only a fixed viewport. -/
def textLines (t : TextSlot) (w : Nat) (s : String) : List String :=
  let cols := max 1 (capacity t w)
  let chars := s.toList
  if t.overflow == .scroll then
    (scrollParagraphs t w s).flatten
  else
  let count := t.maxLines
  if t.overflow == .ellipsis then
    (chunks cols count chars).mapIdx fun i line =>
      if i + 1 == count && chars.length > count*cols
      then String.ofList (line.take (cols-1) ++ ['…']) else String.ofList line
  else (chunks cols count chars).map String.ofList

theorem wrap_complete (t : TextSlot) (w : Nat) (s : String)
    (policy : t.overflow = .wrap)
    (bound : s.toList.length ≤ t.maxLines * max 1 (capacity t w)) :
    ((textLines t w s).map String.toList).flatten = s.toList := by
  simp only [textLines, policy]
  simpa using chunks_complete (max 1 (capacity t w)) t.maxLines s.toList bound

def textAdvance (t : TextSlot) (chars : List Char) : Nat := (chars.map (advance t)).sum

theorem textAdvance_bound (t : TextSlot) (chars : List Char) :
    textAdvance t chars ≤ chars.length * cell t := by
  induction chars with
  | nil => simp [textAdvance]
  | cons ch chars ih =>
    have hc := advance_le_cell t ch
    simp only [textAdvance, List.map_cons, List.sum_cons, List.length_cons, Nat.succ_mul] at *
    omega

theorem greedy_width (t w chars current used)
    (measured : textAdvance t current = used) (fits : used ≤ w)
    (glyphs : ∀ ch ∈ chars, advance t ch ≤ w) :
    ∀ line ∈ greedyLines t w chars current used, textAdvance t line ≤ w := by
  induction chars generalizing current used with
  | nil => simpa only [greedyLines, List.mem_singleton, forall_eq] using (measured ▸ fits)
  | cons ch rest ih =>
    have hg := glyphs ch (by simp)
    have hr : ∀ c ∈ rest, advance t c ≤ w := fun c hc => glyphs c (by simp [hc])
    simp only [greedyLines]
    split
    next h =>
      have sumFits : used+advance t ch ≤ w := by
        simp only [Bool.or_eq_true, List.isEmpty_iff, decide_eq_true_eq] at h
        rcases h with empty | bound
        · simp only [empty, textAdvance, List.map_nil, List.sum_nil] at measured
          omega
        · exact bound
      apply ih (current++[ch]) (used+advance t ch) _ sumFits hr
      simpa [textAdvance, List.sum_append] using congrArg (fun n => n+advance t ch) measured
    next h =>
      intro line hl
      simp only [List.mem_cons] at hl
      rcases hl with rfl | hl
      · omega
      · apply ih [ch] (advance t ch) _ hg hr line hl
        simp [textAdvance]

/-- Every paragraph is preserved, with no length or line-count premise. Soft
wraps are distinct from the retained hard paragraph boundaries. -/
theorem scroll_complete (t w s) :
    (scrollParagraphs t w s).map (fun lines => (lines.map String.toList).flatten) =
      (s.splitOn "\n").map String.toList := by
  simp [scrollParagraphs, List.map_map, Function.comp_def, greedy_complete]

theorem chunks_short (cols n chars) : ∀ line ∈ chunks cols n chars, line.length ≤ cols := by
  induction n generalizing chars with
  | zero => simp [chunks]
  | succ n ih =>
    intro line hl
    simp only [chunks, List.mem_cons] at hl
    rcases hl with rfl | hl
    · simpa only [List.length_take] using Nat.min_le_left cols chars.length
    · exact ih _ line hl

theorem wrap_line_width (t : TextSlot) (w : Nat) (s line : String)
    (policy : t.overflow = .wrap) (nonzero : 0 < capacity t w)
    (member : line ∈ textLines t w s) : textAdvance t line.toList ≤ w := by
  have hc : max 1 (capacity t w) = capacity t w := by omega
  simp only [textLines, policy] at member
  simp only [hc] at member
  obtain ⟨chars,hm,rfl⟩ := List.mem_map.mp member
  have lengthBound := chunks_short (capacity t w) t.maxLines s.toList chars hm
  have adv := textAdvance_bound t chars
  have mulBound := Nat.mul_le_mul_right (cell t) lengthBound
  have cellBound := Nat.mul_le_mul_left (capacity t w) (Nat.le_max_right 1 (cell t))
  have divBound := Nat.div_mul_le_self w (max 1 (cell t))
  simp only [String.toList_ofList]
  change capacity t w * max 1 (cell t) ≤ w at divBound
  omega

theorem scroll_line_width (t : TextSlot) (w : Nat) (s line : String)
    (policy : t.overflow = .scroll) (nonzero : 0 < capacity t w)
    (member : line ∈ textLines t w s) : textAdvance t line.toList ≤ w := by
  have denBound : max 1 (cell t) ≤ w := by
    by_cases h : max 1 (cell t) ≤ w
    · exact h
    · have hz : w / max 1 (cell t) = 0 := Nat.div_eq_of_lt (by omega)
      simp [capacity, hz] at nonzero
  have hg : ∀ ch : Char, advance t ch ≤ w := fun ch => Nat.le_trans (advance_le_cell t ch) (by omega)
  simp only [textLines, policy, beq_self_eq_true, ↓reduceIte] at member
  obtain ⟨paragraphLines,hp,hl⟩ := List.mem_flatten.mp member
  obtain ⟨paragraph,_,rfl⟩ := List.mem_map.mp hp
  obtain ⟨chars,hc,rfl⟩ := List.mem_map.mp hl
  simpa only [String.toList_ofList] using
    greedy_width t w paragraph.toList [] 0 (by simp [textAdvance]) (by omega) (fun ch _ => hg ch) chars hc

def wanted (s : Sizing) (limit natural : Nat) : Nat := match s with
  | .hug => natural | .fill => limit | .fixed n => n

def shift (dx dy : Int) (clip : Option (String × Rect)) : Tree → Tree
  | ⟨p,kids⟩ =>
    let r := p.rect
    let inherited := p.clip.map fun c => { c with x := c.x+dx, y := c.y+dy }
    ⟨{ p with rect := { r with x := r.x+dx, y := r.y+dy }, clip := inherited.or (clip.map Prod.snd), clips := p.clips.map (fun (id,c) => (id,{ c with x := c.x+dx, y := c.y+dy })) ++ clip.toList },
      kids.map (shift dx dy clip)⟩

theorem shift_rect (dx dy clip) (t : Tree) :
    (shift dx dy clip t).box.rect = { t.box.rect with x := t.box.rect.x+dx, y := t.box.rect.y+dy } := by
  cases t
  simp only [shift]

/-- Column placement is shared by frames, vertical stacks and scroll content. -/
def column (s : Style) (w y : Nat) : List Tree → List Tree
  | [] => []
  | k::ks =>
    let x := match s.align with
      | .start => 0 | .center => (w-k.box.rect.w)/2 | .end => w-k.box.rect.w
    shift (x+s.padding) (y+s.padding) none k :: column s w (y+k.box.rect.h+s.gap) ks

theorem column_floor (s w y ks) (zero : ∀ k ∈ ks, k.box.rect.y = 0) :
    ∀ k ∈ column s w y ks, (y+s.padding : Nat) ≤ k.box.rect.y := by
  induction ks generalizing y with
  | nil => simp [column]
  | cons k ks ih =>
    intro q hq
    simp only [column, List.mem_cons] at hq
    rcases hq with rfl | hq
    · rw [shift_rect]
      have := zero k (by simp)
      simp [this]
    · have hz : ∀ k ∈ ks, k.box.rect.y = 0 := fun a ha => zero a (by simp [ha])
      have := ih (y+k.box.rect.h+s.gap) hz q hq
      omega

/-- Vertical stacking never overlaps, for arbitrary child heights, padding,
and gap. The same separation survives any scroll offset (`scroll_apart`). -/
theorem column_apart (s w y ks) (zero : ∀ k ∈ ks, k.box.rect.y = 0) :
    (column s w y ks).Pairwise (fun a b => Apart a.box.rect b.box.rect) := by
  induction ks generalizing y with
  | nil => simp [column]
  | cons k ks ih =>
    have hz : ∀ k ∈ ks, k.box.rect.y = 0 := fun a ha => zero a (by simp [ha])
    simp only [column, List.pairwise_cons]
    constructor
    · intro q hq
      have bound := column_floor s w (y+k.box.rect.h+s.gap) ks hz q hq
      apply Or.inr
      apply Or.inr
      apply Or.inl
      rw [shift_rect]
      have hzero := zero k (by simp)
      simp only [Rect.bottom, hzero]
      omega
    · exact ih _ hz

def gridTracks (s : Style) : List Track :=
  if s.tracks.isEmpty then List.replicate (max 1 s.columns) (.fr 1) else s.tracks

def trackWidths (s : Style) (w : Nat) : List Nat :=
  let tracks := gridTracks s
  let fixed := (tracks.map fun t => match t with | .fixed n => n | _ => 0).sum
  let weights := (tracks.map fun t => match t with | .fr n => n | _ => 0).sum
  let remaining := w - (tracks.length-1)*s.gap - fixed
  tracks.map fun t => match t with
    | .fixed n => n
    | .fr weight => remaining*weight / max 1 weights

/-- Place siblings in one forward pass. Free absolute positions remain free.
Grid tracks can mix fixed units and weighted fractional shares. A wrapping row starts a new
line before exceeding available width. -/
def arrange (kind : Kind) (s : Style) (w : Nat) (kids : List Tree) : List Tree :=
  if kind == .frame || kind == .scroll || kind == .stack .column then column s w 0 kids else Id.run do
  let mut x := 0
  let mut y := 0
  let mut rowH := 0
  let mut index := 0
  let mut out := []
  for k in kids do
    let r := k.box.rect
    let mut px := x
    let mut py := y
    match kind with
    | .absolute => px := k.box.style.position.x.toNat; py := k.box.style.position.y.toNat
    | .grid =>
      let widths := trackWidths s w
      let cols := max 1 widths.length
      px := (widths.take (index % cols)).sum + (index % cols)*s.gap
      if index % cols == 0 && index > 0 then y := y+rowH+s.gap; rowH := 0
      py := y
      rowH := max rowH r.h
    | .stack .row =>
      if s.wrap && x > 0 && x+r.w > w then x := 0; y := y+rowH+s.gap; rowH := 0
      px := x; py := y
      x := x+r.w+s.gap
      rowH := max rowH r.h
    | _ =>
      px := match s.align with
        | .start => 0 | .center => (w-r.w)/2 | .end => w-r.w
      py := y
      y := y+r.h+s.gap
    let dx : Int := if kind == .absolute then k.box.style.position.x else px
    let dy : Int := if kind == .absolute then k.box.style.position.y else py
    out := shift (dx+s.padding) (dy+s.padding) none k :: out
    index := index+1
  return out.reverse

def markParent (id : String) : Tree → Tree
  | ⟨p,kids⟩ => ⟨{ p with parents := p.parents ++ [id] },kids.map (markParent id)⟩

/-- Constraints down, sizes up, parent positions children. Each node is visited
once by layout (translation/flattening are separate structural traversals).
The checker detects clipped children rather than silently resizing their text. -/
def layout (c : Constraints) : Node → Tree
  | .box kind s m children =>
    let cw := min c.max.w s.max.w
    let width := wanted s.width cw cw
    let innerW := width - 2*s.padding
    let widths := if kind == .grid then trackWidths s innerW else [innerW]
    let measurements := children.map fun child => fun childW : Nat =>
      layout ⟨{},⟨childW,1000000000⟩⟩ child
    let kids := measurements.mapIdx fun i measure => measure (widths[i % max 1 widths.length]?.getD 0)
    let positioned := arrange kind s innerW kids
    let naturalH := positioned.foldl (fun h k => max h k.box.rect.bottom.toNat) s.padding + s.padding
    let textH := (m.text.map fun t => t.maxLines*t.lineHeight).getD 0
    let naturalW := positioned.foldl (fun w k => max w k.box.rect.right.toNat) s.padding + s.padding
    let textW := (m.text.map fun t => min width (t.maxLength * cell t)).getD 0
    let natural := { w := max textW naturalW, h := max textH naturalH : Size }
    let requested := { w := max s.min.w (min s.max.w (wanted s.width cw natural.w)),
                       h := max s.min.h (min s.max.h (wanted s.height c.max.h natural.h)) : Size }
    let size := constrain c requested
    let rect := { w := size.w, h := size.h : Rect }
    let clip := if kind == .scroll then some (m.id,rect) else none
    ⟨⟨rect,s,m,none,kind == .scroll,[],[]⟩, positioned.map (fun t => markParent m.id (shift 0 0 clip t))⟩

theorem layout_satisfies (c : Constraints) (n : Node) (h : c.Valid) :
    Satisfies ⟨(layout c n).box.rect.w,(layout c n).box.rect.h⟩ c := by
  cases n
  simp only [layout]
  exact constrain_satisfies _ _ h

def flatten : Tree → List Placed
  | ⟨p,kids⟩ => p :: kids.flatMap flatten

def boxes (v : Size) (n : Node) : List Placed := flatten (layout ⟨{},v⟩ n)

structure Drawn where
  box : Placed
  lines : List String
  original : Option String := none
  deriving Repr, FromJson

/-- The painter places each scalar in the exact integer cell used by wrapping.
This avoids accumulating fractional browser advances across long mixed runs. -/
instance : ToJson Drawn where
  toJson d := Json.mkObj [("box",toJson d.box),("lines",toJson d.lines),
    ("original",toJson d.original),("glyphWidths",toJson
      (d.lines.map fun line => line.toList.map fun ch =>
        (d.box.info.text.map fun t => advance t ch).getD 0))]

def bind (data : Content) (p : Placed) : Drawn :=
  ⟨p, (p.info.text.map fun t => textLines t p.rect.w (paintText t ((data.lookup t.key).getD ""))).getD [],
    p.info.text.map (fun t => (data.lookup t.key).getD "")⟩

/-- All patients/states, with no sampling or reachability hypothesis. Data is
bound after layout and cannot move any rectangle, including scroll viewports. -/
theorem geometry_independent (ps : List Placed) (a b : Content) :
    ((ps.map (bind a)).map Drawn.box) = ((ps.map (bind b)).map Drawn.box) := by
  simp [bind, List.map_map]

/-- Pairwise separation survives every common scroll translation. -/
theorem scroll_apart (a b : Rect) (dx dy : Int) (h : Apart a b) :
    Apart { a with x := a.x-dx, y := a.y-dy } { b with x := b.x-dx, y := b.y-dy } := by
  simp only [Apart, Rect.right, Rect.bottom] at *
  omega

#print axioms textAtoms_preserve
#print axioms hexChar_mem
#print axioms codepointInk_supported
#print axioms paintText_supported
#print axioms scroll_line_width
#print axioms scroll_complete
#print axioms greedy_width
#print axioms greedy_complete
#print axioms textAdvance_bound
#print axioms chunks_short
#print axioms wrap_line_width
#print axioms shift_rect
#print axioms column_floor
#print axioms column_apart
#print axioms glyphWidth_le
#print axioms advance_le_cell
#print axioms chunks_complete
#print axioms wrap_complete
#print axioms constrain_satisfies
#print axioms layout_satisfies
#print axioms geometry_independent
#print axioms scroll_apart
end Ehr.Layout
