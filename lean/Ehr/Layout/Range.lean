import Ehr.Layout.Shell

/-! Structural range lemmas. They inspect occurrence paths and the renderer's
fixed modal grammar; payload strings, rows, lists and patients remain arbitrary. -/
set_option maxRecDepth 100000
set_option maxHeartbeats 200000
namespace Ehr.Layout.Range
open Lean Ehr.Render
abbrev Entry := List Nat × Part
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

/-- A node's own part, its display parts and its children have distinct paths. -/
private theorem node_unique (own : Part) (parts : List Part) (children : List (List Entry))
    (unique : ∀ es ∈ children, (paths es).Nodup) :
    (paths (([],own) :: prefixChildren (partEntries parts ++ children))).Nodup := by
  refine List.nodup_cons.mpr ⟨prefix_no_nil 0 _,prefix_unique 0 _ ?_⟩
  intro es hes
  rcases List.mem_append.mp hes with part | child
  · obtain ⟨p,_,rfl⟩ := List.mem_map.mp part
    simp [paths]
  · exact unique es child

private theorem mapped_unique (cx : DisplayCx) (cs : List UiNode)
    (ih : ∀ child ∈ cs, (paths (semanticNodes cx child)).Nodup) :
    ∀ es ∈ cs.map (semanticNodes cx), (paths es).Nodup := by
  intro es hes
  obtain ⟨child,member,rfl⟩ := List.mem_map.mp hes
  exact ih child member

/-- Arbitrary nested semantic trees have unique occurrence paths, even with
repeated component IDs, duplicate labels and unbounded generated child lists.
Every display part has a path of its own. -/
theorem semanticNodes_unique (node : UiNode) : ∀ cx : DisplayCx, (paths (semanticNodes cx node)).Nodup := by
  induction node using UiNode.rec
    (motive_2 := fun cs => ∀ (cx : DisplayCx), ∀ child ∈ cs, (paths (semanticNodes cx child)).Nodup) with
  | board urgent cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | patientPane patient banner metadata cs ms ih im =>
    intro cx
    simp only [semanticNodes]
    refine node_unique _ _ _ ?_
    intro es hes
    rcases List.mem_append.mp hes with h | h
    · exact mapped_unique _ cs (ih _) es h
    · exact mapped_unique _ ms (im _) es h
  | datedTimeline title dated undated cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | timeline title cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | presentation kind cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | valueSet options custom cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique _ cs (ih _))
  | chartReferences refs cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | rowAction target row cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | «section» id title cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | columns cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | tabs id labels selected cs ih =>
    intro cx; simp only [semanticNodes]; exact node_unique _ _ _ (mapped_unique cx cs (ih cx))
  | nil => rename_i cx child member; cases member
  | cons node cs ih im =>
    rename_i cx child member
    rcases List.mem_cons.mp member with rfl | member
    · exact ih cx
    · exact im cx child member
  | _ => intro cx; simp only [semanticNodes]; exact node_unique _ _ [] (fun _ h => by cases h)

theorem screenNodes_unique (screen : UiScreen) : (paths (screenNodes screen)).Nodup := by
  apply prefix_unique 0
  intro es hes
  rcases List.mem_append.mp hes with chrome | root
  · simp only [chromeEntries,List.mem_cons,List.not_mem_nil,or_false] at chrome
    rcases chrome with rfl | rfl <;> simp [paths]
  · obtain ⟨node,_,rfl⟩ := List.mem_map.mp root
    exact semanticNodes_unique node _

theorem screenShape_unique (screen : UiScreen) : (shapeSources (screenShape screen)).Nodup := by
  rw [screenShape_sources]
  exact screenNodes_unique screen


