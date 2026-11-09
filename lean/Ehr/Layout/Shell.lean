import Ehr.Layout.Structural

/-! Fixed shell certificate: unbounded ordinary slots, one current-task commit,
and up to two fixed interruptive occurrences. Content is bound after geometry. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 200000
namespace Ehr.Layout.Shell
open Lean Ehr.Render
abbrev Body := List (List Nat × Bool)
def footerText : TextSlot := { Structural.slotText with maxLines := 1 }
/-- Fixed 24px commit row between the banner (ending at 104px) and body
(starting at 128px), outside every scroll space. -/
def footer (v : Size) (path : List Nat) : Placed :=
  { rect := ⟨1024,6656,v.w-2048,1536⟩,
    style := { fg := ⟨15,23,42⟩, z := 20 },
    info := { id := "fixed-commit", source := some path, text := some footerText, target := true, commit := true } }
def modalId (i : Nat) : String := if i = 0 then "fixed-modal-0" else "fixed-modal-1"
def modal (v : Size) (entry : List Nat × Bool) (i : Nat) : Placed :=
  { rect := ⟨1024,8192+i*3584,v.w-2048,3072⟩,
    style := { fg := ⟨15,23,42⟩, z := 100 },
    info := { id := modalId i, source := some entry.1, text := some Structural.slotText, target := entry.2, interruptive := true } }
def modalBoxes (v : Size) (ms : Body) : List Placed :=
  ms.zipIdx.map (fun (entry,i) => modal v entry i)
def placements (v : Size) (first : List Nat) (body : Body)
    (commit : Option (List Nat)) (ms : Body) : List Placed :=
  Structural.placements v first body ++ (commit.toList.map (footer v) ++ modalBoxes v ms)

def inventory (first : List Nat) (body : Body) (commit : Option (List Nat)) (ms : Body) : List (List Nat) :=
  (first :: body.map Prod.fst) ++ (commit.toList ++ ms.map Prod.fst)

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
/-- Every shell box is a structural box, the commit footer, or a fixed modal. -/
private theorem shell_cases {v first body commit ms p} (hp : p ∈ placements v first body commit ms) :
    p ∈ Structural.placements v first body ∨ (∃ path ∈ commit.toList, p = footer v path) ∨
    (p ∈ modalBoxes v ms ∧ ∃ entry i, (entry,i) ∈ ms.zipIdx ∧ p = modal v entry i) := by
  simp only [placements,List.mem_append,List.mem_map] at hp
  rcases hp with hp | ⟨path,h,rfl⟩ | hp
  · exact .inl hp
  · exact .inr (.inl ⟨path,h,rfl⟩)
  · exact .inr (.inr ⟨hp,modal_cases v ms p hp⟩)
private theorem modal_index (ms : Body) (limited : ms.length ≤ 2) (entry i)
    (member : (entry,i) ∈ ms.zipIdx) : i < 2 := by
  have := List.mem_zipIdx member
  omega
private theorem base_flags (v first body p) (hp : p ∈ Structural.placements v first body) :
    p.info.interruptive = false ∧ p.info.commit = false ∧ p.style.z ≤ 30 ∧
    ∃ n, p.info.id = Nat.repr n := by
  rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
  · exact ⟨rfl,rfl,by change (0 : Int) ≤ 30; decide,0,rfl⟩
  · exact ⟨rfl,rfl,by change (30 : Int) ≤ 30; decide,1,rfl⟩
  · exact ⟨rfl,rfl,by change (0 : Int) ≤ 30; decide,i+2,rfl⟩
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
private theorem modal_visible (v : Size) (hv : v ∈ viewports) (entry i) (limited : i < 2) :
    visible v (modal v entry i) := by
  obtain ⟨hw, hh⟩ := bounds v hv
  simp [visible,modal,Contains,viewportRect,Rect.right,Rect.bottom]
  omega
