import Ehr.Layout.Shell

/-! Structural range lemmas. They inspect occurrence paths and the renderer's
fixed modal grammar; payload strings, rows, lists and patients remain arbitrary. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 200000
namespace Ehr.Layout.Range
open Lean Ehr.Render
abbrev Entry := List Nat × UiNode
def paths (entries : List Entry) := entries.map Prod.fst
def prefixAt (n : Nat) (children : List (List Entry)) : List Entry :=
  (children.zipIdx n).flatMap fun (es,i) => es.map fun (path,node) => (i::path,node)

private theorem zip_order (xs : List α) (n : Nat) : (xs.zipIdx n).Pairwise (fun a b => a.2 < b.2) := by
  apply List.pairwise_iff_getElem.mpr
  intro i j hi hj hij
  simp only [List.getElem_zipIdx]
  omega

private theorem prefix_bounds (n : Nat) (children : List (List Entry)) (entry : Entry)
    (member : entry ∈ prefixAt n children) :
    ∃ i suffix, entry.1 = i::suffix ∧ n ≤ i ∧ i < n+children.length := by
  obtain ⟨⟨es,i⟩,hi,he⟩ := List.mem_flatMap.mp member
  obtain ⟨⟨suffix,node⟩,_,same⟩ := List.mem_map.mp he
  have bound := List.mem_zipIdx hi
  exact ⟨i,suffix,congrArg Prod.fst same.symm,by omega,by omega⟩

private theorem prefix_no_nil (n : Nat) (children : List (List Entry)) :
    [] ∉ paths (prefixAt n children) := by
  intro member
  obtain ⟨entry,he,same⟩ := List.mem_map.mp member
  obtain ⟨i,suffix,head,_,_⟩ := prefix_bounds n children entry he
  simp [same] at head

private theorem prefix_unique (n : Nat) (children : List (List Entry))
    (unique : ∀ es ∈ children, (paths es).Nodup) : (paths (prefixAt n children)).Nodup := by
  unfold paths prefixAt
  rw [List.map_flatMap]
  simp only [List.map_map,Function.comp_def]
  apply List.pairwise_flatMap.mpr
  constructor
  · intro a ha
    have esMember : a.1 ∈ children := by
      simpa using (List.mem_map.mpr ⟨a,ha,rfl⟩ : a.1 ∈ (children.zipIdx n).map Prod.fst)
    have h := unique a.1 esMember
    change (a.1.map Prod.fst).Pairwise (· ≠ ·) at h
    rw [List.pairwise_map] at h
    simp only [List.pairwise_map]
    apply h.imp
    intro x y different same
    exact different (List.cons.inj same).2
  · apply (zip_order children n).imp
    intro a b ordered x hx y hy same
    obtain ⟨u,_,rfl⟩ := List.mem_map.mp hx
    obtain ⟨w,_,rfl⟩ := List.mem_map.mp hy
    have equal := (List.cons.inj same).1
    omega

private theorem children_unique (cs : List UiNode)
    (unique : ∀ node ∈ cs, (paths (semanticNodes node)).Nodup) :
    (paths (prefixChildren (cs.map semanticNodes))).Nodup := by
  apply prefix_unique 0
  intro es hes
  obtain ⟨node,member,rfl⟩ := List.mem_map.mp hes
  exact unique node member

private theorem wrap_unique (node : UiNode) (cs : List UiNode)
    (unique : ∀ child ∈ cs, (paths (semanticNodes child)).Nodup) :
    (paths (([],node) :: prefixChildren (cs.map semanticNodes))).Nodup := by
  exact List.nodup_cons.mpr ⟨prefix_no_nil 0 _,children_unique cs unique⟩