/-- Body rows (workspace first, then navigation and side), the commit, the
modal layer and the pinned strip partition every shape without a second
banner. `fit` says whether the strip is pinned; an unpinned urgent occurrence
is a body row. -/
private theorem regions_partition (fit : Bool) (shape : ScreenShape)
    (noBanner : ∀ slot ∈ shape, slot.region ≠ .banner) :
    shape.Perm ((shape.filter (Shell.bodySlot fit false) ++ shape.filter (Shell.bodySlot fit true)) ++
      (shape.filter (fun s => s.region == .footer) ++
        (shape.filter (fun s => s.region == .modal) ++ shape.filter (Shell.pinnedSlot fit)))) := by
  apply List.perm_iff_count.mpr
  intro a
  have key : ∀ p : SlotShape → Bool,
      List.count a (shape.filter p) = if p a = true then List.count a shape else 0 := by
    intro p
    by_cases h : p a = true
    · rw [ite_eq_left h, List.count_filter h]
    · rw [ite_eq_right h]
      exact List.count_eq_zero.mpr (fun m => h (List.mem_filter.mp m).2)
  simp only [List.count_append, key]
  by_cases mem : a ∈ shape
  · have nb := noBanner a mem
    cases reg : a.region <;> cases fit <;>
      simp_all [Shell.bodySlot, Shell.ordinaryRegion, Shell.pinnedSlot]
  · simp [List.count_eq_zero.mpr mem]

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
  · refine ⟨bannerRegion,bannerTarget,?_,?_,?_,modalSmall,?_,(Shell.pinned_small (b::rest)).1,
      (Shell.pinned_small (b::rest)).2⟩
    · intro slot hs
      have ordinary : Shell.ordinaryRegion slot = true := by
        rcases List.mem_append.mp hs with hs | hs <;>
          · have h := (List.mem_filter.mp hs).2
            simp only [Shell.bodySlot,Bool.and_eq_true] at h
            exact h.1.1
      simpa [Shell.ordinaryRegion,Bool.and_eq_true,and_assoc] using ordinary
    · intro slot hs
      have found : (b::rest).find? (fun s => s.region == .footer) = some slot := Option.mem_def.mp hs
      have member := List.mem_of_find?_eq_some found
      have reg : slot.region = .footer := by simpa using List.find?_some found
      exact ⟨reg,footerTarget slot member reg⟩
    · intro slot hs
      simpa using (List.mem_filter.mp hs).2
    · intro slot hs
      have h := (List.mem_filter.mp hs).2
      simp only [Shell.pinnedSlot,Bool.and_eq_true,beq_iff_eq] at h
      exact h.2
  · refine ⟨?_,unique⟩
    have partition := regions_partition (Shell.stripFits (b::rest)) rest noBanner
    have found := filter_find rest (fun s => s.region == .footer)
      (by simpa [bannerRegion] using footerSmall)
    simpa [Shell.Parts.slots,Shell.splitShape,List.filter_cons,Shell.bodySlot,Shell.ordinaryRegion,
      Shell.pinnedSlot,bannerRegion,found] using (partition.cons b).symm

/-- A normalization of the existing shape adapter, definitionally equal to it.
Keeping it here makes every range argument depend on the actual adapter. -/
def commitPath (screen : UiScreen) : Option (List Nat) :=
  ((screenNodes screen).find? (fun e => e.2.commit)).map Prod.fst

/-- New specification for owner review: the first root index of
`screen.urgent?`: after the banner, title and navigation roots, the workspace,
the side nodes and the modal. -/
def urgentRoot (screen : UiScreen) : Nat :=
  3+screen.workspace.length+screen.side.length+screen.modal.toList.length

/-- New specification for owner review: occurrences under an urgent root have
region `urgent`; the other regions are as before. Definitionally the region
assignment of `screenShape` (`screenShape_normal`). -/
def regionOf (screen : UiScreen) (path : List Nat) : Region :=
  if path == [0] then .banner else if path == [1] then .title
  else if path.head?.getD 0 ≥ urgentRoot screen then .urgent
  else if some path == commitPath screen then .footer
  else if screen.modal.isSome && path.head? == some (3+screen.workspace.length+screen.side.length) then .modal
  else if path.head?.getD 0 == 2 || (path.head?.getD 0 ≥ 3+screen.workspace.length &&
    path.head?.getD 0 < 3+screen.workspace.length+screen.side.length) then .side else .body

def entryShape (screen : UiScreen) (entry : Entry) : SlotShape :=
  ⟨entry.1,entry.2.target,regionOf screen entry.1,entry.2.lines⟩

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

/-! ### Only a button is the commit

The current-task commit is the first part flagged `commit`. Only a button's
own part carries that flag, and it is a target. -/

private def Plain (parts : List Part) : Prop := ∀ p ∈ parts, p.commit = false
private theorem plain_nil : Plain [] := fun _ h => by cases h
private theorem plain_single (p : Part) (h : p.commit = false) : Plain [p] := by
  intro q hq; rw [List.mem_singleton.mp hq]; exact h