private theorem footer_visible (v : Size) (hv : v ∈ viewports) (path) : visible v (footer v path) := by
  obtain ⟨hw, hh⟩ := bounds v hv
  simp [visible,footer,Contains,viewportRect,Rect.right,Rect.bottom]
  omega
private theorem has_modal (v first body commit ms p) (hp : p ∈ modalBoxes v ms) :
    ((placements v first body commit ms).any (·.info.interruptive)) = true := by
  obtain ⟨e,i,_,same⟩ := modal_cases v ms p hp
  exact List.any_eq_true.mpr ⟨p,by simp [placements,hp],by rw [same]; rfl⟩
private theorem base_active (v first body commit ms p q)
    (hp : p ∈ Structural.placements v first body) (hq : q ∈ modalBoxes v ms)
    (active : activePaint (placements v first body commit ms) p = true) : p.info.banner = true := by
  have flags := (base_flags v first body p hp).1
  simpa only [activePaint,has_modal v first body commit ms q hq,flags,
    Bool.not_true,Bool.false_or] using active
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
private theorem base_target_inactive (v first body commit ms p q)
    (hp : p ∈ Structural.placements v first body) (hq : q ∈ modalBoxes v ms) :
    activeTarget (placements v first body commit ms) p = false := by
  simp [activeTarget,has_modal v first body commit ms q hq,(base_flags v first body p hp).1]
private theorem footer_inactive (v first body commit ms path q) (hq : q ∈ modalBoxes v ms) :
    activePaint (placements v first body commit ms) (footer v path) = false ∧
    activeTarget (placements v first body commit ms) (footer v path) = false := by
  simp [activePaint,activeTarget,footer,has_modal v first body commit ms q hq]

private theorem base_no_modal (v first body) :
    ((Structural.placements v first body).any (·.info.interruptive)) = false :=
  List.any_eq_false.mpr fun p hp => by simp [(base_flags v first body p hp).1]

private theorem base_rules (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) :
    Rules (first :: body.map Prod.fst) v (Structural.placements v first body) := by
  apply Structural.repeatBody_rules v hv
  exact (List.pairwise_append.mp unique).1

private theorem filter_false (xs : List α) : xs.filter (fun _ => false) = [] := by
  simp

private theorem banner_rule (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) : G1 v (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).1
  constructor
  · simpa [placements,List.filter_append,List.filter_map,footer,modalBoxes,modal,Function.comp_def,filter_false] using base.1
  · intro p hp flag
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · refine ⟨(base.2 p hp flag).1,?_⟩
      intro q hq paint different
      rcases shell_cases hq with hq | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
      · exact (base.2 p hp flag).2 q hq paint different
      · exact base_footer v first body p path hp
      · rw [base_banner v first body p hp flag]
        exact banner_modal v first e i
    · simp [footer] at flag
    · simp [modal] at flag