/-- Arbitrary nested semantic trees have unique occurrence paths, even with
repeated component IDs, duplicate labels and unbounded generated child lists. -/
theorem semanticNodes_unique (node : UiNode) : (paths (semanticNodes node)).Nodup := by
  induction node using UiNode.rec (motive_2 := fun cs => ∀ child ∈ cs, (paths (semanticNodes child)).Nodup) with
  | board urgent cs ih => simpa only [semanticNodes] using wrap_unique (.board urgent cs) cs ih
  | patientPane patient banner metadata cs ms ih im =>
    have both : ∀ child ∈ cs++ms, (paths (semanticNodes child)).Nodup := by
      intro child member
      rcases List.mem_append.mp member with member | member
      · exact ih child member
      · exact im child member
    simpa only [semanticNodes,List.map_append] using wrap_unique (.patientPane patient banner metadata cs ms) (cs++ms) both
  | datedTimeline title dated undated cs ih => simpa only [semanticNodes] using wrap_unique (.datedTimeline title dated undated cs) cs ih
  | timeline title cs ih => simpa only [semanticNodes] using wrap_unique (.timeline title cs) cs ih
  | presentation kind cs ih => simpa only [semanticNodes] using wrap_unique (.presentation kind cs) cs ih
  | valueSet options custom cs ih => simpa only [semanticNodes] using wrap_unique (.valueSet options custom cs) cs ih
  | chartReferences refs cs ih => simpa only [semanticNodes] using wrap_unique (.chartReferences refs cs) cs ih
  | rowAction target row cs ih => simpa only [semanticNodes] using wrap_unique (.rowAction target row cs) cs ih
  | «section» id title cs ih => simpa only [semanticNodes] using wrap_unique (.section id title cs) cs ih
  | columns cs ih => simpa only [semanticNodes] using wrap_unique (.columns cs) cs ih
  | tabs id labels selected cs ih => simpa only [semanticNodes] using wrap_unique (.tabs id labels selected cs) cs ih
  | nil => rename_i child member; cases member
  | cons node cs ih im =>
    rename_i child member
    rcases List.mem_cons.mp member with rfl | member
    · exact ih
    · exact im child member
  | _ => simp [paths,semanticNodes]

theorem screenNodes_unique (screen : UiScreen) : (paths (screenNodes screen)).Nodup := by
  apply prefix_unique 0
  intro es hes
  obtain ⟨node,_,rfl⟩ := List.mem_map.mp hes
  exact semanticNodes_unique node

theorem screenShape_unique (screen : UiScreen) : (shapeSources (screenShape screen)).Nodup := by
  rw [screenShape_sources]
  exact screenNodes_unique screen


private theorem regions_partition (shape : ScreenShape)
    (noBanner : ∀ slot ∈ shape, slot.region ≠ .banner) :
    shape.Perm (shape.filter Shell.ordinaryRegion ++
      (shape.filter (fun s => s.region == .footer) ++ shape.filter (fun s => s.region == .modal))) := by
  induction shape with
  | nil => simp
  | cons slot rest ih =>
    have nb := noBanner slot (by simp)
    have hr : ∀ s ∈ rest, s.region ≠ .banner := fun s hs => noBanner s (by simp [hs])
    have h := ih hr
    cases reg : slot.region with
    | banner => exact False.elim (nb reg)
    | title | body | side =>
      simpa [List.filter_cons,Shell.ordinaryRegion,reg] using h.cons slot
    | footer =>
      simpa [List.filter_cons,Shell.ordinaryRegion,reg] using
        (h.cons slot).trans (List.perm_middle.symm)
    | modal =>
      have moved := (List.perm_middle (a := slot)
        (l₁ := rest.filter Shell.ordinaryRegion ++ rest.filter (fun s => s.region == .footer))
        (l₂ := rest.filter (fun s => s.region == .modal))).symm
      simpa [List.filter_cons,Shell.ordinaryRegion,reg,List.append_assoc] using (h.cons slot).trans
        (by simpa only [List.append_assoc] using moved)

private theorem filter_find (shape : ScreenShape) (p : SlotShape → Bool)
    (small : (shape.filter p).length ≤ 1) : (shape.find? p).toList = shape.filter p := by
  rw [← List.head?_filter]
  generalize shape.filter p = found at *
  cases found with
  | nil => rfl
  | cons first rest =>
    have empty : rest = [] := List.length_eq_zero_iff.mp (by simp only [List.length_cons] at small; omega)
    subst rest; rfl

