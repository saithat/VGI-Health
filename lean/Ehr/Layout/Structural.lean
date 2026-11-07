import Ehr.Layout.Family
import Std.Data.String.ToNat

/-! Parameterized structural placement. Ordinary source lists are unbounded;
fixed modal/commit regions are deliberately outside this first class. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 4000000
namespace Ehr.Layout.Structural
open Lean Ehr.Render

def clipRect (v : Size) : Rect := ⟨1024,8192,v.w-2048,v.h-9216⟩
def slotText : TextSlot := { safety := true, overflow := .scroll, maxLines := 2, lineHeight := 1408 }
def ordinary (v : Size) (path : List Nat) (target : Bool) (i : Nat) : Placed :=
  { rect := ⟨1024,8192+i*3584,v.w-2048,3072⟩,
    style := { fg := ⟨15,23,42⟩ },
    info := { id := Nat.repr (i+2), source := some path, text := some slotText, target },
    clip := some (clipRect v), clips := [("0",clipRect v)] }
def banner (v : Size) (path : List Nat) : Placed :=
  { rect := ⟨1024,512,v.w-2048,6144⟩,
    style := { fg := ⟨15,23,42⟩, z := 30 },
    info := { id := "1", source := some path, text := some { slotText with maxLines := 4 }, banner := true } }
def scroller (v : Size) : Placed :=
  { rect := clipRect v, style := {}, info := { id := "0", paint := false }, scroll := true }
def placements (v : Size) (first : List Nat) (rest : List (List Nat × Bool)) : List Placed :=
  scroller v :: banner v first :: rest.zipIdx.map (fun (p,i) => ordinary v p.1 p.2 i)

private theorem bounds (v : Size) (hv : v ∈ viewports) : 81920 ≤ v.w ∧ 51200 ≤ v.h := by
  simp only [viewports,List.mem_cons,List.not_mem_nil,or_false] at hv
  rcases hv with rfl | rfl | rfl <;> decide

private theorem ordinary_separated (v : Size) (p q : List Nat × Bool) (i j : Nat)
    (different : i ≠ j) : separated (ordinary v p.1 p.2 i) (ordinary v q.1 q.2 j) := by
  simp only [separated,ordinary,List.map_cons,List.map_nil,↓reduceIte,Apart,Rect.right,Rect.bottom]
  omega

private theorem ordinary_before (v : Size) (p q : List Nat × Bool) (i j : Nat)
    (ordered : i < j) : before (ordinary v p.1 p.2 i).rect (ordinary v q.1 q.2 j).rect := by
  simp only [ordinary,before]
  omega

private theorem banner_separated (v : Size) (path : List Nat) (p : List Nat × Bool) (i : Nat) :
    separated (banner v path) (ordinary v p.1 p.2 i) := by
  simp [separated,banner,ordinary,envelope,clipRect,Apart,Rect.bottom]

private theorem ordinary_text (v : Size) (hv : v ∈ viewports) (p : List Nat × Bool) (i : Nat) :
    textFits (ordinary v p.1 p.2 i) slotText := by
  have hw := (bounds v hv).1
  have metrics : Fonts.lineExtent[0]?.getD 2000 = 1453 := by decide_cbv
  have maximum : Fonts.maxAdvance[0]?.getD 0 = 1544 := by decide_cbv
  have units : Fonts.unitsPerEm[0]?.getD 1000 = 1000 := by decide_cbv
  have ready : escapeReady slotText = true := by decide_cbv
  change 0 < Fonts.tables.size ∧ 0 < slotText.fontSize ∧ _
  refine ⟨by decide_cbv, by decide, ?_, ?_, by decide, by change 2816 ≤ 3072; decide, ?_, ?_⟩
  · simp only [slotText,metrics]; decide
  · simp only [ordinary,capacity,cell,slotText,maximum,units]
    change 0 < (v.w-2048)/1384
    omega
  · intro _; exact ⟨rfl, ready⟩
  · intro impossible; contradiction

private theorem zip_order (xs : List α) : xs.zipIdx.Pairwise (fun a b => a.2 < b.2) := by
  apply List.pairwise_iff_getElem.mpr
  intro i j hi hj hij
  simpa using hij

