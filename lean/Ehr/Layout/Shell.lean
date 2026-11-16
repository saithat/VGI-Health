import Ehr.Layout.Structural

/-! Fixed shell certificate: unbounded ordinary slots, one current-task commit,
up to two fixed interruptive occurrences, and a pinned urgent strip of up to
six occurrences. Content is bound after geometry. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 200000
namespace Ehr.Layout.Shell
open Lean Ehr.Render
abbrev Body := List (List Nat × Bool)
def footerText : TextSlot := { Structural.slotText with maxLines := 1 }
/-- Fixed 24px commit row between the banner (ending at 104px) and the urgent
strip band (starting at 128px), outside every scroll space. -/
def footer (v : Size) (path : List Nat) : Placed :=
  { rect := ⟨1024,6656,v.w-2048,1536⟩,
    style := { fg := ⟨15,23,42⟩, z := 20 },
    info := { id := "fixed-commit", source := some path, text := some footerText, target := true, commit := true } }
def modalId (i : Nat) : String := if i = 0 then "fixed-modal-0" else "fixed-modal-1"
def modal (v : Size) (entry : List Nat × Bool) (i : Nat) : Placed :=
  { rect := ⟨1024,17408+i*3584,v.w-2048,3072⟩,
    style := { fg := ⟨15,23,42⟩, z := 100 },
    info := { id := modalId i, source := some entry.1, text := some Structural.slotText, target := entry.2, interruptive := true } }
def modalBoxes (v : Size) (ms : Body) : List Placed :=
  ms.zipIdx.map (fun (entry,i) => modal v entry i)

/-- New specification for owner review: the number of urgent occurrences the
fixed shell pins: six 24 px rows between the commit row and the body. -/
def stripCapacity : Nat := 6
/-- New specification for owner review: the number of pinned occurrences that
may be targets. Pinned targets are in view at every scroll position, so they
count against the shell's density capacity with every body window. -/
def stripTargetCapacity : Nat := 2
def stripId : Nat → String
  | 0 => "fixed-urgent-0" | 1 => "fixed-urgent-1" | 2 => "fixed-urgent-2"
  | 3 => "fixed-urgent-3" | 4 => "fixed-urgent-4" | _ => "fixed-urgent-5"
/-- New specification for owner review: a pinned urgent row. Row `i` is a fixed
24 px row at 128 + 24·i px, outside every scroll space, below the commit row
and above the body scroller and the modal layer. -/
def strip (v : Size) (entry : List Nat × Bool) (i : Nat) : Placed :=
  { rect := ⟨1024,8192+i*1536,v.w-2048,1536⟩,
    style := { fg := ⟨15,23,42⟩, z := 40 },
    info := { id := stripId i, source := some entry.1, text := some footerText, target := entry.2, urgent := true } }
def stripBoxes (v : Size) (us : Body) : List Placed :=
  us.zipIdx.map (fun (entry,i) => strip v entry i)

/-- `us` are the pinned urgent occurrences (at most `stripCapacity`). -/
def placements (v : Size) (first : List Nat) (body : Body)
    (commit : Option (List Nat)) (ms : Body) (us : Body) : List Placed :=
  Structural.placements v first body ++ (commit.toList.map (footer v) ++ (modalBoxes v ms ++ stripBoxes v us))

def inventory (first : List Nat) (body : Body) (commit : Option (List Nat)) (ms : Body) (us : Body) :
    List (List Nat) :=
  (first :: body.map Prod.fst) ++ (commit.toList ++ (ms.map Prod.fst ++ us.map Prod.fst))

private theorem bounds (v : Size) (hv : v ∈ viewports) : 81920 ≤ v.w ∧ 51200 ≤ v.h := by
  simp only [viewports,List.mem_cons,List.not_mem_nil,or_false] at hv
  rcases hv with rfl | rfl | rfl <;> decide
private theorem base_cases (v first body p) (hp : p ∈ Structural.placements v first body) :
    p = Structural.scroller v ∨ p = Structural.banner v first ∨
    ∃ entry i, (entry,i) ∈ body.zipIdx ∧ p = Structural.ordinary v entry.1 entry.2 i := by
  simp only [Structural.placements,List.mem_cons,List.mem_map] at hp
  rcases hp with h | h | ⟨⟨e,i⟩,he,rfl⟩
  · exact .inl h
  · exact .inr (.inl h)
  · exact .inr (.inr ⟨e,i,he,rfl⟩)
private theorem modal_cases (v ms p) (hp : p ∈ modalBoxes v ms) :
    ∃ entry i, (entry,i) ∈ ms.zipIdx ∧ p = modal v entry i := by
  obtain ⟨⟨e,i⟩,he,h⟩ := List.mem_map.mp hp
  exact ⟨e,i,he,h.symm⟩
private theorem strip_cases (v us p) (hp : p ∈ stripBoxes v us) :
    ∃ entry i, (entry,i) ∈ us.zipIdx ∧ p = strip v entry i := by
  obtain ⟨⟨e,i⟩,he,h⟩ := List.mem_map.mp hp
  exact ⟨e,i,he,h.symm⟩
/-- Every shell box is a structural box, the commit footer, a fixed modal or a
pinned urgent row. -/
private theorem shell_cases {v first body commit ms us p} (hp : p ∈ placements v first body commit ms us) :
    p ∈ Structural.placements v first body ∨ (∃ path ∈ commit.toList, p = footer v path) ∨
    (p ∈ modalBoxes v ms ∧ ∃ entry i, (entry,i) ∈ ms.zipIdx ∧ p = modal v entry i) ∨
    (p ∈ stripBoxes v us ∧ ∃ entry i, (entry,i) ∈ us.zipIdx ∧ p = strip v entry i) := by
  simp only [placements,List.mem_append,List.mem_map] at hp
  rcases hp with hp | ⟨path,h,rfl⟩ | hp | hp
  · exact .inl hp
  · exact .inr (.inl ⟨path,h,rfl⟩)
  · exact .inr (.inr (.inl ⟨hp,modal_cases v ms p hp⟩))
  · exact .inr (.inr (.inr ⟨hp,strip_cases v us p hp⟩))
private theorem modal_index (ms : Body) (limited : ms.length ≤ 2) (entry i)
    (member : (entry,i) ∈ ms.zipIdx) : i < 2 := by
  have := List.mem_zipIdx member
  omega
private theorem strip_index (us : Body) (limited : us.length ≤ stripCapacity) (entry i)
    (member : (entry,i) ∈ us.zipIdx) : i < 6 := by
  have := List.mem_zipIdx member
  simp only [stripCapacity] at limited
  omega
private theorem base_flags (v first body p) (hp : p ∈ Structural.placements v first body) :
    p.info.interruptive = false ∧ p.info.commit = false ∧ p.style.z ≤ 30 ∧
    ∃ n, p.info.id = Nat.repr n := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
  · exact ⟨rfl,rfl,by change (0 : Int) ≤ 30; decide,0,rfl⟩
  · exact ⟨rfl,rfl,by change (30 : Int) ≤ 30; decide,1,rfl⟩
  · exact ⟨rfl,rfl,by change (0 : Int) ≤ 30; decide,i+2,rfl⟩