private theorem fits_of_shape (b : SlotShape) (rest : ScreenShape)
    (bannerRegion : b.region = .banner) (bannerTarget : b.target = false)
    (noBanner : ∀ slot ∈ rest, slot.region ≠ .banner)
    (footerTarget : ∀ slot ∈ b::rest, slot.region = .footer → slot.target = true)
    (footerSmall : ((b::rest).filter (fun s => s.region == .footer)).length ≤ 1)
    (modalSmall : ((b::rest).filter (fun s => s.region == .modal)).length ≤ 2)
    (unique : (shapeSources (b::rest)).Nodup) : Shell.Fits (b::rest) := by
  constructor
  · refine ⟨bannerRegion,bannerTarget,?_,?_,?_,modalSmall⟩
    · intro slot hs
      have h := (List.mem_filter.mp hs).2
      simpa [Shell.ordinaryRegion,Bool.and_eq_true,and_assoc] using h
    · intro slot hs
      have found : (b::rest).find? (fun s => s.region == .footer) = some slot := Option.mem_def.mp hs
      have member := List.mem_of_find?_eq_some found
      have reg : slot.region = .footer := by simpa using List.find?_some found
      exact ⟨reg,footerTarget slot member reg⟩
    · intro slot hs
      simpa using (List.mem_filter.mp hs).2
  · refine ⟨?_,unique⟩
    have partition := regions_partition rest noBanner
    have found := filter_find rest (fun s => s.region == .footer)
      (by simpa [bannerRegion] using footerSmall)
    simpa [Shell.Parts.slots,Shell.splitShape,List.filter_cons,Shell.ordinaryRegion,
      bannerRegion,found] using (partition.cons b).symm

/-- A normalization of the existing shape adapter, definitionally equal to it.
Keeping it here makes every range argument depend on the actual adapter. -/
def commitPath (screen : UiScreen) : Option (List Nat) :=
  ((screenNodes screen).find? (fun e => semanticCommit e.2)).map Prod.fst

def regionOf (screen : UiScreen) (path : List Nat) : Region :=
  if path == [0] then .banner else if path == [1] then .title
  else if some path == commitPath screen then .footer
  else if screen.modal.isSome && path.head? == some (3+screen.workspace.length+screen.side.length) then .modal
  else if path.head?.getD 0 == 2 || (path.head?.getD 0 ≥ 3+screen.workspace.length &&
    path.head?.getD 0 < 3+screen.workspace.length+screen.side.length) then .side else .body

def entryShape (screen : UiScreen) (entry : Entry) : SlotShape :=
  ⟨entry.1,semanticTarget entry.2,regionOf screen entry.1,match entry.2 with
    | .section .. | .columns .. | .presentation .. | .text .. | .tabs .. => 1
    | .info .. => 3 | _ => 2⟩

theorem screenShape_normal (screen : UiScreen) : screenShape screen = (screenNodes screen).map (entryShape screen) := rfl

private theorem region_banner (screen : UiScreen) (path : List Nat) :
    regionOf screen path = .banner ↔ path = [0] := by
  constructor
  · intro eq
    unfold regionOf at eq
    split at eq
    · simpa using ‹(path == [0]) = true›
    · split at eq
      · contradiction
      · split at eq
        · contradiction
        · split at eq
          · contradiction
          · split at eq <;> contradiction
  · intro same; simp [regionOf,same]

private theorem region_footer (screen : UiScreen) (path : List Nat)
    (footer : regionOf screen path = .footer) : some path = commitPath screen := by
  unfold regionOf at footer
  split at footer
  · contradiction
  · split at footer
    · contradiction
    · split at footer
      · simpa using ‹(some path == commitPath screen) = true›
      · split at footer
        · contradiction
        · split at footer <;> contradiction

private theorem region_modal (screen : UiScreen) (path : List Nat)
    (modal : regionOf screen path = .modal) :
    screen.modal.isSome = true ∧ path.head? = some (3+screen.workspace.length+screen.side.length) := by
  unfold regionOf at modal
  split at modal
  · contradiction
  · split at modal
    · contradiction
    · split at modal
      · contradiction
      · split at modal
        · simpa only [Bool.and_eq_true,beq_iff_eq] using
            ‹(screen.modal.isSome && path.head? == some (3+screen.workspace.length+screen.side.length)) = true›
        · split at modal <;> contradiction

private theorem entry_unique (entries : List Entry) (unique : (paths entries).Nodup)
    (a b : Entry) (ha : a ∈ entries) (hb : b ∈ entries) (same : a.1 = b.1) : a = b := by
  induction entries with
  | nil => simp at ha
  | cons first rest ih =>
    simp only [paths,List.map_cons,List.nodup_cons] at unique
    simp only [List.mem_cons] at ha hb
    rcases ha with rfl | ha <;> rcases hb with rfl | hb
    · rfl
    · exact False.elim (unique.1 (List.mem_map.mpr ⟨b,hb,same.symm⟩))
    · exact False.elim (unique.1 (List.mem_map.mpr ⟨a,ha,same⟩))
    · exact ih unique.2 ha hb