private theorem modal_rule (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (limited : ms.length ≤ 2) : G2 v (placements v first body commit ms) := by
  intro p hp flag
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩
  · simp [(base_flags v first body p hp).1] at flag
  · simp [footer] at flag
  · refine ⟨modal_visible v hv e i (modal_index ms limited e i hi),?_⟩
    intro q hq _ ordinary
    rcases shell_cases hq with hq | ⟨path,_,rfl⟩ | ⟨-,e,j,_,rfl⟩
    · have z := (base_flags v first body q hq).2.2.1
      change q.style.z < 100
      omega
    · change (20 : Int) < 100; decide
    · simp [modal] at ordinary

private theorem zip_order (xs : List α) : xs.zipIdx.Pairwise (fun a b => a.2 < b.2) := by
  apply List.pairwise_iff_getElem.mpr
  intro i j hi hj hij
  simpa using hij

private theorem targets (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) : G3 (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).2.2.1
  have hw := (bounds v hv).1
  constructor
  · intro p hp ht
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · exact base.1 p hp ht
    · simp only [footer]; omega
    · simp only [modal]; omega
  -- Pairs within the base, the footer and the modals; footer × modals; base × rest.
  · unfold placements
    refine List.pairwise_append.mpr ⟨?_,List.pairwise_append.mpr ⟨?_,?_,?_⟩,?_⟩
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
    · intro p hp q hq hpActive _
      obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
      have inactive := (footer_inactive v first body commit ms path q hq).2
      exact False.elim (Bool.noConfusion (inactive.symm.trans hpActive))
    · intro p hp q hq hpActive _
      rcases List.mem_append.mp hq with hq | hq
      · obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
        exact base_footer v first body p path hp
      · have inactive := base_target_inactive v first body commit ms p q hp hq
        exact False.elim (Bool.noConfusion (inactive.symm.trans hpActive))

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

private theorem modal_fits (v : Size) (hv : v ∈ viewports) (entry i) :
    textFits (modal v entry i) Structural.slotText := by
  have hw := (bounds v hv).1
  have metrics : Fonts.lineExtent[0]?.getD 2000 = 1453 := by decide_cbv
  have maximum : Fonts.maxAdvance[0]?.getD 0 = 1544 := by decide_cbv
  have units : Fonts.unitsPerEm[0]?.getD 1000 = 1000 := by decide_cbv
  have ready : escapeReady Structural.slotText = true := by decide_cbv
  change 0 < Fonts.tables.size ∧ 0 < Structural.slotText.fontSize ∧ _
  refine ⟨by decide_cbv,by decide,?_,?_,by decide,by change 2816 ≤ 3072; decide,?_,?_⟩
  · simp only [Structural.slotText,metrics]; decide
  · simp only [modal,capacity,cell,Structural.slotText,maximum,units]
    change 0 < (v.w-2048)/1384
    omega
  · intro _; exact ⟨rfl,ready⟩
  · intro impossible; contradiction

private theorem text_rule (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) (limited : ms.length ≤ 2) :
    G4 v (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).2.2.2.1
  refine ⟨?_,?_,?_⟩
  · intro p hp paint
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,hi,rfl⟩
    · exact base.1 p hp paint
    · exact (footer_visible v hv path).2
    · exact (modal_visible v hv e i (modal_index ms limited e i hi)).2
  · intro p hp t ht
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
    · exact base.2.1 p hp t ht
    · obtain rfl : footerText = t := by simpa [footer] using ht
      exact footer_fits v hv path
    · obtain rfl : Structural.slotText = t := by simpa [modal] using ht
      exact modal_fits v hv e i
  -- Overlapping active text: only base/base is left to the structural rule;
  -- every pair involving a modal or the footer is separated or inactive.
  · intro p hp ht active q hq paint different qactive above
    rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨hp,e,i,_,rfl⟩ <;>
      rcases shell_cases hq with hq | ⟨other,_,rfl⟩ | ⟨hq,f,j,_,rfl⟩
    · exact base.2.2 p hp ht (by simp [activePaint,base_no_modal]) q hq paint different
        (by simp [activePaint,base_no_modal]) above
    · exact base_footer v first body p other hp
    · rw [base_banner v first body p hp (base_active v first body commit ms p _ hp hq active)]
      exact banner_modal v first f j
    · exact separated_symm _ _ (base_footer v first body q path hq)
    · exact False.elim (different rfl)
    · simp [(footer_inactive v first body commit ms path _ hq).1] at active
    · rw [base_banner v first body q hq (base_active v first body commit ms q _ hq hp qactive)]
      exact separated_symm _ _ (banner_modal v first e i)
    · simp [(footer_inactive v first body commit ms other _ hp).1] at qactive
    · apply modals_separated v e f i j
      intro same; apply different; simp [modal,same]

private theorem horizontal (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) : G5 v (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).2.2.2.2.1
  have hw := (bounds v hv).1
  intro p hp
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · exact base p hp
  · simp [footer,envelope,Rect.right]; omega
  · simp [modal,envelope,Rect.right]; omega

private theorem contrast (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) : G6 (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).2.2.2.2.2.1
  have text : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ 9 = true := by decide_cbv
  have target : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ 6 = true := by decide_cbv
  intro p hp
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · exact base p hp
  · simp [footer,footerText,Structural.slotText,text,target]
  · simp [modal,Structural.slotText,text,target]

private theorem commit_rule (v : Size) (hv : v ∈ viewports) (first body commit ms) :
    G9 v (placements v first body commit ms) := by
  have noBase : (Structural.placements v first body).filter (·.info.commit) = [] :=
    List.filter_eq_nil_iff.mpr fun p hp => by simp [(base_flags v first body p hp).2.1]
  intro _ present
  cases commit with
  | none =>
    have absent : (placements v first body none ms).any (·.info.commit) = false := by
      simp [placements,List.any_append,List.any_map,Function.comp_def,modalBoxes,modal]
      intro p hp
      exact (base_flags v first body p hp).2.1
    simp [absent] at present
  | some path =>
    constructor
    · simp [placements,List.filter_append,noBase,footer,modalBoxes,List.filter_map,modal,Function.comp_def,filter_false]
    · intro p hp flag
      rcases shell_cases hp with hp | ⟨other,same,rfl⟩ | ⟨-,e,i,_,rfl⟩
      · simp [(base_flags v first body p hp).2.1] at flag
      · obtain rfl : other = path := by simpa using same
        exact ⟨rfl,footer_visible v hv other⟩
      · simp [modal] at flag

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

private theorem ids_unique (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) (limited : ms.length ≤ 2) :
    ((placements v first body commit ms).map (·.info.id)).Nodup := by
  have base := (base_rules v hv first body commit ms unique).2.2.2.2.2.2.1.1
  unfold placements
  simp only [List.map_append]
  refine List.nodup_append.mpr ⟨base,List.nodup_append.mpr ⟨?_,?_,?_⟩,?_⟩
  · cases commit <;> simp [footer]
  · unfold modalBoxes
    simp only [List.map_map,Function.comp_def]
    rw [List.nodup_iff_pairwise_ne,List.pairwise_map]
    apply (zip_order ms).imp_of_mem
    intro a b ha hb ordered same
    have := modal_id_injective a.2 b.2 (modal_index ms limited a.1 a.2 ha) (modal_index ms limited b.1 b.2 hb) same
    omega
  · intro id hid other hin sameId
    obtain ⟨p,hp,rfl⟩ := List.mem_map.mp hid
    obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
    obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
    obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
    exact modal_id_not_footer i (same.trans sameId.symm)
  · intro id hid other hin sameId
    obtain ⟨p,hp,rfl⟩ := List.mem_map.mp hid
    obtain ⟨n,hn⟩ := (base_flags v first body p hp).2.2.2
    rcases List.mem_append.mp hin with hin | hin
    · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
      obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
      exact repr_ne n "fixed-commit" (not_numeric _ (by simp)) (hn.symm.trans (sameId.trans same.symm))
    · obtain ⟨q,hq,same⟩ := List.mem_map.mp hin
      obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
      exact repr_ne n (modalId i) (modal_id_not_numeric i) (hn.symm.trans (sameId.trans same.symm))


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

private theorem source_inventory (v first body commit ms) :
    ((placements v first body commit ms).filterMap (·.info.source)) = inventory first body commit ms := by
  have bodyPaths : body.zipIdx.map (fun e => e.1.1) = body.map Prod.fst := by
    simpa only [List.map_map,Function.comp_def] using
      congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := body) (i := 0))
  have modalPaths : ms.zipIdx.map (fun e => e.1.1) = ms.map Prod.fst := by
    simpa only [List.map_map,Function.comp_def] using
      congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := ms) (i := 0))
  simp [placements,Structural.placements,Structural.scroller,Structural.banner,Structural.ordinary,
    footer,modalBoxes,modal,List.filterMap_append,List.filterMap_map,Function.comp_def,
    bodyPaths,modalPaths,inventory]