private theorem body_order (v : Size) (xs : List (List Nat × Bool)) :
    (xs.zipIdx.map (fun (p,i) => ordinary v p.1 p.2 i)).Pairwise
      (fun p q => separated p q ∧ before p.rect q.rect) := by
  rw [List.pairwise_map]
  apply (zip_order xs).imp
  intro a b hab
  exact ⟨ordinary_separated v a.1 b.1 a.2 b.2 (by omega),ordinary_before v a.1 b.1 a.2 b.2 hab⟩

private theorem targets (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) : G3 (placements v first xs) := by
  have hw := (bounds v hv).1
  constructor
  · intro p hp ht
    simp only [placements,List.mem_cons] at hp
    rcases hp with rfl | rfl | hp
    · simp [scroller] at ht
    · simp [banner] at ht
    · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
      simp only [ordinary]
      omega
  · simp only [placements,List.pairwise_cons]
    refine ⟨?_,?_,?_⟩
    · intro q _ h; simp [activeTarget,scroller] at h
    · intro q _ h; simp [activeTarget,banner] at h
    · apply (body_order v xs).imp
      intro p q h _ _
      exact h.1

private theorem no_modal (v : Size) (first : List Nat) (xs : List (List Nat × Bool)) :
    G2 v (placements v first xs) := by
  intro p hp ht
  simp only [placements,List.mem_cons] at hp
  rcases hp with rfl | rfl | hp
  · simp [scroller] at ht
  · simp [banner] at ht
  · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp [ordinary] at ht

private theorem no_commit (v : Size) (first : List Nat) (xs : List (List Nat × Bool)) :
    G9 v (placements v first xs) := by
  apply G9_exempt
  simp [placements,scroller,banner,ordinary,List.any_map,Function.comp_def]

private theorem reading_order (v : Size) (first : List Nat) (xs : List (List Nat × Bool)) :
    G8 (placements v first xs) := by
  have filtered : (xs.zipIdx.map (fun (p,i) => ordinary v p.1 p.2 i)).filter
      (fun p => p.info.paint && (p.info.target || p.info.text.isSome)) =
      xs.zipIdx.map (fun (p,i) => ordinary v p.1 p.2 i) := by
    apply List.filter_eq_self.mpr
    intro p hp
    obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp [ordinary]
  unfold G8 placements
  simp only [List.filter_cons,show (scroller v).info.paint = false from rfl,
    Bool.false_and, Bool.false_eq_true, ↓reduceIte]
  rw [show ((banner v first).info.paint && ((banner v first).info.target ||
    (banner v first).info.text.isSome)) = true from rfl]
  simp only [↓reduceIte,filtered,List.pairwise_cons]
  constructor
  · intro p hp hz
    obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp [banner,ordinary] at hz
  · rw [List.pairwise_map]
    apply (zip_order xs).imp
    intro a b h _
    simpa only [ordinary,List.map_cons,List.map_nil,↓reduceIte] using
      ordinary_before v a.1 b.1 a.2 b.2 h


private theorem banner_text (v : Size) (hv : v ∈ viewports) (path : List Nat) :
    textFits (banner v path) { slotText with maxLines := 4 } := by
  have hw := (bounds v hv).1
  have base := ordinary_text v hv (path,false) 0
  rcases base with ⟨a,b,c,d,_,_,e,f⟩
  exact ⟨a,b,c,d,by decide,by change 5632 ≤ 6144; decide,e,by intro impossible; contradiction⟩

private theorem contained (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) :
    ∀ p ∈ placements v first xs, Contains (viewportRect v) (envelope p) := by
  have hw := (bounds v hv).1
  have hh := (bounds v hv).2
  intro p hp
  simp only [placements,List.mem_cons] at hp
  rcases hp with rfl | rfl | hp
  · simp only [scroller,envelope,List.getLast?_nil,Option.map_none,Option.getD_none,
      clipRect,Contains,viewportRect,Rect.right,Rect.bottom]
    omega
  · simp only [banner,envelope,List.getLast?_nil,Option.map_none,Option.getD_none,
      Contains,viewportRect,Rect.right,Rect.bottom]
    omega
  · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp only [ordinary,envelope,List.getLast?_singleton,Option.map_some,Option.getD_some,
      clipRect,Contains,viewportRect,Rect.right,Rect.bottom]
    omega