private theorem footer_target (screen : UiScreen) (slot : SlotShape)
    (member : slot ∈ screenShape screen) (footer : slot.region = .footer) : slot.target = true := by
  rw [screenShape_normal] at member
  obtain ⟨entry,he,rfl⟩ := List.mem_map.mp member
  have path := region_footer screen entry.1 footer
  obtain ⟨found,hfound,same⟩ := Option.map_eq_some_iff.mp path.symm
  have hm := List.mem_of_find?_eq_some hfound
  have commit : semanticCommit found.2 = true := List.find?_some (p := fun e : Entry => semanticCommit e.2) hfound
  have eq := entry_unique (screenNodes screen) (screenNodes_unique screen) entry found he hm same.symm
  rw [← eq] at commit
  change semanticTarget entry.2 = true
  cases node : entry.2 <;> simp [semanticCommit,node] at commit <;> rfl

private theorem footer_small (screen : UiScreen) :
    ((screenShape screen).filter (fun s => s.region == .footer)).length ≤ 1 := by
  have sub := (List.filter_sublist (p := fun s : SlotShape => s.region == .footer) (l := screenShape screen)).map SlotShape.path
  have unique := (screenShape_unique screen).sublist sub
  generalize hfound : (screenShape screen).filter (fun s => s.region == .footer) = found at unique ⊢
  cases found with
  | nil => decide
  | cons a rest =>
    cases rest with
    | nil => simp
    | cons b tail =>
      have ha : a ∈ (screenShape screen).filter (fun s => s.region == .footer) := by rw [hfound]; simp
      have hb : b ∈ (screenShape screen).filter (fun s => s.region == .footer) := by rw [hfound]; simp
      have getPath (s : SlotShape) (hs : s ∈ (screenShape screen).filter (fun t => t.region == .footer)) :
          some s.path = commitPath screen := by
        obtain ⟨he,hf⟩ := List.mem_filter.mp hs
        rw [screenShape_normal] at he
        obtain ⟨e,he,rfl⟩ := List.mem_map.mp he
        exact region_footer screen e.1 (by simpa only [entryShape,beq_iff_eq] using hf)
      have same : a.path = b.path := Option.some.inj ((getPath a ha).trans (getPath b hb).symm)
      simp only [List.map_cons,List.nodup_cons] at unique
      exact False.elim (unique.1 (by simp [same]))


private theorem prefix_append (n : Nat) (xs ys : List (List Entry)) :
    prefixAt n (xs++ys) = prefixAt n xs ++ prefixAt (n+xs.length) ys := by
  simp [prefixAt,List.zipIdx_append,List.flatMap_append]

private theorem prefix_cons (n : Nat) (es : List Entry) (children : List (List Entry)) :
    prefixAt n (es::children) = es.map (fun (path,node) => (n::path,node)) ++ prefixAt (n+1) children := by
  simp [prefixAt,List.zipIdx_cons]

private theorem prefix_filter_empty (n k : Nat) (children : List (List Entry))
    (outside : k < n ∨ n+children.length ≤ k) :
    (prefixAt n children).filter (fun e => e.1.head? == some k) = [] := by
  apply List.filter_eq_nil_iff.mpr
  intro entry member same
  obtain ⟨i,suffix,hpath,lo,hi⟩ := prefix_bounds n children entry member
  have eq : i = k := by simpa [hpath] using same
  omega

private theorem prefix_filter_single (k : Nat) (entries : List Entry) :
    (prefixAt k [entries]).filter (fun e => e.1.head? == some k) = prefixAt k [entries] := by
  apply List.filter_eq_self.mpr
  intro entry member
  obtain ⟨i,suffix,hpath,lo,hi⟩ := prefix_bounds k [entries] entry member
  have eq : i = k := by simp only [List.length_singleton] at hi; omega
  simp [hpath,eq]

def beforeModal (screen : UiScreen) : List UiNode :=
  [UiNode.text (String.intercalate "  " (screen.banner.map fun (k,v) => k ++ ": " ++ v)),
   .text screen.title,.text (String.intercalate "  " (screen.nav.map fun (title,items) =>
     title ++ ": " ++ String.intercalate " | " (items.map Prod.snd)))] ++ screen.workspace ++ screen.side