private theorem plain_append {a b : List Part} (ha : Plain a) (hb : Plain b) : Plain (a ++ b) := by
  intro p hp
  rcases List.mem_append.mp hp with h | h
  · exact ha p h
  · exact hb p h
private theorem plain_map {α : Type} (f : α → Part) (xs : List α) (h : ∀ x, (f x).commit = false) :
    Plain (xs.map f) := by
  intro p hp; obtain ⟨x,_,rfl⟩ := List.mem_map.mp hp; exact h x
private theorem plain_flatMap {α : Type} (f : α → List Part) (xs : List α) (h : ∀ x, Plain (f x)) :
    Plain (xs.flatMap f) := by
  intro p hp; obtain ⟨x,_,hx⟩ := List.mem_flatMap.mp hp; exact h x p hx
private theorem plain_option (xs : List Part) (present : Bool) (h : Plain xs) : Plain (optionList xs present) := by
  unfold optionList; split
  · exact h
  · exact plain_nil
private theorem plain_some {α : Type} (o : Option α) (f : α → Part) (h : ∀ x, (f x).commit = false) :
    Plain (o.map f).toList := by
  cases o with
  | none => exact plain_nil
  | some x => exact plain_single _ (h x)

private theorem pending_plain (cx : DisplayCx) (comp : String) : (pendingPart cx comp).commit = false := by
  unfold pendingPart; split <;> rfl

private theorem field_plain (cx : DisplayCx) (comp label kind : String) (value unit provenance : Option String)
    (pending human required : Bool) :
    Plain (fieldParts cx comp label kind value unit provenance pending human required) := by
  unfold fieldParts
  refine plain_append (plain_append (plain_append (plain_append (plain_append (plain_append (plain_append
    (plain_single _ rfl) (plain_some _ _ fun _ => rfl)) ?_) (plain_option _ _ (plain_single _ rfl)))
    (plain_some _ _ fun _ => rfl)) (plain_some _ _ fun _ => rfl))
    (plain_option _ _ (plain_single _ (pending_plain cx comp)))) (plain_option _ _ (plain_single _ rfl))
  cases value with
  | none => exact plain_nil
  | some v => exact plain_option _ _ (plain_single _ rfl)

private theorem info_plain (infoId display : String) (rows : List (List (String × String))) :
    Plain (infoParts infoId display rows) := by
  unfold infoParts
  split
  · exact plain_option _ _ (plain_single _ rfl)
  · split
    · exact plain_append (plain_map _ _ fun _ => rfl)
        (plain_flatMap _ _ fun _ => plain_map _ _ fun _ => rfl)
    · exact plain_flatMap _ _ fun _ => plain_flatMap _ _ fun _ =>
        plain_append (plain_single _ rfl) (plain_single _ rfl)

private theorem atom_plain (atom : UiStripAtom) : (stripAtomPart atom).commit = false := by
  cases atom <;> rfl

/-- No part of a bounded list's window is the commit. -/
private theorem window_plain (cx : DisplayCx) (comp : String) : Plain (windowParts cx comp) := by
  unfold windowParts
  split
  · intro p member
    simp only [pagerParts,List.mem_cons,List.not_mem_nil,or_false] at member
    rcases member with rfl | rfl | rfl | rfl | rfl | rfl <;> rfl
  · exact plain_nil

/-- No display part after a node's own part is the commit. -/
private theorem leaf_plain (cx : DisplayCx) (node : UiNode) : Plain (leafParts cx node) := by
  cases node with
  | field comp label kind value unit provenance pending human required =>
    exact field_plain cx comp label kind value unit provenance pending human required
  | button comp label role enabled reason hotkey =>
    exact plain_append (plain_option _ _ (plain_single _ rfl)) (plain_some _ _ fun _ => rfl)
  | tabs id labels selected body => exact plain_map _ _ fun _ => rfl
  | stepper steps current => exact plain_map _ _ fun _ => rfl
  | info comp label infoId display rows => exact plain_append (window_plain cx comp) (info_plain infoId display rows)
  | board urgent children => exact plain_map _ _ fun _ => rfl
  | datedTimeline title dated undated children =>
    exact plain_append (plain_map _ _ fun _ => rfl) (plain_map _ _ fun _ => rfl)
  | chartReferences references children => exact plain_map _ _ fun _ => rfl
  | patientPane patient banner metadata children modal => exact plain_map _ _ atom_plain
  | _ => exact plain_nil