private theorem base_not_urgent (v first body p) (hp : p ∈ Structural.placements v first body) :
    p.info.urgent = false := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩ <;> rfl
private theorem separated_symm (p q : Placed) (h : separated p q) : separated q p := by
  unfold separated at *
  split at h
  next same => rw [ite_eq_left same.symm]; simp only [Apart] at *; omega
  next different => rw [ite_eq_right (fun h => different h.symm)]; simp only [Apart] at *; omega
private theorem base_footer (v first body p path) (hp : p ∈ Structural.placements v first body) :
    separated p (footer v path) := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
  all_goals simp [separated,envelope,Structural.scroller,Structural.banner,Structural.ordinary,
    Structural.clipRect,footer,Apart,Rect.right,Rect.bottom]
private theorem banner_modal (v first entry i) :
    separated (Structural.banner v first) (modal v entry i) := by
  simp [separated,Structural.banner,modal,Apart,Rect.bottom]
  omega
private theorem modals_separated (v a b i j) (different : i ≠ j) :
    separated (modal v a i) (modal v b j) := by
  simp only [separated,modal,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
  omega
/-- The strip band (128–272 px) lies between the commit row and the body. -/
private theorem base_strip (v first body p entry i) (hp : p ∈ Structural.placements v first body)
    (hi : i < 6) : separated p (strip v entry i) := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,j,_,rfl⟩
  · simp only [separated,Structural.scroller,strip,List.map_nil,↓reduceIte,Structural.clipRect,
      Apart,Rect.right,Rect.bottom]
    omega
  · simp only [separated,Structural.banner,strip,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
    omega
  · have different : ¬ (["0"] : List String) = [] := by simp
    simp only [separated,Structural.ordinary,strip,List.map_cons,List.map_nil,different,↓reduceIte,
      envelope,List.getLast?_singleton,Option.map_some,Option.getD_some,List.getLast?_nil,
      Option.map_none,Option.getD_none,Structural.clipRect,Apart,Rect.right,Rect.bottom]
    omega
private theorem footer_strip (v path entry i) : separated (footer v path) (strip v entry i) := by
  simp only [separated,footer,strip,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
  omega
private theorem modal_strip (v a b i j) (hj : j < 6) : separated (modal v a i) (strip v b j) := by
  simp only [separated,modal,strip,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
  omega
private theorem strips_separated (v a b i j) (different : i ≠ j) :
    separated (strip v a i) (strip v b j) := by
  simp only [separated,strip,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
  omega
private theorem modal_visible (v : Size) (hv : v ∈ viewports) (entry i) (limited : i < 2) :
    visible v (modal v entry i) := by
  obtain ⟨hw, hh⟩ := bounds v hv
  simp [visible,modal,Contains,viewportRect,Rect.right,Rect.bottom]
  omega
private theorem footer_visible (v : Size) (hv : v ∈ viewports) (path) : visible v (footer v path) := by
  obtain ⟨hw, hh⟩ := bounds v hv
  simp [visible,footer,Contains,viewportRect,Rect.right,Rect.bottom]
  omega
private theorem strip_visible (v : Size) (hv : v ∈ viewports) (entry i) (limited : i < 6) :
    visible v (strip v entry i) := by
  obtain ⟨hw, hh⟩ := bounds v hv
  simp [visible,strip,Contains,viewportRect,Rect.right,Rect.bottom]
  omega
private theorem has_modal (v first body commit ms us p) (hp : p ∈ modalBoxes v ms) :
    ((placements v first body commit ms us).any (·.info.interruptive)) = true := by
  obtain ⟨e,i,_,same⟩ := modal_cases v ms p hp
  exact List.any_eq_true.mpr ⟨p,by simp [placements,hp],by rw [same]; rfl⟩
private theorem base_active (v first body commit ms us p q)
    (hp : p ∈ Structural.placements v first body) (hq : q ∈ modalBoxes v ms)
    (active : activePaint (placements v first body commit ms us) p = true) : p.info.banner = true := by
  have flags := (base_flags v first body p hp).1
  simpa [activePaint,has_modal v first body commit ms us q hq,flags,
    base_not_urgent v first body p hp] using active
private theorem base_banner (v first body p) (hp : p ∈ Structural.placements v first body)
    (bannerFlag : p.info.banner = true) : p = Structural.banner v first := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
  · simp [Structural.scroller] at bannerFlag
  · rfl
  · simp [Structural.ordinary] at bannerFlag
private theorem target_implies (ps : List Placed) (p : Placed) (h : activeTarget ps p = true) :
    p.info.target = true := by
  simp only [activeTarget,Bool.and_eq_true] at h
  exact h.1
private theorem base_target_inactive (v first body commit ms us p q)
    (hp : p ∈ Structural.placements v first body) (hq : q ∈ modalBoxes v ms) :
    activeTarget (placements v first body commit ms us) p = false := by
  simp [activeTarget,has_modal v first body commit ms us q hq,(base_flags v first body p hp).1,
    base_not_urgent v first body p hp]
private theorem footer_inactive (v first body commit ms us path q) (hq : q ∈ modalBoxes v ms) :
    activePaint (placements v first body commit ms us) (footer v path) = false ∧
    activeTarget (placements v first body commit ms us) (footer v path) = false := by
  simp [activePaint,activeTarget,footer,has_modal v first body commit ms us q hq]

private theorem base_no_modal (v first body) :
    ((Structural.placements v first body).any (·.info.interruptive)) = false :=
  List.any_eq_false.mpr fun p hp => by simp [(base_flags v first body p hp).1]

private theorem base_rules (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) :
    Rules (first :: body.map Prod.fst) v (Structural.placements v first body) := by
  apply Structural.repeatBody_rules v hv
  exact (List.pairwise_append.mp unique).1

private theorem filter_false (xs : List α) : xs.filter (fun _ => false) = [] := by
  simp

private theorem banner_rule (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (pinned : us.length ≤ stripCapacity) :
    G1 v (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).1
  constructor
  · simpa [placements,List.filter_append,List.filter_map,footer,modalBoxes,modal,stripBoxes,strip,
      Function.comp_def,filter_false] using base.1
  · intro p hp flag
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · refine ⟨(base.2 p hp flag).1,?_⟩
      intro q hq paint different
      rcases shell_cases hq with hq | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩
      · exact (base.2 p hp flag).2 q hq paint different
      · exact base_footer v first body p path hp
      · rw [base_banner v first body p hp flag]
        exact banner_modal v first e i
      · exact base_strip v first body p e i hp (strip_index us pinned e i hi)
    · simp [footer] at flag
    · simp [modal] at flag
    · simp [strip] at flag

private theorem modal_rule (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (limited : ms.length ≤ 2) : G2 v (placements v first body commit ms us) := by
  intro p hp flag
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · simp [(base_flags v first body p hp).1] at flag
  · simp [footer] at flag
  · refine ⟨modal_visible v hv e i (modal_index ms limited e i hi),?_⟩
    intro q hq _ ordinary
    rcases shell_cases hq with hq | ⟨path,_,rfl⟩ | ⟨-,e,j,_,rfl⟩ | ⟨-,e,j,_,rfl⟩
    · have z := (base_flags v first body q hq).2.2.1
      change q.style.z < 100
      omega
    · change (20 : Int) < 100; decide
    · simp [modal] at ordinary
    · change (40 : Int) < 100; decide
  · simp [strip] at flag

private theorem zip_order (xs : List α) : xs.zipIdx.Pairwise (fun a b => a.2 < b.2) := by
  apply List.pairwise_iff_getElem.mpr
  intro i j hi hj hij
  simpa using hij

private theorem targets (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (pinned : us.length ≤ stripCapacity) :
    G3 (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).2.2.1
  have hw := (bounds v hv).1
  constructor
  · intro p hp ht
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · exact base.1 p hp ht
    · simp only [footer]; omega
    · simp only [modal]; omega
    · simp only [strip]; omega
  -- Pairs within the base, the footer, the modals and the strip; then across.
  · unfold placements
    refine List.pairwise_append.mpr ⟨?_,List.pairwise_append.mpr ⟨?_,
      List.pairwise_append.mpr ⟨?_,?_,?_⟩,?_⟩,?_⟩
    · apply base.2.imp
      intro p q h hp hq
      apply h
      · simp [activeTarget,base_no_modal,target_implies _ _ hp]
      · simp [activeTarget,base_no_modal,target_implies _ _ hq]
    · cases commit <;> simp
    · unfold modalBoxes
      rw [List.pairwise_map]
      apply (zip_order ms).imp
      intro a b ordered _ _
      exact modals_separated v a.1 b.1 a.2 b.2 (by omega)
    · unfold stripBoxes
      rw [List.pairwise_map]
      apply (zip_order us).imp
      intro a b ordered _ _
      exact strips_separated v a.1 b.1 a.2 b.2 (by omega)
    · intro p hp q hq _ _
      obtain ⟨e,i,_,rfl⟩ := modal_cases v ms p hp
      obtain ⟨f,j,hj,rfl⟩ := strip_cases v us q hq
      exact modal_strip v e f i j (strip_index us pinned f j hj)
    · intro p hp q hq hpActive _
      obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
      rcases List.mem_append.mp hq with hq | hq
      · have inactive := (footer_inactive v first body commit ms us path q hq).2
        exact False.elim (Bool.noConfusion (inactive.symm.trans hpActive))
      · obtain ⟨f,j,_,rfl⟩ := strip_cases v us q hq
        exact footer_strip v path f j
    · intro p hp q hq hpActive _
      rcases List.mem_append.mp hq with hq | hq
      · obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
        exact base_footer v first body p path hp
      · rcases List.mem_append.mp hq with hq | hq
        · have inactive := base_target_inactive v first body commit ms us p q hp hq
          exact False.elim (Bool.noConfusion (inactive.symm.trans hpActive))
        · obtain ⟨f,j,hj,rfl⟩ := strip_cases v us q hq
          exact base_strip v first body p f j hp (strip_index us pinned f j hj)

private theorem capacity_lines (t : TextSlot) (n w : Nat) :
    capacity {t with maxLines := n} w = capacity t w := rfl
private theorem escape_lines (t : TextSlot) (n : Nat) :
    escapeReady {t with maxLines := n} = escapeReady t := rfl
private theorem resize_text (p q : Placed) (t : TextSlot) (n : Nat)
    (fits : textFits p t) (width : p.rect.w = q.rect.w) (positive : 0 < n)
    (reserve : n*t.lineHeight ≤ q.rect.h) (policy : t.overflow = .scroll) :
    textFits q {t with maxLines := n} := by
  rcases fits with ⟨a,b,c,d,_,_,e,_⟩
  refine ⟨a,b,c,?_,positive,reserve,?_,?_⟩
  · rw [capacity_lines,← width]; exact d
  · intro safe
    obtain ⟨pol,ready⟩ := e safe
    exact ⟨pol,by rw [escape_lines]; exact ready⟩
  · intro wrap
    change t.overflow = .wrap at wrap
    rw [policy] at wrap
    contradiction

private theorem footer_fits (v : Size) (hv : v ∈ viewports) (path) :
    textFits (footer v path) footerText := by
  have rules := Structural.repeatBody_rules v hv ([] : List Nat) [] (by simp)
  have fits := rules.2.2.2.1.2.1 (Structural.banner v []) (by simp [Structural.placements])
    {Structural.slotText with maxLines := 4} (by simp [Structural.banner])
  exact resize_text (Structural.banner v []) (footer v path)
    {Structural.slotText with maxLines := 4} 1 fits rfl (by decide)
    (by change 1408 ≤ 1536; decide) rfl

private theorem strip_fits (v : Size) (hv : v ∈ viewports) (entry i) :
    textFits (strip v entry i) footerText := by
  have rules := Structural.repeatBody_rules v hv ([] : List Nat) [] (by simp)
  have fits := rules.2.2.2.1.2.1 (Structural.banner v []) (by simp [Structural.placements])
    {Structural.slotText with maxLines := 4} (by simp [Structural.banner])
  exact resize_text (Structural.banner v []) (strip v entry i)
    {Structural.slotText with maxLines := 4} 1 fits rfl (by decide)
    (by change 1408 ≤ 1536; decide) rfl

private theorem modal_fits (v : Size) (hv : v ∈ viewports) (entry i) :
    textFits (modal v entry i) Structural.slotText := by
  have hw := (bounds v hv).1
  have metrics : Fonts.lineExtent[0]?.getD 2000 = 1453 := by decide_cbv
  have maximum : Fonts.maxAdvance[0]?.getD 0 = 1544 := by decide_cbv
  have units : Fonts.unitsPerEm[0]?.getD 1000 = 1000 := by decide_cbv
  have ready : escapeReady Structural.slotText = true := by decide_cbv
  change 0 < Fonts.tables.size ∧ minFontUnits ≤ Structural.slotText.fontSize ∧ _
  refine ⟨by decide_cbv,by decide,?_,?_,by decide,by change 2816 ≤ 3072; decide,?_,?_⟩
  · simp only [Structural.slotText,metrics]; decide
  · simp only [modal,capacity,cell,Structural.slotText,maximum,units]
    change 0 < (v.w-2048)/1384
    omega
  · intro _; exact ⟨rfl,ready⟩
  · intro impossible; contradiction

private theorem text_rule (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (limited : ms.length ≤ 2)
    (pinned : us.length ≤ stripCapacity) :
    G4 v (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).2.2.2.1
  refine ⟨?_,?_,?_⟩
  · intro p hp paint
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩ | ⟨-,e,i,hi,rfl⟩
    · exact base.1 p hp paint
    · exact (footer_visible v hv path).2
    · exact (modal_visible v hv e i (modal_index ms limited e i hi)).2
    · exact (strip_visible v hv e i (strip_index us pinned e i hi)).2
  · intro p hp t ht
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · exact base.2.1 p hp t ht
    · obtain rfl : footerText = t := by simpa [footer] using ht
      exact footer_fits v hv path
    · obtain rfl : Structural.slotText = t := by simpa [modal] using ht
      exact modal_fits v hv e i
    · obtain rfl : footerText = t := by simpa [strip] using ht
      exact strip_fits v hv e i
  -- Overlapping active text: only base/base is left to the structural rule;
  -- every pair involving a modal or the footer is separated or inactive, and
  -- the strip band is separated from everything.
  · intro p hp ht active q hq paint different qactive above
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨hp,e,i,_,rfl⟩ | ⟨hp,e,i,hi,rfl⟩ <;>
      rcases shell_cases hq with hq | ⟨other,_,rfl⟩ | ⟨hq,f,j,_,rfl⟩ | ⟨hq,f,j,hj,rfl⟩
    · exact base.2.2 p hp ht (by simp [activePaint,base_no_modal]) q hq paint different
        (by simp [activePaint,base_no_modal]) above
    · exact base_footer v first body p other hp
    · rw [base_banner v first body p hp (base_active v first body commit ms us p _ hp hq active)]
      exact banner_modal v first f j
    · exact base_strip v first body p f j hp (strip_index us pinned f j hj)
    · exact separated_symm _ _ (base_footer v first body q path hq)
    · exact False.elim (different rfl)
    · simp [(footer_inactive v first body commit ms us path _ hq).1] at active
    · exact footer_strip v path f j
    · rw [base_banner v first body q hq (base_active v first body commit ms us q _ hq hp qactive)]
      exact separated_symm _ _ (banner_modal v first e i)
    · simp [(footer_inactive v first body commit ms us other _ hp).1] at qactive
    · apply modals_separated v e f i j
      intro same; apply different; simp [modal,same]
    · exact modal_strip v e f i j (strip_index us pinned f j hj)
    · exact separated_symm _ _ (base_strip v first body q e i hq (strip_index us pinned e i hi))
    · exact separated_symm _ _ (footer_strip v other e i)
    · exact separated_symm _ _ (modal_strip v f e j i (strip_index us pinned e i hi))
    · apply strips_separated v e f i j
      intro same; apply different; simp [strip,same]

private theorem horizontal (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) : G5 v (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).2.2.2.2.1
  have hw := (bounds v hv).1
  intro p hp
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · exact base p hp
  · simp [footer,envelope,Rect.right]; omega
  · simp [modal,envelope,Rect.right]; omega
  · simp [strip,envelope,Rect.right]; omega

private theorem contrast (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) : G6 (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).2.2.2.2.2.1
  have text : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ textTwiceRatio = true := by decide_cbv
  have target : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ nonTextTwiceRatio = true := by decide_cbv
  intro p hp
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · exact base p hp
  · simp [footer,footerText,Structural.slotText,text,target]
  · simp [modal,Structural.slotText,text,target]
  · simp [strip,footerText,Structural.slotText,text,target]

private theorem commit_rule (v : Size) (hv : v ∈ viewports) (first body commit ms us) :
    G9 v (placements v first body commit ms us) := by
  have noBase : (Structural.placements v first body).filter (·.info.commit) = [] :=
    List.filter_eq_nil_iff.mpr fun p hp => by simp [(base_flags v first body p hp).2.1]
  intro _ present
  cases commit with
  | none =>
    have absent : (placements v first body none ms us).any (·.info.commit) = false := by
      simp [placements,List.any_append,List.any_map,Function.comp_def,modalBoxes,modal,stripBoxes,strip]
      intro p hp
      exact (base_flags v first body p hp).2.1
    simp [absent] at present
  | some path =>
    constructor
    · simp [placements,List.filter_append,noBase,footer,modalBoxes,List.filter_map,modal,stripBoxes,strip,
        Function.comp_def,filter_false]
    · intro p hp flag
      rcases shell_cases hp with hp | ⟨other,same,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
      · simp [(base_flags v first body p hp).2.1] at flag
      · obtain rfl : other = path := by simpa using same
        exact ⟨rfl,footer_visible v hv other⟩
      · simp [modal] at flag
      · simp [strip] at flag

private theorem repr_ne (n : Nat) (id : String) (notNumeric : id.isNat = false) : Nat.repr n ≠ id :=
  fun same => by simpa [Nat.isNat_repr,notNumeric] using congrArg String.isNat same

private theorem not_numeric (id : String) (member : 'f' ∈ id.toList) : id.isNat = false :=
  Bool.eq_false_iff.mpr fun numeric => by
    simpa [Char.isDigit] using (String.isNat_iff.mp numeric).2.1 'f' member

private theorem modal_id_not_numeric (i) : (modalId i).isNat = false := by
  unfold modalId; split <;> apply not_numeric <;> simp
private theorem modal_id_not_footer (i) : modalId i ≠ "fixed-commit" := by
  unfold modalId; split <;> decide
private theorem modal_id_injective (i j : Nat) (hi : i < 2) (hj : j < 2)
    (same : modalId i = modalId j) : i = j := by
  have a : i = 0 ∨ i = 1 := by omega
  have b : j = 0 ∨ j = 1 := by omega
  rcases a with rfl | rfl <;> rcases b with rfl | rfl <;> simp_all [modalId]
private theorem strip_id_not_numeric (i) : (stripId i).isNat = false := by
  unfold stripId; split <;> apply not_numeric <;> simp
private theorem strip_id_not_footer (i) : stripId i ≠ "fixed-commit" := by
  unfold stripId; split <;> decide
private theorem strip_id_not_modal (i j) : stripId i ≠ modalId j := by
  unfold stripId modalId; split <;> split <;> decide
private theorem strip_id_injective (i j : Nat) (hi : i < 6) (hj : j < 6)
    (same : stripId i = stripId j) : i = j := by
  have a : i = 0 ∨ i = 1 ∨ i = 2 ∨ i = 3 ∨ i = 4 ∨ i = 5 := by omega
  have b : j = 0 ∨ j = 1 ∨ j = 2 ∨ j = 3 ∨ j = 4 ∨ j = 5 := by omega
  rcases a with rfl | rfl | rfl | rfl | rfl | rfl <;>
    rcases b with rfl | rfl | rfl | rfl | rfl | rfl <;> simp_all [stripId]

private theorem ids_unique (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (limited : ms.length ≤ 2)
    (pinned : us.length ≤ stripCapacity) :
    ((placements v first body commit ms us).map (·.info.id)).Nodup := by
  have base := (base_rules v hv first body commit ms us unique).2.2.2.2.2.2.1.1
  unfold placements
  simp only [List.map_append]
  refine List.nodup_append.mpr ⟨base,List.nodup_append.mpr ⟨?_,
    List.nodup_append.mpr ⟨?_,?_,?_⟩,?_⟩,?_⟩
  · cases commit <;> simp [footer]
  · unfold modalBoxes
    simp only [List.map_map,Function.comp_def]
    rw [List.nodup_iff_pairwise_ne,List.pairwise_map]
    apply (zip_order ms).imp_of_mem
    intro a b ha hb ordered same
    have := modal_id_injective a.2 b.2 (modal_index ms limited a.1 a.2 ha) (modal_index ms limited b.1 b.2 hb) same
    omega
  · unfold stripBoxes
    simp only [List.map_map,Function.comp_def]
    rw [List.nodup_iff_pairwise_ne,List.pairwise_map]
    apply (zip_order us).imp_of_mem
    intro a b ha hb ordered same
    have := strip_id_injective a.2 b.2 (strip_index us pinned a.1 a.2 ha) (strip_index us pinned b.1 b.2 hb) same
    omega
  · intro id hid other hin sameId
    obtain ⟨p,hp,rfl⟩ := List.mem_map.mp hid
    obtain ⟨e,i,_,rfl⟩ := modal_cases v ms p hp
    obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
    obtain ⟨f,j,_,rfl⟩ := strip_cases v us q hq
    exact strip_id_not_modal j i (same.trans sameId.symm)
  · intro id hid other hin sameId
    obtain ⟨p,hp,rfl⟩ := List.mem_map.mp hid
    obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
    rcases List.mem_append.mp hin with hin | hin
    · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
      obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
      exact modal_id_not_footer i (same.trans sameId.symm)
    · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
      obtain ⟨e,i,_,rfl⟩ := strip_cases v us q hq
      exact strip_id_not_footer i (same.trans sameId.symm)
  · intro id hid other hin sameId
    obtain ⟨p,hp,rfl⟩ := List.mem_map.mp hid
    obtain ⟨n,hn⟩ := (base_flags v first body p hp).2.2.2
    rcases List.mem_append.mp hin with hin | hin
    · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
      obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
      exact repr_ne n "fixed-commit" (not_numeric _ (by simp)) (hn.symm.trans (sameId.trans same.symm))
    · rcases List.mem_append.mp hin with hin | hin
      · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
        obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
        exact repr_ne n (modalId i) (modal_id_not_numeric i) (hn.symm.trans (sameId.trans same.symm))
      · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
        obtain ⟨e,i,_,rfl⟩ := strip_cases v us q hq
        exact repr_ne n (stripId i) (strip_id_not_numeric i) (hn.symm.trans (sameId.trans same.symm))


private theorem source_count (ps : List Placed) (path : List Nat)
    (painted : ∀ p ∈ ps, ∀ source ∈ p.info.source, p.info.paint = true) :
    (ps.filter (fun p => p.info.source == some path && p.info.paint)).length =
    ((ps.filterMap (·.info.source)).filter (· == path)).length := by
  induction ps with
  | nil => rfl
  | cons p rest ih =>
    have tail : ∀ q ∈ rest, ∀ source ∈ q.info.source, q.info.paint = true :=
      fun q hq => painted q (List.mem_cons_of_mem _ hq)
    have eq := ih tail
    cases hs : p.info.source with
    | none => simpa [hs] using eq
    | some source =>
      have paint := painted p (by simp) source (by simp [hs])
      by_cases same : source = path <;> simp [hs,paint,same,eq]

private theorem source_inventory (v first body commit ms us) :
    ((placements v first body commit ms us).filterMap (·.info.source)) = inventory first body commit ms us := by
  have bodyPaths : body.zipIdx.map (fun e => e.1.1) = body.map Prod.fst := by
    simpa only [List.map_map,Function.comp_def] using
      congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := body) (i := 0))
  have modalPaths : ms.zipIdx.map (fun e => e.1.1) = ms.map Prod.fst := by
    simpa only [List.map_map,Function.comp_def] using
      congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := ms) (i := 0))
  have stripPaths : us.zipIdx.map (fun e => e.1.1) = us.map Prod.fst := by
    simpa only [List.map_map,Function.comp_def] using
      congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := us) (i := 0))
  simp [placements,Structural.placements,Structural.scroller,Structural.banner,Structural.ordinary,
    footer,modalBoxes,modal,stripBoxes,strip,List.filterMap_append,List.filterMap_map,Function.comp_def,
    bodyPaths,modalPaths,stripPaths,inventory]

private theorem sources_painted (v first body commit ms us) :
    ∀ p ∈ placements v first body commit ms us, ∀ source ∈ p.info.source, p.info.paint = true := by
  intro p hp source hs
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
    · simp [Structural.scroller] at hs
    all_goals rfl
  all_goals rfl

private theorem complete (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (limited : ms.length ≤ 2)
    (pinned : us.length ≤ stripCapacity) :
    G7 (inventory first body commit ms us) (placements v first body commit ms us) := by
  refine ⟨ids_unique v hv first body commit ms us unique limited pinned,unique,?_,?_⟩
  · intro path member
    rw [source_count _ path (sources_painted v first body commit ms us),source_inventory,
      ← List.count_eq_length_filter]
    exact unique.count_of_mem member
  · intro p hp path hs
    refine ⟨?_,sources_painted v first body commit ms us p hp path hs⟩
    rw [← source_inventory v first body commit ms us]
    exact List.mem_filterMap.mpr ⟨p,hp,Option.mem_def.mp hs⟩

private theorem reading_order (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) : G8 (placements v first body commit ms us) := by
  have base := (base_rules v hv first body commit ms us unique).2.2.2.2.2.2.2.1
  let ink := fun p : Placed => p.info.paint && (p.info.target || p.info.text.isSome)
  have ff : (commit.toList.map (footer v)).filter ink = commit.toList.map (footer v) :=
    List.filter_eq_self.mpr fun p hp => by obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp; rfl
  have fm : (modalBoxes v ms).filter ink = modalBoxes v ms :=
    List.filter_eq_self.mpr fun p hp => by obtain ⟨e,i,_,rfl⟩ := modal_cases v ms p hp; simp [ink,modal]
  have fs : (stripBoxes v us).filter ink = stripBoxes v us :=
    List.filter_eq_self.mpr fun p hp => by obtain ⟨e,i,_,rfl⟩ := strip_cases v us p hp; simp [ink,strip]
  change ((placements v first body commit ms us).filter ink).Pairwise _
  unfold placements
  rw [List.filter_append,List.filter_append,List.filter_append,ff,fm,fs]
  refine List.pairwise_append.mpr ⟨base,List.pairwise_append.mpr ⟨?_,
    List.pairwise_append.mpr ⟨?_,?_,?_⟩,?_⟩,?_⟩
  · cases commit <;> simp
  · unfold modalBoxes
    rw [List.pairwise_map]
    apply (zip_order ms).imp
    intro a b ordered _
    simp only [modal,List.map_nil,↓reduceIte,before]
    omega
  · unfold stripBoxes
    rw [List.pairwise_map]
    apply (zip_order us).imp
    intro a b ordered _
    simp only [strip,List.map_nil,↓reduceIte,before]
    omega
  · intro p hp q hq same
    obtain ⟨e,i,_,rfl⟩ := modal_cases v ms p hp
    obtain ⟨f,j,_,rfl⟩ := strip_cases v us q hq
    simp [modal,strip] at same
  · intro p hp q hq same
    obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
    rcases List.mem_append.mp hq with hq | hq
    · obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
      simp [footer,modal] at same
    · obtain ⟨e,i,_,rfl⟩ := strip_cases v us q hq
      simp [footer,strip] at same
  · intro p hp q hq same
    have hp := (List.mem_filter.mp hp).1
    rcases List.mem_append.mp hq with hq | hq
    · obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
      rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
      all_goals simp [Structural.scroller,Structural.banner,Structural.ordinary,footer] at same
    · have z := (base_flags v first body p hp).2.2.1
      rcases List.mem_append.mp hq with hq | hq
      · obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
        change p.style.z = 100 at same
        omega
      · obtain ⟨e,i,_,rfl⟩ := strip_cases v us q hq
        change p.style.z = 40 at same
        omega

/-- Quantifies over arbitrary list sizes and content-independent occurrence
paths. G9 is nonvacuous when commit is present, including under an active modal.
`us` are the pinned urgent occurrences; with `us = []` this is the shell
without a strip. -/
theorem shell_rules (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (limited : ms.length ≤ 2)
    (pinned : us.length ≤ stripCapacity) :
    Rules (inventory first body commit ms us) v (placements v first body commit ms us) := by
  exact ⟨banner_rule v hv first body commit ms us unique pinned,modal_rule v hv first body commit ms us limited,
    targets v hv first body commit ms us unique pinned,text_rule v hv first body commit ms us unique limited pinned,
    horizontal v hv first body commit ms us unique,contrast v hv first body commit ms us unique,
    complete v hv first body commit ms us unique limited pinned,reading_order v hv first body commit ms us unique,
    commit_rule v hv first body commit ms us⟩

/-- New specification for owner review: the pinned rows satisfy G11. Every
strip row is fixed inside the viewport and separated from every other painted
box of the shell, the modal layer included; no other box carries an urgent
occurrence. -/
theorem shell_urgent (v : Size) (hv : v ∈ viewports) (first body commit ms us)
    (unique : (inventory first body commit ms us).Nodup) (pinned : us.length ≤ stripCapacity) :
    G11 v (us.map Prod.fst) (placements v first body commit ms us) := by
  have baseSources := (base_rules v hv first body commit ms us unique).2.2.2.2.2.2.1.2.2.2
  have split := List.nodup_append.mp unique
  have rest := List.nodup_append.mp split.2.1
  have tail := List.nodup_append.mp rest.2.1
  constructor
  · intro p hp flag
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩
    · simp [base_not_urgent v first body p hp] at flag
    · simp [footer] at flag
    · simp [modal] at flag
    · have bound := strip_index us pinned e i hi
      refine ⟨rfl,strip_visible v hv e i bound,?_⟩
      intro q hq _ different
      rcases shell_cases hq with hq | ⟨path,_,rfl⟩ | ⟨-,f,j,_,rfl⟩ | ⟨-,f,j,_,rfl⟩
      · exact separated_symm _ _ (base_strip v first body q e i hq bound)
      · exact separated_symm _ _ (footer_strip v path e i)
      · exact separated_symm _ _ (modal_strip v f e j i bound)
      · apply strips_separated v e f i j
        intro same; apply different; simp [strip,same]
  · intro p hp path hs member
    rcases shell_cases hp with hp | ⟨other,inCommit,rfl⟩ | ⟨-,e,i,hi,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · have inBase := (baseSources p hp path hs).1
      exact False.elim (split.2.2 path inBase path (by simp [member]) rfl)
    · obtain rfl : other = path := by simpa [footer] using hs
      exact False.elim (rest.2.2 other inCommit other (by simp [member]) rfl)
    · obtain rfl : e.1 = path := by simpa [modal] using hs
      have inModal : e.1 ∈ ms.map Prod.fst :=
        List.mem_map.mpr ⟨e,by simpa using (List.mem_map.mpr ⟨(e,i),hi,rfl⟩ : e ∈ ms.zipIdx.map Prod.fst),rfl⟩
      exact False.elim (tail.2.2 e.1 inModal e.1 member rfl)
    · rfl


structure Parts where
  banner : SlotShape
  body : List SlotShape
  commit : Option SlotShape
  modal : List SlotShape
  /-- New specification for owner review: the pinned urgent occurrences. -/
  strip : List SlotShape := []
  deriving Inhabited

def ordinaryRegion (s : SlotShape) : Bool :=
  s.region != .banner && s.region != .footer && s.region != .modal

/-- New specification for owner review: the urgent occurrences of a shape. -/
def urgentSlots (shape : ScreenShape) : List SlotShape := shape.filter (fun s => s.region == .urgent)

/-- New specification for owner review: the urgent strip of this shape fits the
shell's pinned band: at most `stripCapacity` occurrences, of which at most
`stripTargetCapacity` are targets. When it does not fit, the shell paints the
urgent occurrences as ordinary body rows (so G1–G9 still hold) and G11 fails. -/
def stripFits (shape : ScreenShape) : Bool :=
  decide ((urgentSlots shape).length ≤ stripCapacity ∧
    ((urgentSlots shape).filter (·.target)).length ≤ stripTargetCapacity)

/-- The urgent occurrences the shell pins: all of them, or none. -/
def pinnedSlot (fit : Bool) (s : SlotShape) : Bool := fit && s.region == .urgent
private theorem pinnedSlot_true : pinnedSlot true = fun s => s.region == .urgent := by
  funext s; simp [pinnedSlot]
private theorem pinnedSlot_false : pinnedSlot false = fun _ => false := by
  funext s; simp [pinnedSlot]

/-- A body row of the shell: an ordinary occurrence that is not pinned. `side`
selects the navigation and side occurrences. -/
def bodySlot (fit side : Bool) (s : SlotShape) : Bool :=
  ordinaryRegion s && !pinnedSlot fit s && ((s.region == .side) == side)

/-- New specification for owner review: the body lists the title, the
workspace and any unpinned urgent occurrences first, then the navigation and
side occurrences. Each navigation link is now a row of its own, so the
navigation follows the workspace instead of preceding it. -/
def splitShape (shape : ScreenShape) : Parts :=
  ⟨shape.headD default,
    shape.filter (bodySlot (stripFits shape) false) ++ shape.filter (bodySlot (stripFits shape) true),
    shape.find? (fun s => s.region == .footer),
    shape.filter (fun s => s.region == .modal),shape.filter (pinnedSlot (stripFits shape))⟩
def Parts.slots (p : Parts) : ScreenShape :=
  p.banner :: (p.body ++ (p.commit.toList ++ (p.modal ++ p.strip)))
def Parts.bodyData (p : Parts) : Body := p.body.map (fun s => (s.path,s.target))
def Parts.commitData (p : Parts) : Option (List Nat) := p.commit.map SlotShape.path
def Parts.modalData (p : Parts) : Body := p.modal.map (fun s => (s.path,s.target))
def Parts.stripData (p : Parts) : Body := p.strip.map (fun s => (s.path,s.target))
def Good (p : Parts) : Prop :=
  p.banner.region = .banner ∧ p.banner.target = false ∧
  (∀ s ∈ p.body, s.region ≠ .banner ∧ s.region ≠ .footer ∧ s.region ≠ .modal) ∧
  (∀ s ∈ p.commit, s.region = .footer ∧ s.target = true) ∧
  (∀ s ∈ p.modal, s.region = .modal) ∧ p.modal.length ≤ 2 ∧
  (∀ s ∈ p.strip, s.region = .urgent) ∧ p.strip.length ≤ stripCapacity ∧
  (p.strip.filter (·.target)).length ≤ stripTargetCapacity
instance (p) : Decidable (Good p) := by unfold Good; infer_instance

def Fits (shape : ScreenShape) : Prop :=
  Good (splitShape shape) ∧ (splitShape shape).slots.Perm shape ∧ (shapeSources shape).Nodup
instance (shape) : Decidable (Fits shape) := by unfold Fits; infer_instance

def accepts (shape : ScreenShape) : Bool := decide (Fits shape)
def classBoxes (v : Size) (shape : ScreenShape) : List Placed :=
  let p := splitShape shape
  placements v p.banner.path p.bodyData p.commitData p.modalData p.stripData

def paint (screen : UiScreen) (v : Size) : Option (List Drawn) :=
  if accepts (screenShape screen) && viewports.contains v then
    some ((classBoxes v (screenShape screen)).map (bindSemantic screen)) else none

private theorem parts_inventory (p : Parts) :
    inventory p.banner.path p.bodyData p.commitData p.modalData p.stripData = shapeSources p.slots := by
  simp [inventory,Parts.bodyData,Parts.commitData,Parts.modalData,Parts.stripData,Parts.slots,shapeSources,
    List.map_map,Function.comp_def]
  cases p.commit <;> rfl

private theorem rules_perm (e f : List (List Nat)) (h : e.Perm f) (v : Size) (ps : List Placed)
    (rules : Rules e v ps) : Rules f v ps := by
  rcases rules with ⟨a,b,c,d,ee,ff,g,hh,i⟩
  refine ⟨a,b,c,d,ee,ff,?_,hh,i⟩
  rcases g with ⟨ids,paths,complete,linked⟩
  exact ⟨ids,h.nodup_iff.mp paths,fun path member => complete path (h.mem_iff.mpr member),
    fun p hp path hs => ⟨h.mem_iff.mp (linked p hp path hs).1,(linked p hp path hs).2⟩⟩

private theorem strip_length (shape : ScreenShape) :
    (splitShape shape).stripData.length ≤ stripCapacity := by
  simp only [Parts.stripData,splitShape,List.length_map]
  cases fit : stripFits shape with
  | false => simp [pinnedSlot_false,filter_false]
  | true =>
    have bound := (of_decide_eq_true fit).1
    simpa [pinnedSlot_true,urgentSlots] using bound

/-- New specification for owner review: what the shell pins is within its
capacities, for every shape. -/
theorem pinned_small (shape : ScreenShape) :
    (shape.filter (pinnedSlot (stripFits shape))).length ≤ stripCapacity ∧
    ((shape.filter (pinnedSlot (stripFits shape))).filter (·.target)).length ≤ stripTargetCapacity := by
  cases fit : stripFits shape with
  | false => simp [pinnedSlot_false,filter_false]
  | true =>
    have bound := of_decide_eq_true fit
    simpa [pinnedSlot_true,urgentSlots] using bound

theorem class_rules (shape : ScreenShape) (accepted : accepts shape = true)
    (v : Size) (hv : v ∈ viewports) : Rules (shapeSources shape) v (classBoxes v shape) := by
  have fits : Fits shape := of_decide_eq_true accepted
  have perm := fits.2.1.map SlotShape.path
  change (shapeSources (splitShape shape).slots).Perm (shapeSources shape) at perm
  have unique := perm.nodup_iff.mpr fits.2.2
  have rules := shell_rules v hv (splitShape shape).banner.path (splitShape shape).bodyData
    (splitShape shape).commitData (splitShape shape).modalData (splitShape shape).stripData
    (by simpa only [parts_inventory] using unique)
    (by simpa [Parts.modalData] using fits.1.2.2.2.2.2.1)
    (strip_length shape)
  apply rules_perm _ _ perm v _
  simpa only [parts_inventory,classBoxes] using rules

/-- New specification for owner review: when the urgent strip of an accepted
shape fits the pinned band, the shell's boxes satisfy G11 for exactly the
urgent occurrences of the shape. -/
theorem class_urgent (shape : ScreenShape) (accepted : accepts shape = true)
    (fit : stripFits shape = true) (v : Size) (hv : v ∈ viewports) :
    G11 v (urgentPaths shape) (classBoxes v shape) := by
  have fits : Fits shape := of_decide_eq_true accepted
  have perm := fits.2.1.map SlotShape.path
  change (shapeSources (splitShape shape).slots).Perm (shapeSources shape) at perm
  have unique := perm.nodup_iff.mpr fits.2.2
  have pinned := shell_urgent v hv (splitShape shape).banner.path (splitShape shape).bodyData
    (splitShape shape).commitData (splitShape shape).modalData (splitShape shape).stripData
    (by simpa only [parts_inventory] using unique) (strip_length shape)
  have paths : (splitShape shape).stripData.map Prod.fst = urgentPaths shape := by
    simp [Parts.stripData,splitShape,fit,pinnedSlot_true,urgentPaths,List.map_map,Function.comp_def]
  simpa only [paths,classBoxes] using pinned

theorem class_linked (shape : ScreenShape) (accepted : accepts shape = true) (v : Size) :
    Linked shape (classBoxes v shape) := by
  have fits : Fits shape := of_decide_eq_true accepted
  let p := splitShape shape
  have good : Good p := fits.1
  have perm : p.slots.Perm shape := fits.2.1
  rcases good with ⟨bannerRegion,bannerTarget,ordinaryRegions,commitRegion,modalRegion,_,stripRegion,_,_⟩
  intro box member
  simp only [classBoxes,placements,List.mem_append] at member
  rcases member with member | member | member | member
  · rcases base_cases v p.banner.path p.bodyData box member with rfl | rfl | ⟨entry,i,he,rfl⟩
    · simp [SourceLinked,Structural.scroller]
    · refine ⟨p.banner,perm.mem_iff.mp (by simp [Parts.slots]),rfl,?_,?_,?_,?_,?_,
        {Structural.slotText with maxLines := 4},by simp [Structural.banner],rfl⟩
      all_goals simp [Structural.banner,bannerRegion,bannerTarget]
    · have hentry : entry ∈ p.bodyData := by
        simpa using (List.mem_map.mpr ⟨(entry,i),he,rfl⟩ : entry ∈ p.bodyData.zipIdx.map Prod.fst)
      obtain ⟨slot,hs,rfl⟩ := List.mem_map.mp hentry
      obtain ⟨nb,nf,nm⟩ := ordinaryRegions slot hs
      refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,hs]),rfl,rfl,?_,?_,?_,?_,
        Structural.slotText,by simp [Structural.ordinary],rfl⟩
      all_goals simp [Structural.ordinary,nb,nf,nm]
  · obtain ⟨path,hpath,rfl⟩ := List.mem_map.mp member
    obtain ⟨slot,hs,rfl⟩ : ∃ slot ∈ p.commit, slot.path = path := by simpa [Parts.commitData] using hpath
    obtain ⟨reg,target⟩ := commitRegion slot hs
    refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,Option.mem_def.mp hs]),rfl,?_,?_,?_,?_,?_,footerText,
      by simp [footer],rfl⟩
    all_goals simp [footer,reg,target]
  · obtain ⟨entry,i,he,rfl⟩ := modal_cases v p.modalData box member
    have hentry : entry ∈ p.modalData := by
      simpa using (List.mem_map.mpr ⟨(entry,i),he,rfl⟩ : entry ∈ p.modalData.zipIdx.map Prod.fst)
    obtain ⟨slot,hs,rfl⟩ := List.mem_map.mp hentry
    have reg := modalRegion slot hs
    refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,hs]),rfl,rfl,?_,?_,?_,?_,Structural.slotText,
      by simp [modal],rfl⟩
    all_goals simp [modal,reg]
  · obtain ⟨entry,i,he,rfl⟩ := strip_cases v p.stripData box member
    have hentry : entry ∈ p.stripData := by
      simpa using (List.mem_map.mpr ⟨(entry,i),he,rfl⟩ : entry ∈ p.stripData.zipIdx.map Prod.fst)
    obtain ⟨slot,hs,rfl⟩ := List.mem_map.mp hentry
    have reg := stripRegion slot hs
    refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,hs]),rfl,rfl,?_,?_,?_,?_,footerText,
      by simp [strip],rfl⟩
    all_goals simp [strip,reg]