private theorem before_length (screen : UiScreen) :
    (beforeModal screen).length = 3+screen.workspace.length+screen.side.length := by
  simp [beforeModal]
  omega

private theorem screen_parts (screen : UiScreen) (node : UiNode) (hm : screen.modal = some node) :
    screenNodes screen = prefixAt 0 ((beforeModal screen).map semanticNodes) ++
      (prefixAt (3+screen.workspace.length+screen.side.length) [semanticNodes node] ++
       prefixAt (4+screen.workspace.length+screen.side.length) ((screen.urgent?.getD []).map semanticNodes)) := by
  change prefixAt 0 _ = _
  have listEq :
      (([UiNode.text (String.intercalate "  " (screen.banner.map fun (k,v) => k ++ ": " ++ v)),
        .text screen.title,.text (String.intercalate "  " (screen.nav.map fun (title,items) =>
          title ++ ": " ++ String.intercalate " | " (items.map Prod.snd)))] ++ screen.workspace ++ screen.side ++
        screen.modal.toList ++ screen.urgent?.getD []).map semanticNodes) =
      (beforeModal screen).map semanticNodes ++ ([semanticNodes node] ++ (screen.urgent?.getD []).map semanticNodes) := by
    simp [beforeModal,hm,List.map_append,List.append_assoc]
  rw [listEq,prefix_append,prefix_append]
  simp [before_length,Nat.add_left_comm,Nat.add_comm]

private theorem filter_mono (xs : List α) (p q : α → Bool)
    (implies : ∀ x ∈ xs, p x = true → q x = true) : (xs.filter p).length ≤ (xs.filter q).length := by
  induction xs with
  | nil => simp
  | cons x rest ih =>
    have h := ih (fun y hy => implies y (by simp [hy]))
    have hx := implies x (by simp)
    cases hp : p x <;> cases hq : q x <;> simp_all <;> omega

private theorem modal_root_count (screen : UiScreen) (node : UiNode) (hm : screen.modal = some node) :
    ((screenNodes screen).filter (fun e => e.1.head? == some (3+screen.workspace.length+screen.side.length))).length =
    (semanticNodes node).length := by
  rw [screen_parts screen node hm,List.filter_append,List.filter_append]
  rw [prefix_filter_empty 0 (3+screen.workspace.length+screen.side.length) _
    (Or.inr (by simp [before_length]))]
  rw [prefix_filter_empty (4+screen.workspace.length+screen.side.length)
    (3+screen.workspace.length+screen.side.length) _ (Or.inl (by omega))]
  rw [prefix_filter_single]
  simp [prefixAt]

/-- Only the top-level modal grammar is bounded; ordinary generated lists and
all nested clinical body trees remain unrestricted. -/
def SmallModal (screen : UiScreen) : Prop := ∀ node ∈ screen.modal, (semanticNodes node).length ≤ 2

private theorem modal_small (screen : UiScreen) (small : SmallModal screen) :
    ((screenShape screen).filter (fun s => s.region == .modal)).length ≤ 2 := by
  cases hm : screen.modal with
  | none =>
    have empty : (screenShape screen).filter (fun s => s.region == .modal) = [] := by
      apply List.filter_eq_nil_iff.mpr
      intro slot hs modal
      rw [screenShape_normal] at hs
      obtain ⟨entry,_,rfl⟩ := List.mem_map.mp hs
      have flags := region_modal screen entry.1 (by simpa only [entryShape,beq_iff_eq] using modal)
      simp [hm] at flags
    rw [empty]; decide
  | some node =>
    have limited := small node (by simp [hm])
    rw [screenShape_normal,List.filter_map,List.length_map]
    apply Nat.le_trans (filter_mono (screenNodes screen)
      (fun e => (entryShape screen e).region == .modal)
      (fun e => e.1.head? == some (3+screen.workspace.length+screen.side.length)) ?_)
    · rw [modal_root_count screen node hm]; exact limited
    · intro entry _ modal
      exact beq_iff_eq.mpr (region_modal screen entry.1 (by simpa only [entryShape,beq_iff_eq] using modal)).2