private theorem own_commit (cx : DisplayCx) (node : UiNode) (commit : (ownPart cx node).commit = true) :
    (ownPart cx node).target = true := by
  cases node <;> first | rfl | (simp [ownPart] at commit)

private theorem prefix_member (children : List (List Entry)) (entry : Entry)
    (member : entry ∈ prefixChildren children) : ∃ es ∈ children, ∃ inner ∈ es, inner.2 = entry.2 := by
  obtain ⟨⟨es,i⟩,hi,he⟩ := List.mem_flatMap.mp member
  obtain ⟨inner,hin,same⟩ := List.mem_map.mp he
  have esMember : es ∈ children := by
    simpa using (List.mem_map.mpr ⟨(es,i),hi,rfl⟩ : es ∈ children.zipIdx.map Prod.fst)
  exact ⟨es,esMember,inner,hin,by rw [← same]⟩

/-- New specification for owner review: a property of every own part and of
every display part holds for every occurrence of a node, at any depth. -/
theorem semanticNodes_all (P : Part → Prop) (own : ∀ cx node, P (ownPart cx node))
    (leaf : ∀ cx node, ∀ p ∈ leafParts cx node, P p) (node : UiNode) :
    ∀ cx : DisplayCx, ∀ entry ∈ semanticNodes cx node, P entry.2 := by
  have step (cx : DisplayCx) (node : UiNode) (children : List (List Entry))
      (ih : ∀ es ∈ children, ∀ inner ∈ es, P inner.2) :
      ∀ entry ∈ ([],ownPart cx node) :: prefixChildren (partEntries (leafParts cx node) ++ children), P entry.2 := by
    intro entry member
    rcases List.mem_cons.mp member with rfl | member
    · exact own cx node
    · obtain ⟨es,hes,inner,hin,same⟩ := prefix_member _ entry member
      rw [← same]
      rcases List.mem_append.mp hes with part | child
      · obtain ⟨p,hp,rfl⟩ := List.mem_map.mp part
        rw [List.mem_singleton.mp hin]
        exact leaf cx node p hp
      · exact ih es child inner hin
  have mapped (cx : DisplayCx) (cs : List UiNode)
      (ih : ∀ child ∈ cs, ∀ entry ∈ semanticNodes cx child, P entry.2) :
      ∀ es ∈ cs.map (semanticNodes cx), ∀ inner ∈ es, P inner.2 := by
    intro es hes
    obtain ⟨child,member,rfl⟩ := List.mem_map.mp hes
    exact ih child member
  induction node using UiNode.rec
    (motive_2 := fun cs => ∀ (cx : DisplayCx), ∀ child ∈ cs, ∀ entry ∈ semanticNodes cx child, P entry.2) with
  | board urgent cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | patientPane patient banner metadata cs ms ih im =>
    intro cx
    simp only [semanticNodes]
    refine step cx _ _ ?_
    intro es hes
    rcases List.mem_append.mp hes with h | h
    · exact mapped _ cs (ih _) es h
    · exact mapped _ ms (im _) es h
  | datedTimeline title dated undated cs ih =>
    intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | timeline title cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | presentation kind cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | valueSet options custom cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped _ cs (ih _))
  | chartReferences refs cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | rowAction target row cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | «section» id title cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | columns cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | tabs id labels selected cs ih => intro cx; simp only [semanticNodes]; exact step cx _ _ (mapped cx cs (ih cx))
  | nil => rename_i cx child member entry inside; cases member
  | cons node cs ih im =>
    rename_i cx child member entry inside
    rcases List.mem_cons.mp member with rfl | member
    · exact ih cx entry inside
    · exact im cx child member entry inside
  | _ => intro cx; simp only [semanticNodes]; exact step cx _ [] (fun _ h => by cases h)

/-- A property of every own part, every display part, the banner and the
title holds for every occurrence of a screen. -/
theorem screenNodes_all (P : Part → Prop) (own : ∀ cx node, P (ownPart cx node))
    (leaf : ∀ cx node, ∀ p ∈ leafParts cx node, P p) (screen : UiScreen)
    (banner : P (bannerPart screen.banner screen.viewer?)) (title : P { role := .title, text := screen.title }) :
    ∀ entry ∈ screenNodes screen, P entry.2 := by
  intro entry member
  obtain ⟨es,hes,inner,hin,same⟩ := prefix_member _ entry member
  rw [← same]
  rcases List.mem_append.mp hes with chrome | root
  · simp only [chromeEntries,List.mem_cons,List.not_mem_nil,or_false] at chrome
    rcases chrome with rfl | rfl
    · rw [List.mem_singleton.mp hin]; exact banner
    · rw [List.mem_singleton.mp hin]; exact title
  · obtain ⟨node,_,rfl⟩ := List.mem_map.mp root
    exact semanticNodes_all P own leaf node _ inner hin