private theorem sources_painted (v first body commit ms) :
    ∀ p ∈ placements v first body commit ms, ∀ source ∈ p.info.source, p.info.paint = true := by
  intro p hp source hs
  rcases shell_cases hp with hp | ⟨path,_,rfl⟩ | ⟨-,e,i,_,rfl⟩
  · rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
    · simp [Structural.scroller] at hs
    all_goals rfl
  all_goals rfl

private theorem complete (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) (limited : ms.length ≤ 2) :
    G7 (inventory first body commit ms) (placements v first body commit ms) := by
  refine ⟨ids_unique v hv first body commit ms unique limited,unique,?_,?_⟩
  · intro path member
    rw [source_count _ path (sources_painted v first body commit ms),source_inventory,
      ← List.count_eq_length_filter]
    exact unique.count_of_mem member
  · intro p hp path hs
    refine ⟨?_,sources_painted v first body commit ms p hp path hs⟩
    rw [← source_inventory v first body commit ms]
    exact List.mem_filterMap.mpr ⟨p,hp,Option.mem_def.mp hs⟩

private theorem reading_order (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) : G8 (placements v first body commit ms) := by
  have base := (base_rules v hv first body commit ms unique).2.2.2.2.2.2.2.1
  let ink := fun p : Placed => p.info.paint && (p.info.target || p.info.text.isSome)
  have ff : (commit.toList.map (footer v)).filter ink = commit.toList.map (footer v) :=
    List.filter_eq_self.mpr fun p hp => by obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp; rfl
  have fm : (modalBoxes v ms).filter ink = modalBoxes v ms :=
    List.filter_eq_self.mpr fun p hp => by obtain ⟨e,i,_,rfl⟩ := modal_cases v ms p hp; simp [ink,modal]
  change ((placements v first body commit ms).filter ink).Pairwise _
  unfold placements
  rw [List.filter_append,List.filter_append,ff,fm]
  refine List.pairwise_append.mpr ⟨base,List.pairwise_append.mpr ⟨?_,?_,?_⟩,?_⟩
  · cases commit <;> simp
  · unfold modalBoxes
    rw [List.pairwise_map]
    apply (zip_order ms).imp
    intro a b ordered _
    simp only [modal,List.map_nil,↓reduceIte,before]
    omega
  · intro p hp q hq same
    obtain ⟨path,_,rfl⟩ := List.mem_map.mp hp
    obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
    simp [footer,modal] at same
  · intro p hp q hq same
    have hp := (List.mem_filter.mp hp).1
    rcases List.mem_append.mp hq with hq | hq
    · obtain ⟨path,_,rfl⟩ := List.mem_map.mp hq
      rcases base_cases v first body p hp with rfl | rfl | ⟨e,i,_,rfl⟩
      all_goals simp [Structural.scroller,Structural.banner,Structural.ordinary,footer] at same
    · obtain ⟨e,i,_,rfl⟩ := modal_cases v ms q hq
      have z := (base_flags v first body p hp).2.2.1
      change p.style.z = 100 at same
      omega