private theorem screen_first (screen : UiScreen) :
    ∃ rest, screenShape screen = ⟨[0],false,.banner,1⟩ :: rest := by
  let initial := UiNode.text (String.intercalate "  " (screen.banner.map fun (k,v) => k ++ ": " ++ v))
  let remaining := ([UiNode.text screen.title,.text (String.intercalate "  " (screen.nav.map fun (title,items) =>
    title ++ ": " ++ String.intercalate " | " (items.map Prod.snd)))] ++ screen.workspace ++ screen.side ++
    screen.modal.toList ++ screen.urgent?.getD []).map semanticNodes
  have head : screenNodes screen = ([0],initial) :: prefixAt 1 remaining := by
    simp [screenNodes,prefixChildren,prefixAt,initial,remaining,List.map_append,
      List.zipIdx_append,List.flatMap_append,List.append_assoc,semanticNodes]
  rw [screenShape_normal,head,List.map_cons]
  exact ⟨_,rfl⟩

/-- Every screen with the renderer's modal grammar has a certified shell. This
is universal over ordinary tree shape, patient strings and list/row lengths. -/
theorem smallModal_fits (screen : UiScreen) (small : SmallModal screen) : Shell.accepts (screenShape screen) = true := by
  obtain ⟨rest,head⟩ := screen_first screen
  have unique := screenShape_unique screen
  have uniqueRest := unique
  rw [head,shapeSources,List.map_cons] at uniqueRest
  have noBanner : ∀ slot ∈ rest, slot.region ≠ .banner := by
    intro slot hs banner
    have member : slot ∈ screenShape screen := by rw [head]; simp [hs]
    rw [screenShape_normal] at member
    obtain ⟨entry,_,same⟩ := List.mem_map.mp member
    have path : slot.path = [0] := by
      rw [← same]
      apply (region_banner screen entry.1).mp
      change (entryShape screen entry).region = .banner
      rw [same]; exact banner
    exact (List.nodup_cons.mp uniqueRest).1 (List.mem_map.mpr ⟨slot,hs,path⟩)
  apply decide_eq_true
  rw [head]
  apply fits_of_shape _ rest rfl rfl noBanner
  · intro slot hs current
    apply footer_target screen slot
    · rw [head]; exact hs
    · exact current
  · simpa only [head] using footer_small screen
  · simpa only [head] using modal_small screen small
  · simpa only [head] using unique

private theorem uiModal_small (cx : Ctx) : ∀ node ∈ uiModal cx, (semanticNodes node).length ≤ 2 := by
  intro node member
  cases hp : cx.v.popup? with
  | none => simp [uiModal,hp] at member
  | some popup =>
    cases hr : cx.sp.alert? popup.1 with
    | none => simp [uiModal,hp,hr] at member
    | some rule =>
      by_cases passive : rule.tier = .passive
      · simp [uiModal,hp,hr,passive] at member
      · have same : node = .section popup.1 (uiLabel rule.label "Clinical alert")
          [.button popup.1 "Acknowledge" "ack" true none none] := by
          simpa [uiModal,hp,hr,passive] using member.symm
        subst node
        simp [semanticNodes,prefixChildren]

private theorem strip_small (sp : Ehr.Spec) (facts : Ehr.Facts) (user : Ehr.User) (state : Ehr.State)
    (base : UiScreen) (small : SmallModal base) : SmallModal (withUrgentStrip sp facts user state base) := by
  intro node member
  unfold withUrgentStrip at member
  cases hp : state.popup? with
  | none => exact small node (by simpa [hp] using member)
  | some popup =>
    by_cases urgent : Ehr.Specs.AlertUrgency.approvedTier popup.1 = some .urgent
    · simp [hp,urgent] at member
    · exact small node (by simpa [hp,urgent] using member)