private theorem banner_rule (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) : G1 v (placements v first xs) := by
  constructor
  · simp [placements,List.filter_map,scroller,banner,ordinary,Function.comp_def]
  · intro p hp hb
    simp only [placements,List.mem_cons] at hp
    rcases hp with rfl | rfl | hp
    · simp [scroller] at hb
    · constructor
      · exact ⟨rfl,by simpa only [envelope,banner,List.getLast?_nil,Option.map_none,Option.getD_none] using contained v hv first xs (banner v first) (by simp [placements])⟩
      · intro q hq paint different
        simp only [placements,List.mem_cons] at hq
        rcases hq with rfl | rfl | hq
        · simp [scroller] at paint
        · exact False.elim (different rfl)
        · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hq
          exact banner_separated v first a i
    · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
      simp [ordinary] at hb

private theorem horizontal (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) : G5 v (placements v first xs) := by
  have hw := (bounds v hv).1
  intro p hp
  simp only [placements,List.mem_cons] at hp
  rcases hp with rfl | rfl | hp
  · simp only [scroller,envelope,List.getLast?_nil,Option.map_none,Option.getD_none,
      clipRect,Rect.right]; omega
  · simp only [banner,envelope,List.getLast?_nil,Option.map_none,Option.getD_none,
      Rect.right]; omega
  · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp only [ordinary,envelope,List.getLast?_singleton,Option.map_some,Option.getD_some,
      clipRect,Rect.right]; omega

private theorem contrast (v : Size) (first : List Nat) (xs : List (List Nat × Bool)) :
    G6 (placements v first xs) := by
  have text : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ 9 = true := by decide_cbv
  have target : contrastPass ⟨15,23,42⟩ ⟨255,255,255⟩ 6 = true := by decide_cbv
  intro p hp
  simp only [placements,List.mem_cons] at hp
  rcases hp with rfl | rfl | hp
  · simp [scroller]
  · simp [banner,slotText,text]
  · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
    simp [ordinary,slotText,text,target]

private theorem separated_symm (p q : Placed) (h : separated p q) : separated q p := by
  unfold separated at *
  split at h
  next same => rw [ite_eq_left same.symm]; simp only [Apart] at *; omega
  next different => rw [ite_eq_right (fun h => different h.symm)]; simp only [Apart] at *; omega

private theorem text_rule (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) : G4 v (placements v first xs) := by
  refine ⟨fun p hp _ => contained v hv first xs p hp, ?_, ?_⟩
  · intro p hp t ht
    simp only [placements,List.mem_cons] at hp
    rcases hp with rfl | rfl | hp
    · simp [scroller] at ht
    · have same : t = { slotText with maxLines := 4 } := by simpa [banner] using ht.symm
      subst t; exact banner_text v hv first
    · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
      have same : t = slotText := by simpa [ordinary] using ht.symm
      subst t; exact ordinary_text v hv a i
  · intro p hp ht _ q hq paint different _ _
    simp only [placements,List.mem_cons] at hp hq
    rcases hp with rfl | rfl | hp
    · simp [scroller] at ht
    · rcases hq with rfl | rfl | hq
      · simp [scroller] at paint
      · exact False.elim (different rfl)
      · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hq
        exact banner_separated v first a i
    · obtain ⟨⟨a,i⟩,_,rfl⟩ := List.mem_map.mp hp
      rcases hq with rfl | rfl | hq
      · simp [scroller] at paint
      · exact separated_symm _ _ (banner_separated v first a i)
      · obtain ⟨⟨b,j⟩,_,rfl⟩ := List.mem_map.mp hq
        apply ordinary_separated v a b i j
        intro same; apply different; simp [ordinary,same]


private theorem sources_count (v : Size) (first path : List Nat) (xs : List (List Nat × Bool)) :
    ((placements v first xs).filter (fun p => p.info.source == some path && p.info.paint)).length =
    ((first :: xs.map Prod.fst).filter (· == path)).length := by
  have body : ((xs.zipIdx.map (fun (p,i) => ordinary v p.1 p.2 i)).filter
      (fun p => p.info.source == some path && p.info.paint)).length =
      ((xs.map Prod.fst).filter (· == path)).length := by
    calc
      _ = (xs.zipIdx.filter (fun e => e.1.1 == path)).length := by
        simp [List.filter_map,ordinary,Function.comp_def]
      _ = ((xs.zipIdx.map (fun e => e.1.1)).filter (· == path)).length := by
        simp [List.filter_map,Function.comp_def]
      _ = _ := by rw [show xs.zipIdx.map (fun e => e.1.1) = xs.map Prod.fst from by
        simpa only [List.map_map,Function.comp_def] using congrArg (List.map Prod.fst) (List.zipIdx_map_fst (l := xs) (i := 0))]
  simp only [placements,List.filter_cons,show (scroller v).info.source = none from rfl,
    Option.none_beq_some,Bool.false_and,Bool.false_eq_true,↓reduceIte,
    show (banner v first).info.source = some first from rfl,
    show (banner v first).info.paint = true from rfl,Option.some_beq_some,Bool.and_true]
  split <;> simp_all only [List.length_cons]