/-- Quantifies over arbitrary list sizes and content-independent occurrence
paths. G9 is nonvacuous when commit is present, including under an active modal. -/
theorem shell_rules (v : Size) (hv : v ∈ viewports) (first body commit ms)
    (unique : (inventory first body commit ms).Nodup) (limited : ms.length ≤ 2) :
    Rules (inventory first body commit ms) v (placements v first body commit ms) := by
  exact ⟨banner_rule v hv first body commit ms unique,modal_rule v hv first body commit ms limited,
    targets v hv first body commit ms unique,text_rule v hv first body commit ms unique limited,
    horizontal v hv first body commit ms unique,contrast v hv first body commit ms unique,
    complete v hv first body commit ms unique limited,reading_order v hv first body commit ms unique,
    commit_rule v hv first body commit ms⟩


structure Parts where
  banner : SlotShape
  body : List SlotShape
  commit : Option SlotShape
  modal : List SlotShape
  deriving Inhabited

def ordinaryRegion (s : SlotShape) : Bool :=
  s.region != .banner && s.region != .footer && s.region != .modal

def splitShape (shape : ScreenShape) : Parts :=
  ⟨shape.headD default,shape.filter ordinaryRegion,shape.find? (fun s => s.region == .footer),
    shape.filter (fun s => s.region == .modal)⟩