/-- The actual renderer always satisfies the bounded fixed-modal grammar.
No program well-formedness, clinical acceptance, data or reachability premise. -/
theorem render_small (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    SmallModal (runRenderUi ⟨sp,program,facts,display,user,state⟩) := by
  have clinical (effective : Ehr.Facts) :
      SmallModal (withUrgentStrip sp effective user state (renderUi sp program effective display user state)) :=
    strip_small sp effective user state _ (uiModal_small
      {sp,prog := program,facts := effective,disp := display,user,s := state})
  unfold runRenderUi renderPatientWorkspace
  split
  · exact clinical (Ehr.CriticalRuntime.effectiveFacts facts state)
  · split
    · exact clinical (Ehr.CriticalRuntime.effectiveFacts facts state)
    · intro node member
      simp [patientLandingUi] at member

/-- Sound range over-approximation for every program, including malformed
programs: clinical admission remains the independent existing checker. -/
theorem renderer_range (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    Shell.accepts (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)) = true :=
  smallModal_fits _ (render_small sp program facts display user state)


/-- The fixed-shell certificate is a single proved class compiler. The finite
custom-layout gate remains the existing independent RenderFamily instance. -/
inductive Library | fixedShell
  deriving Repr, Inhabited, DecidableEq

def uncheckedPaint (screen : UiScreen) (_v : Size) : Option (List Drawn) :=
  some ((Shell.classBoxes _v (screenShape screen)).map (bindSemantic screen))

private theorem unchecked_sound (screen : UiScreen)
    (accepted : Shell.accepts (screenShape screen) = true) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, uncheckedPaint screen v = some painted ∧ Realizes screen v painted := by
  obtain ⟨painted,paintedEq,realized⟩ := Shell.certifiedClass_allScreens screen accepted v hv
  have same : ((Shell.classBoxes v (screenShape screen)).map (bindSemantic screen)) = painted := by
    simpa [Shell.paint,accepted,hv] using paintedEq
  exact ⟨painted,by simp [uncheckedPaint,same],realized⟩

instance : RenderFamily Library where
  admitted := fun _ => true
  covered := fun _ screen => Shell.accepts (screenShape screen) = true
  paint := fun _ => uncheckedPaint
  sound := by
    intro _ _ screen covered v hv
    exact unchecked_sound screen covered v hv

/-- The renderer range is universally within the fixed-shell grammar. Therefore
the program decision is constant true on typed inputs; the nontrivial range and
layout proofs justify it. This is layout admission, not clinical admission. -/
def checkProgram (_sp : Ehr.Spec) (_program : Ehr.Program) : Bool := true

theorem checkProgram_accepts (sp : Ehr.Spec) (program : Ehr.Program) : checkProgram sp program = true := rfl

/-- Program certificate acceptance discharges coverage for every patient and
reachable state. Its proof is range analysis, not a certificate-carried coverage
hypothesis and not an enumeration of sampled states. -/
theorem checkProgram_sound (sp : Ehr.Spec) (program : Ehr.Program)
    (_accepted : checkProgram sp program = true) : RenderCovered sp program Library.fixedShell := by
  intro facts display user state _reachable
  exact renderer_range sp program facts display user state

/-- All-state strengthening: the certificate also covers malformed/unreachable
states, while clinical acceptance and commit guards remain separate. -/
theorem checkProgram_allStates (sp : Ehr.Spec) (program : Ehr.Program)
    (_accepted : checkProgram sp program = true) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      ∀ v ∈ viewports, ∃ painted,
        uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
        Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted := by
  intro facts display user state v hv
  exact unchecked_sound _ (renderer_range sp program facts display user state) v hv

/-- Requested headline, obtained by discharging the coverage premise of the
same generic layoutAccepted_allPatients theorem, with no data/length bounds. -/
theorem layoutAccepted_program (sp : Ehr.Spec) (program : Ehr.Program)
    (accepted : checkProgram sp program = true) :
    ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
      Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
      ∀ v ∈ viewports, ∃ painted,
        uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
        Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted :=
  layoutAccepted_allPatients sp program Library.fixedShell rfl (checkProgram_sound sp program accepted)

#print axioms zip_order
#print axioms prefix_bounds
#print axioms prefix_no_nil
#print axioms prefix_unique
#print axioms children_unique
#print axioms wrap_unique
#print axioms semanticNodes_unique
#print axioms screenNodes_unique
#print axioms screenShape_unique
#print axioms regions_partition
#print axioms filter_find
#print axioms fits_of_shape
#print axioms screenShape_normal
#print axioms region_banner
#print axioms region_footer
#print axioms region_modal
#print axioms entry_unique
#print axioms footer_target
#print axioms footer_small
#print axioms prefix_append
#print axioms prefix_cons
#print axioms prefix_filter_empty
#print axioms prefix_filter_single
#print axioms before_length
#print axioms screen_parts
#print axioms filter_mono
#print axioms modal_root_count
#print axioms modal_small
#print axioms screen_first
#print axioms smallModal_fits
#print axioms uiModal_small
#print axioms strip_small
#print axioms render_small
#print axioms renderer_range
#print axioms unchecked_sound
#print axioms checkProgram_accepts
#print axioms checkProgram_sound
#print axioms checkProgram_allStates
#print axioms layoutAccepted_program
end Ehr.Layout.Range