private theorem ids_unique (v : Size) (first : List Nat) (xs : List (List Nat × Bool)) :
    ((placements v first xs).map (·.info.id)).Nodup := by
  simp only [placements,List.map_cons,List.map_map,Function.comp_def,scroller,banner,ordinary,
    List.nodup_cons]
  refine ⟨?_,?_,?_⟩
  · simp only [List.mem_cons,List.mem_map,not_or,not_exists]
    constructor
    · decide
    · intro ⟨a,i⟩ ⟨_,same⟩
      have eq := Nat.repr_injective (show Nat.repr (i+2) = Nat.repr 0 from same)
      omega
  · simp only [List.mem_map,not_exists]
    intro ⟨a,i⟩ ⟨_,same⟩
    have eq := Nat.repr_injective (show Nat.repr (i+2) = Nat.repr 1 from same)
    omega
  · rw [List.nodup_iff_pairwise_ne,List.pairwise_map]
    apply (zip_order xs).imp
    intro a b ordered same
    have eq := Nat.repr_injective same
    omega

/-- G7 needs a structural uniqueness condition, never a patient-data bound. -/
private theorem complete (v : Size) (first : List Nat) (xs : List (List Nat × Bool))
    (unique : (first :: xs.map Prod.fst).Nodup) :
    G7 (first :: xs.map Prod.fst) (placements v first xs) := by
  refine ⟨ids_unique v first xs,unique,?_,?_⟩
  · intro path hp
    rw [sources_count, ← List.count_eq_length_filter]
    exact unique.count_of_mem hp
  · intro p hp path hs
    simp only [placements,List.mem_cons] at hp
    rcases hp with rfl | rfl | hp
    · simp [scroller] at hs
    · have same : first = path := by simpa [banner] using hs
      subst path; simp [banner]
    · obtain ⟨⟨a,i⟩,ha,rfl⟩ := List.mem_map.mp hp
      have same : a.1 = path := by simpa [ordinary] using hs
      subst path
      exact ⟨List.mem_cons_of_mem _ (List.mem_map.mpr ⟨a,(by simpa using (List.mem_map.mpr ⟨(a,i),ha,rfl⟩ : a ∈ xs.zipIdx.map Prod.fst)),rfl⟩),rfl⟩

/-- One class certificate covers every list length, interaction mask and set of
unique semantic paths. Neither list length nor source strings are checked by
repeating a geometry probe. This first class has no fixed commit/modal slots. -/
theorem repeatBody_rules (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) (unique : (first :: xs.map Prod.fst).Nodup) :
    Rules (first :: xs.map Prod.fst) v (placements v first xs) := by
  exact ⟨banner_rule v hv first xs,no_modal v first xs,targets v hv first xs,
    text_rule v hv first xs,horizontal v hv first xs,contrast v first xs,
    complete v first xs unique,reading_order v first xs,no_commit v first xs⟩


/-- A regular structural class: one noninteractive fixed banner followed by an
arbitrary list of ordinary slots. Paths, targets, rows and text are parameters.
Commit/modal slots are declined, never relabelled to obtain an exemption. -/
def Fits : ScreenShape → Prop
  | [] => False
  | b :: rest => b.region = .banner ∧ b.target = false ∧
      (∀ s ∈ rest, s.region ≠ .banner ∧ s.region ≠ .footer ∧ s.region ≠ .modal) ∧
      (shapeSources (b :: rest)).Nodup
instance (shape : ScreenShape) : Decidable (Fits shape) := by
  cases shape <;> unfold Fits <;> infer_instance

def accepts (shape : ScreenShape) : Bool := decide (Fits shape)

def classBoxes (v : Size) : ScreenShape → List Placed
  | [] => []
  | b :: rest => placements v b.path (rest.map fun s => (s.path,s.target))

def paint (screen : UiScreen) (v : Size) : Option (List Drawn) :=
  if accepts (screenShape screen) && viewports.contains v then
    some ((classBoxes v (screenShape screen)).map (bindSemantic screen)) else none