/-- All supported sizes, arbitrary record data and source-list lengths. A
current-task commit is fixed and visible even while a modal blocks dispatch. -/
theorem certifiedClass_allScreens (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, paint screen v = some painted ∧ Realizes screen v painted := by
  let ps := classBoxes v (screenShape screen)
  have rules := class_rules (screenShape screen) accepted v hv
  have linked := class_linked (screenShape screen) accepted v
  have checked : check (shapeSources (screenShape screen)) v ps = true := decide_eq_true rules
  refine ⟨ps.map (bindSemantic screen),?_,?_,?_,?_⟩
  · simp [paint,accepted,hv,ps]
  · simpa [List.map_map,Function.comp_def,bindSemantic_box,screenShape_sources,ps] using rules
  · simpa [List.map_map,Function.comp_def,bindSemantic_box,ps] using linked
  · intro d hd path hp
    obtain ⟨box,hbox,rfl⟩ := List.mem_map.mp hd
    rw [bindSemantic_box] at hp ⊢
    have hs : box.info.source = some path := Option.mem_def.mp hp
    have hl := linked box hbox
    unfold SourceLinked at hl
    rw [hs] at hl
    obtain ⟨slot,_,_,_,_,_,_,_,t,ht,safe⟩ := hl
    have htext : box.info.text = some t := Option.mem_def.mp ht
    have painted := bindSemantic_original screen box path t hs htext
    exact ⟨t,ht,safe,painted.1,painted.2,layoutAccepted_safety _ _ _ checked box hbox t ht safe _⟩

/-- New specification for owner review: the shell's painting of a screen whose
urgent strip fits is pinned (G11), in addition to `Realizes`. -/
theorem certifiedClass_urgent (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true) (fit : stripFits (screenShape screen) = true)
    (v : Size) (hv : v ∈ viewports) :
    ∃ painted, paint screen v = some painted ∧ Realizes screen v painted ∧
      G11 v (urgentPaths (screenShape screen)) (painted.map Drawn.box) := by
  obtain ⟨painted,paintedEq,realized⟩ := certifiedClass_allScreens screen accepted v hv
  refine ⟨painted,paintedEq,realized,?_⟩
  have same : painted = (classBoxes v (screenShape screen)).map (bindSemantic screen) := by
    simpa [paint,accepted,hv] using paintedEq.symm
  have geom : painted.map Drawn.box = classBoxes v (screenShape screen) := by
    simp [same,List.map_map,Function.comp_def,bindSemantic_box]
  rw [geom]
  exact class_urgent (screenShape screen) accepted fit v hv

/-- The real current-task source is present exactly once by G7/G9 and cannot
be hidden to obtain the no-commit exemption, including under an active modal. -/
theorem certified_currentCommit_visible (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true) (slot : SlotShape)
    (member : slot ∈ screenShape screen) (current : slot.region = .footer) :
    ∃ painted, paint screen ⟨92160,57600⟩ = some painted ∧
      ∃ d ∈ painted, d.box.info.source = some slot.path ∧ d.box.info.commit = true ∧
        d.box.info.target = true ∧ visible ⟨92160,57600⟩ d.box := by
  obtain ⟨painted,paintedEq,realized⟩ := certifiedClass_allScreens screen accepted ⟨92160,57600⟩ (by simp [viewports])
  exact ⟨painted,paintedEq,realized_currentCommit_visible screen _ painted realized slot member current rfl⟩

#print axioms bounds
#print axioms base_cases
#print axioms modal_cases
#print axioms strip_cases
#print axioms shell_cases
#print axioms modal_index
#print axioms strip_index
#print axioms base_flags
#print axioms base_not_urgent
#print axioms separated_symm
#print axioms base_footer
#print axioms banner_modal
#print axioms modals_separated
#print axioms base_strip
#print axioms footer_strip
#print axioms modal_strip
#print axioms strips_separated
#print axioms modal_visible
#print axioms footer_visible
#print axioms strip_visible
#print axioms has_modal
#print axioms base_active
#print axioms base_banner
#print axioms target_implies
#print axioms base_target_inactive
#print axioms footer_inactive
#print axioms base_no_modal
#print axioms base_rules
#print axioms filter_false
#print axioms banner_rule
#print axioms modal_rule
#print axioms zip_order
#print axioms targets
#print axioms capacity_lines
#print axioms escape_lines
#print axioms resize_text
#print axioms footer_fits
#print axioms strip_fits
#print axioms modal_fits
#print axioms text_rule
#print axioms horizontal
#print axioms contrast
#print axioms commit_rule
#print axioms repr_ne
#print axioms not_numeric
#print axioms modal_id_not_numeric
#print axioms modal_id_not_footer
#print axioms modal_id_injective
#print axioms strip_id_not_numeric
#print axioms strip_id_not_footer
#print axioms strip_id_not_modal
#print axioms strip_id_injective
#print axioms ids_unique
#print axioms source_count
#print axioms source_inventory
#print axioms sources_painted
#print axioms complete
#print axioms reading_order
#print axioms shell_rules
#print axioms shell_urgent
#print axioms parts_inventory
#print axioms rules_perm
#print axioms pinnedSlot_true
#print axioms pinnedSlot_false
#print axioms strip_length
#print axioms pinned_small
#print axioms class_rules
#print axioms class_urgent
#print axioms class_linked
#print axioms certifiedClass_allScreens
#print axioms certifiedClass_urgent
#print axioms certified_currentCommit_visible
end Ehr.Layout.Shell