def Parts.slots (p : Parts) : ScreenShape := p.banner :: (p.body ++ (p.commit.toList ++ p.modal))
def Parts.bodyData (p : Parts) : Body := p.body.map (fun s => (s.path,s.target))
def Parts.commitData (p : Parts) : Option (List Nat) := p.commit.map SlotShape.path
def Parts.modalData (p : Parts) : Body := p.modal.map (fun s => (s.path,s.target))
def Good (p : Parts) : Prop :=
  p.banner.region = .banner ∧ p.banner.target = false ∧
  (∀ s ∈ p.body, s.region ≠ .banner ∧ s.region ≠ .footer ∧ s.region ≠ .modal) ∧
  (∀ s ∈ p.commit, s.region = .footer ∧ s.target = true) ∧
  (∀ s ∈ p.modal, s.region = .modal) ∧ p.modal.length ≤ 2
instance (p) : Decidable (Good p) := by unfold Good; infer_instance

def Fits (shape : ScreenShape) : Prop :=
  Good (splitShape shape) ∧ (splitShape shape).slots.Perm shape ∧ (shapeSources shape).Nodup
instance (shape) : Decidable (Fits shape) := by unfold Fits; infer_instance

def accepts (shape : ScreenShape) : Bool := decide (Fits shape)
def classBoxes (v : Size) (shape : ScreenShape) : List Placed :=
  let p := splitShape shape
  placements v p.banner.path p.bodyData p.commitData p.modalData

def paint (screen : UiScreen) (v : Size) : Option (List Drawn) :=
  if accepts (screenShape screen) && viewports.contains v then
    some ((classBoxes v (screenShape screen)).map (bindSemantic screen)) else none

private theorem parts_inventory (p : Parts) :
    inventory p.banner.path p.bodyData p.commitData p.modalData = shapeSources p.slots := by
  simp [inventory,Parts.bodyData,Parts.commitData,Parts.modalData,Parts.slots,shapeSources,
    List.map_map,Function.comp_def]
  cases p.commit <;> rfl

private theorem rules_perm (e f : List (List Nat)) (h : e.Perm f) (v : Size) (ps : List Placed)
    (rules : Rules e v ps) : Rules f v ps := by
  rcases rules with ⟨a,b,c,d,ee,ff,g,hh,i⟩
  refine ⟨a,b,c,d,ee,ff,?_,hh,i⟩
  rcases g with ⟨ids,paths,complete,linked⟩
  exact ⟨ids,h.nodup_iff.mp paths,fun path member => complete path (h.mem_iff.mpr member),
    fun p hp path hs => ⟨h.mem_iff.mp (linked p hp path hs).1,(linked p hp path hs).2⟩⟩

theorem class_rules (shape : ScreenShape) (accepted : accepts shape = true)
    (v : Size) (hv : v ∈ viewports) : Rules (shapeSources shape) v (classBoxes v shape) := by
  have fits : Fits shape := of_decide_eq_true accepted
  have perm := fits.2.1.map SlotShape.path
  change (shapeSources (splitShape shape).slots).Perm (shapeSources shape) at perm
  have unique := perm.nodup_iff.mpr fits.2.2
  have rules := shell_rules v hv (splitShape shape).banner.path (splitShape shape).bodyData
    (splitShape shape).commitData (splitShape shape).modalData
    (by simpa only [parts_inventory] using unique)
    (by simpa [Parts.modalData] using fits.1.2.2.2.2.2)
  apply rules_perm _ _ perm v _
  simpa only [parts_inventory,classBoxes] using rules