/-- The commit of a screen is a target. -/
theorem commit_target (screen : UiScreen) (entry : Entry) (member : entry ∈ screenNodes screen)
    (commit : entry.2.commit = true) : entry.2.target = true :=
  screenNodes_all (fun part => part.commit = true → part.target = true) own_commit
    (fun cx node p hp commit => by rw [leaf_plain cx node p hp] at commit; cases commit)
    screen (fun commit => by cases commit) (fun commit => by cases commit) entry member commit

private theorem footer_target (screen : UiScreen) (slot : SlotShape)
    (member : slot ∈ screenShape screen) (footer : slot.region = .footer) : slot.target = true := by
  rw [screenShape_normal] at member
  obtain ⟨entry,he,rfl⟩ := List.mem_map.mp member
  have path := region_footer screen entry.1 footer
  obtain ⟨found,hfound,same⟩ := Option.map_eq_some_iff.mp path.symm
  have hm := List.mem_of_find?_eq_some hfound
  have commit : found.2.commit = true := List.find?_some (p := fun e : Entry => e.2.commit) hfound
  have eq := entry_unique (screenNodes screen) (screenNodes_unique screen) entry found he hm same.symm
  rw [← eq] at commit
  exact commit_target screen entry he commit

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

def beforeModal (screen : UiScreen) : List (List Entry) :=
  chromeEntries screen ++ (navNode screen.nav :: (screen.workspace ++ screen.side)).map (semanticNodes (screenCx screen))
private theorem before_length (screen : UiScreen) :
    (beforeModal screen).length = 3+screen.workspace.length+screen.side.length := by
  simp [beforeModal,chromeEntries]
  omega

private theorem screen_parts (screen : UiScreen) (node : UiNode) (hm : screen.modal = some node) :
    screenNodes screen = prefixAt 0 (beforeModal screen) ++
      (prefixAt (3+screen.workspace.length+screen.side.length) [semanticNodes (screenCx screen) node] ++
       prefixAt (4+screen.workspace.length+screen.side.length)
        ((screen.urgent?.getD []).map (semanticNodes (screenCx screen)))) := by
  change prefixAt 0 _ = _
  have listEq :
      chromeEntries screen ++ (screenRoots screen).map (semanticNodes (screenCx screen)) =
      beforeModal screen ++ ([semanticNodes (screenCx screen) node] ++
        (screen.urgent?.getD []).map (semanticNodes (screenCx screen))) := by
    simp [beforeModal,screenRoots,hm,List.map_append,List.append_assoc]
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
    (semanticNodes (screenCx screen) node).length := by
  rw [screen_parts screen node hm,List.filter_append,List.filter_append]
  rw [prefix_filter_empty 0 (3+screen.workspace.length+screen.side.length) _
    (Or.inr (by simp [before_length]))]
  rw [prefix_filter_empty (4+screen.workspace.length+screen.side.length)
    (3+screen.workspace.length+screen.side.length) _ (Or.inl (by omega))]
  rw [prefix_filter_single]
  simp [prefixAt]

/-- Only the top-level modal grammar is bounded; ordinary generated lists and
all nested clinical body trees remain unrestricted. -/
def SmallModal (screen : UiScreen) : Prop :=
  ∀ node ∈ screen.modal, (semanticNodes (screenCx screen) node).length ≤ 2

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
  have head : screenNodes screen = ([0],bannerPart screen.banner screen.viewer?) ::
      prefixAt 1 ([([],{ role := .title, text := screen.title })] ::
        (screenRoots screen).map (semanticNodes (screenCx screen))) := by
    simp [screenNodes,chromeEntries,prefixChildren,prefixAt,List.zipIdx_cons]
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

private theorem uiModal_small (cx : Ctx) :
    ∀ node ∈ uiModal cx, ∀ dcx : DisplayCx, (semanticNodes dcx node).length ≤ 2 := by
  intro node member dcx
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
        simp [semanticNodes,prefixChildren,partEntries,leafParts,buttonParts,optionList]