theorem class_rules (shape : ScreenShape) (accepted : accepts shape = true)
    (v : Size) (hv : v ∈ viewports) : Rules (shapeSources shape) v (classBoxes v shape) := by
  have fits := of_decide_eq_true accepted
  cases shape with
  | nil => contradiction
  | cons b rest =>
    have unique : (b.path :: (rest.map fun s => (s.path,s.target)).map Prod.fst).Nodup := by
      simpa [shapeSources,List.map_map,Function.comp_def] using fits.2.2.2
    simpa [classBoxes,shapeSources,List.map_map,Function.comp_def] using
      repeatBody_rules v hv b.path (rest.map fun s => (s.path,s.target)) unique

theorem class_linked (shape : ScreenShape) (accepted : accepts shape = true) (v : Size) :
    Linked shape (classBoxes v shape) := by
  have fits := of_decide_eq_true accepted
  cases shape with
  | nil => contradiction
  | cons b rest =>
    rcases fits with ⟨bannerRegion,bannerTarget,ordinaryRegions,_⟩
    intro p hp
    simp only [classBoxes,placements,List.mem_cons] at hp
    rcases hp with rfl | rfl | hp
    · simp [SourceLinked,scroller]
    · simp only [SourceLinked,banner]
      refine ⟨b,by simp,rfl,?_,?_,?_,?_,{slotText with maxLines := 4},by simp,rfl⟩
      all_goals simp [bannerRegion,bannerTarget]
    · obtain ⟨⟨a,i⟩,ha,rfl⟩ := List.mem_map.mp hp
      have member : a ∈ rest.map (fun s => (s.path,s.target)) := by
        simpa using (List.mem_map.mpr ⟨(a,i),ha,rfl⟩ : a ∈ ((rest.map fun s => (s.path,s.target)).zipIdx).map Prod.fst)
      obtain ⟨s,hs,rfl⟩ := List.mem_map.mp member
      obtain ⟨nb,nf,nm⟩ := ordinaryRegions s hs
      simp only [SourceLinked,ordinary]
      exact ⟨s,by simp [hs],rfl,rfl,by simp [nb],by simp [nf],by simp [nm],slotText,by simp,rfl⟩

/-- A single kernel-checked certificate for every member of this structural
class, including unbounded numbers of independently actionable ordinary slots.
`accepted` checks class membership only; it never rechecks geometry or payload. -/
theorem certifiedClass_allScreens (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, paint screen v = some painted ∧ Realizes screen v painted := by
  let ps := classBoxes v (screenShape screen)
  have rules := class_rules (screenShape screen) accepted v hv
  have linked := class_linked (screenShape screen) accepted v
  have checked : check (shapeSources (screenShape screen)) v ps = true := by
    exact decide_eq_true rules
  refine ⟨ps.map (bindSemantic screen),?_,?_,?_,?_⟩
  · simp [paint,accepted,hv,ps]
  · simpa [List.map_map,Function.comp_def,bindSemantic_box,screenShape_sources,ps] using rules
  · simpa [List.map_map,Function.comp_def,bindSemantic_box,ps] using linked
  · intro d hd path hp
    obtain ⟨p,hpMem,rfl⟩ := List.mem_map.mp hd
    rw [bindSemantic_box] at hp ⊢
    have hs : p.info.source = some path := Option.mem_def.mp hp
    have hl := linked p hpMem
    unfold SourceLinked at hl
    rw [hs] at hl
    obtain ⟨slot,_,_,_,_,_,_,t,ht,hsafe⟩ := hl
    have htEq : p.info.text = some t := Option.mem_def.mp ht
    have painted := bindSemantic_original screen p path t hs htEq
    exact ⟨t,ht,hsafe,painted.1,painted.2,
      layoutAccepted_safety _ _ _ checked p hpMem t ht hsafe _⟩


#print axioms bounds
#print axioms ordinary_separated
#print axioms ordinary_before
#print axioms banner_separated
#print axioms ordinary_text
#print axioms zip_order
#print axioms body_order
#print axioms targets
#print axioms no_modal
#print axioms no_commit
#print axioms reading_order
#print axioms banner_text
#print axioms contained
#print axioms banner_rule
#print axioms horizontal
#print axioms contrast
#print axioms separated_symm
#print axioms text_rule
#print axioms sources_count
#print axioms ids_unique
#print axioms complete
#print axioms repeatBody_rules
#print axioms class_rules
#print axioms class_linked
#print axioms certifiedClass_allScreens
end Ehr.Layout.Structural