theorem class_linked (shape : ScreenShape) (accepted : accepts shape = true) (v : Size) :
    Linked shape (classBoxes v shape) := by
  have fits : Fits shape := of_decide_eq_true accepted
  let p := splitShape shape
  have good : Good p := fits.1
  have perm : p.slots.Perm shape := fits.2.1
  rcases good with ⟨bannerRegion,bannerTarget,ordinaryRegions,commitRegion,modalRegion,_⟩
  intro box member
  simp only [classBoxes,placements,List.mem_append] at member
  rcases member with member | member | member
  · rcases base_cases v p.banner.path p.bodyData box member with rfl | rfl | ⟨entry,i,he,rfl⟩
    · simp [SourceLinked,Structural.scroller]
    · refine ⟨p.banner,perm.mem_iff.mp (by simp [Parts.slots]),rfl,?_,?_,?_,?_,
        {Structural.slotText with maxLines := 4},by simp [Structural.banner],rfl⟩
      all_goals simp [Structural.banner,bannerRegion,bannerTarget]
    · have hentry : entry ∈ p.bodyData := by
        simpa using (List.mem_map.mpr ⟨(entry,i),he,rfl⟩ : entry ∈ p.bodyData.zipIdx.map Prod.fst)
      obtain ⟨slot,hs,rfl⟩ := List.mem_map.mp hentry
      obtain ⟨nb,nf,nm⟩ := ordinaryRegions slot hs
      refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,hs]),rfl,rfl,?_,?_,?_,
        Structural.slotText,by simp [Structural.ordinary],rfl⟩
      all_goals simp [Structural.ordinary,nb,nf,nm]
  · obtain ⟨path,hpath,rfl⟩ := List.mem_map.mp member
    obtain ⟨slot,hs,rfl⟩ : ∃ slot ∈ p.commit, slot.path = path := by simpa [Parts.commitData] using hpath
    obtain ⟨reg,target⟩ := commitRegion slot hs
    refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,Option.mem_def.mp hs]),rfl,?_,?_,?_,?_,footerText,
      by simp [footer],rfl⟩
    all_goals simp [footer,reg,target]
  · obtain ⟨entry,i,he,rfl⟩ := modal_cases v p.modalData box member
    have hentry : entry ∈ p.modalData := by
      simpa using (List.mem_map.mpr ⟨(entry,i),he,rfl⟩ : entry ∈ p.modalData.zipIdx.map Prod.fst)
    obtain ⟨slot,hs,rfl⟩ := List.mem_map.mp hentry
    have reg := modalRegion slot hs
    refine ⟨slot,perm.mem_iff.mp (by simp [Parts.slots,hs]),rfl,rfl,?_,?_,?_,Structural.slotText,
      by simp [modal],rfl⟩
    all_goals simp [modal,reg]

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
    obtain ⟨slot,_,_,_,_,_,_,t,ht,safe⟩ := hl
    have htext : box.info.text = some t := Option.mem_def.mp ht
    have painted := bindSemantic_original screen box path t hs htext
    exact ⟨t,ht,safe,painted.1,painted.2,layoutAccepted_safety _ _ _ checked box hbox t ht safe _⟩

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
#print axioms shell_cases
#print axioms modal_index
#print axioms base_flags
#print axioms separated_symm
#print axioms base_footer
#print axioms banner_modal
#print axioms modals_separated
#print axioms modal_visible
#print axioms footer_visible
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
#print axioms ids_unique
#print axioms source_count
#print axioms source_inventory
#print axioms sources_painted
#print axioms complete
#print axioms reading_order
#print axioms shell_rules
#print axioms parts_inventory
#print axioms rules_perm
#print axioms class_rules
#print axioms class_linked
#print axioms certifiedClass_allScreens
#print axioms certified_currentCommit_visible
end Ehr.Layout.Shell