/-- The modal is small whatever field metadata its parts are displayed with.
The urgent strip changes the screen's metadata, not its modal. -/
private def SmallModalAlways (screen : UiScreen) : Prop :=
  ∀ node ∈ screen.modal, ∀ cx : DisplayCx, (semanticNodes cx node).length ≤ 2

private theorem strip_small (sp : Ehr.Spec) (facts : Ehr.Facts) (user : Ehr.User) (state : Ehr.State)
    (base : UiScreen) (small : SmallModalAlways base) :
    SmallModalAlways (withUrgentStrip sp facts user state base) := by
  intro node member
  unfold withUrgentStrip at member
  cases hp : state.popup? with
  | none => exact small node (by simpa [hp] using member)
  | some popup =>
    by_cases urgent : Ehr.Specs.AlertUrgency.approvedTier popup.1 = some .urgent
    · simp [hp,urgent] at member
    · exact small node (by simpa [hp,urgent] using member)

/-- New specification for owner review: the clinical screen with its urgent
strip, for any facts, fits the fixed shell. This is the screen
`Sem.UrgentStrip` reasons about. -/
theorem strip_range (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    Shell.accepts (screenShape (withUrgentStrip sp facts user state
      (renderUi sp program facts display user state))) = true :=
  smallModal_fits _ (fun node member =>
    strip_small sp facts user state (renderUi sp program facts display user state) (uiModal_small
      {sp,prog := program,facts,disp := display,user,s := state}) node member _)

private theorem render_small_always (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    SmallModalAlways (runRenderUi ⟨sp,program,facts,display,user,state⟩) := by
  have clinical (effective : Ehr.Facts) :
      SmallModalAlways
        (withUrgentStrip sp effective user state (renderUi sp program effective display user state)) :=
    strip_small sp effective user state _ (uiModal_small
      {sp,prog := program,facts := effective,disp := display,user,s := state})
  unfold runRenderUi renderPatientWorkspace
  split
  · exact clinical (Ehr.CriticalRuntime.effectiveFacts facts state)
  · split
    · exact clinical (Ehr.CriticalRuntime.effectiveFacts facts state)
    · intro node member
      simp [patientLandingUi] at member

/-- The actual renderer always satisfies the bounded fixed-modal grammar.
No program well-formedness, clinical acceptance, data or reachability premise. -/
theorem render_small (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    SmallModal (runRenderUi ⟨sp,program,facts,display,user,state⟩) :=
  fun node member => render_small_always sp program facts display user state node member _

/-- New specification for owner review: the renderer's modal is small under
every display context, so a layout that changes only the context of the
screen's parts (the windows of bounded lists) keeps it small. -/
theorem render_modal_small (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    ∀ node ∈ (runRenderUi ⟨sp,program,facts,display,user,state⟩).modal, ∀ cx : DisplayCx,
      (semanticNodes cx node).length ≤ 2 :=
  render_small_always sp program facts display user state

/-- Sound range over-approximation for every program, including malformed
programs: clinical admission remains the independent existing checker. -/
theorem renderer_range (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) :
    Shell.accepts (screenShape (runRenderUi ⟨sp,program,facts,display,user,state⟩)) = true :=
  smallModal_fits _ (render_small sp program facts display user state)


private theorem lookup_unique {β γ : Type} (f : β → γ) :
    ∀ (l : List (List Nat × β)), (l.map Prod.fst).Nodup → ∀ (path : List Nat) (b : β), (path,b) ∈ l →
      (l.map fun (p,x) => (p, f x)).lookup path = some (f b)
  | [], _, _, _, mem => by simp at mem
  | (p0,b0) :: rest, unique, path, b, mem => by
    simp only [List.map_cons, List.nodup_cons] at unique
    rcases List.mem_cons.mp mem with same | tail
    · cases same
      simp
    · have different : path ≠ p0 := by
        intro same
        subst same
        exact unique.1 (List.mem_map.mpr ⟨(path,b), tail, rfl⟩)
      have step := lookup_unique f rest unique.2 path b tail
      simp only [List.map_cons, List.lookup]
      rw [show (path == p0) = false from beq_eq_false_iff_ne.mpr different]
      exact step

/-- The text bound to an occurrence path is the text of its part. -/
theorem sourceValue_entry (screen : UiScreen) (path : List Nat) (part : Part)
    (mem : (path, part) ∈ screenNodes screen) : sourceValue screen path = part.text := by
  unfold sourceValue sourceTable
  rw [lookup_unique Part.text (screenNodes screen) (screenNodes_unique screen) path part mem]
  rfl

/-- New specification for owner review: the part emitted for an occurrence
path is the part of the inventory. -/
theorem sourcePart_entry (screen : UiScreen) (path : List Nat) (part : Part)
    (mem : (path, part) ∈ screenNodes screen) : sourcePart screen path = some part := by
  have h := lookup_unique id (screenNodes screen) (screenNodes_unique screen) path part mem
  have same : ((screenNodes screen).map fun (p,x) => (p, id x)) = screenNodes screen := by
    simp
  rw [same] at h
  exact h

/-- New specification for owner review: nothing a screen displays is lost.
In any painting that realizes a screen, every part of the semantic inventory
has a painted box of its own that shows the part's complete text, in its
measured wrapping, under the safety-text contract. Together with the
per-kind theorems of `Display` (`field_complete`, `button_complete`,
`info_complete`, ...), every datum of every node is displayed in full. -/
theorem realized_part (screen : UiScreen) (v : Size) (painted : List Drawn)
    (realized : Realizes screen v painted) (path : List Nat) (part : Part)
    (member : (path, part) ∈ screenNodes screen) :
    ∃ d ∈ painted, d.box.info.source = some path ∧ d.box.info.paint = true ∧
      d.original = some part.text ∧
      ∃ t ∈ d.box.info.text, t.safety = true ∧
        d.lines = textLines t d.box.rect.w (paintText t part.text) ∧
        SafetyRealized t d.box.rect.w part.text := by
  obtain ⟨rules, _, bound⟩ := realized
  have g7 := rules.2.2.2.2.2.2.1
  have counted := g7.2.2.1 path (List.mem_map.mpr ⟨_, member, rfl⟩)
  obtain ⟨p, hp⟩ := List.exists_mem_of_length_pos (show 0 < _ from by rw [counted]; decide)
  obtain ⟨inBoxes, flags⟩ := List.mem_filter.mp hp
  simp only [Bool.and_eq_true, beq_iff_eq] at flags
  obtain ⟨d, hd, rfl⟩ := List.mem_map.mp inBoxes
  obtain ⟨t, ht, safe, original, lines, safety⟩ := bound d hd path (Option.mem_def.mpr flags.1)
  rw [sourceValue_entry screen path part member] at original lines safety
  exact ⟨d, hd, flags.1, flags.2, original, t, ht, safe, lines, safety⟩

/-- The fixed-shell certificate is a single proved class compiler. The finite
custom-layout gate remains the existing independent RenderFamily instance. -/
inductive Library | fixedShell
  deriving Repr, Inhabited, DecidableEq

def uncheckedPaint (screen : UiScreen) (_v : Size) : Option (List Drawn) :=
  some ((Shell.classBoxes _v (screenShape screen)).map (bindSemantic screen))

/-- The runtime computes `uncheckedPaint` with one inventory traversal. -/
theorem uncheckedPaint_bound (screen : UiScreen) (v : Size) :
    uncheckedPaint screen v = some (bindAll screen (Shell.classBoxes v (screenShape screen))) := rfl

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

#print axioms plain_nil
#print axioms plain_single
#print axioms plain_append
#print axioms plain_map
#print axioms plain_flatMap
#print axioms plain_option
#print axioms plain_some
#print axioms pending_plain
#print axioms field_plain
#print axioms info_plain
#print axioms atom_plain
#print axioms leaf_plain
#print axioms own_commit
#print axioms prefix_member
#print axioms lookup_unique
#print axioms semanticNodes_all
#print axioms screenNodes_all
#print axioms commit_target
#print axioms sourceValue_entry
#print axioms sourcePart_entry
#print axioms realized_part
#print axioms zip_order
#print axioms prefix_bounds
#print axioms prefix_no_nil
#print axioms prefix_unique
#print axioms node_unique
#print axioms mapped_unique
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
#print axioms render_small_always
#print axioms render_small
#print axioms render_modal_small
#print axioms window_plain
#print axioms strip_range
#print axioms renderer_range
#print axioms uncheckedPaint_bound
#print axioms unchecked_sound
#print axioms checkProgram_accepts
#print axioms checkProgram_sound
#print axioms checkProgram_allStates
#print axioms layoutAccepted_program
end Ehr.Layout.Range
