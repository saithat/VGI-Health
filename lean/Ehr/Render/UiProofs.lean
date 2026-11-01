import Ehr.Render.UiContracts
import Ehr.Render.CommitProofs
import Ehr.Render.PanelProofs

namespace Ehr.Render

@[simp] theorem uiAtomsList_nil : uiAtomsList [] = [] := by simp [uiAtomsList]
@[simp] theorem uiAtomsList_cons (n ns) : uiAtomsList (n :: ns) = uiAtoms n ++ uiAtomsList ns := by simp [uiAtomsList]
@[simp] theorem uiAtomsList_append (xs ys) :
    uiAtomsList (xs ++ ys) = uiAtomsList xs ++ uiAtomsList ys := by
  induction xs with
  | nil => simp
  | cons x xs ih => simp [ih, List.append_assoc]

@[simp] theorem uiAtomsList_flatMap (bs : List UiBranch) :
    uiAtomsList (bs.flatMap (·.nodes)) = bs.flatMap (fun b => uiAtomsList b.nodes) := by
  induction bs with
  | nil => simp
  | cons b bs ih => simp [ih]

/-- Nesting a container never changes its own semantic nodes or loses children. -/
theorem uiItem_atoms (cx : Ctx) (it : ItemView) (kids : List UiNode) :
    uiAtomsList (uiItem cx it kids) =
      uiAtomsList (uiItem cx it []) ++ if uiTakesChildren it then uiAtomsList kids else [] := by
  cases hk : it.comp.kind <;> simp [uiItem, hk, uiTakesChildren, uiAtoms]
  rename_i collapsible start
  by_cases hn : uiNavGroup it = true <;> by_cases hc : collapsible = true <;>
    by_cases he : it.expanded = true <;> simp_all [uiAtoms, uiAtomsList]

/-- One nesting step retains exactly its own nodes and every previous node. -/
theorem uiNest_mem (cx : Ctx) (it : ItemView) (bs : List UiBranch) (n : UiNode) :
    n ∈ uiAtomsList ((uiNest cx it bs).flatMap (·.nodes)) ↔
      n ∈ uiAtomsList (uiItem cx it []) ∨ n ∈ uiAtomsList (bs.flatMap (·.nodes)) := by
  unfold uiNest
  simp only [List.flatMap_cons, uiAtomsList_append]
  rw [uiItem_atoms]
  simp only [List.mem_append, uiAtomsList_flatMap, List.mem_flatMap, List.mem_filter]
  by_cases ht : uiTakesChildren it = true
  · simp only [ht, ↓reduceIte, Bool.true_and, List.mem_flatMap, List.mem_filter]
    constructor
    · rintro ((h | ⟨b, ⟨hb, _⟩, hn⟩) | ⟨b, ⟨hb, _⟩, hn⟩)
      · exact Or.inl h
      · exact Or.inr ⟨b, hb, hn⟩
      · exact Or.inr ⟨b, hb, hn⟩
    · rintro (h | ⟨b, hb, hn⟩)
      · exact Or.inl (Or.inl h)
      · by_cases hp : b.parent == some it.comp.id
        · exact Or.inl (Or.inr ⟨b, ⟨hb, hp⟩, hn⟩)
        · exact Or.inr ⟨b, ⟨hb, by simpa using hp⟩, hn⟩
  · simp [ht]

/-- The actual component forest contains precisely the nodes of shown items.
This works even with orphans, cycles, duplicate ids, and out-of-order parents. -/
theorem uiComponentsWhere_mem (cx : Ctx) (keep : ItemView → Bool) (n : UiNode) :
    n ∈ uiAtomsList (uiComponentsWhere cx keep) ↔
      ∃ it ∈ cx.v.items, it.shown = true ∧ keep it = true ∧ n ∈ uiAtomsList (uiItem cx it []) := by
  have fold (items : List ItemView) :
      n ∈ uiAtomsList ((items.foldr (uiNest cx) []).flatMap (·.nodes)) ↔
        ∃ it ∈ items, n ∈ uiAtomsList (uiItem cx it []) := by
    induction items with
    | nil => simp [uiAtomsList]
    | cons it items ih =>
      rw [List.foldr_cons, uiNest_mem, ih]
      simp only [List.mem_cons, exists_eq_or_imp]
  simpa [uiComponentsWhere, List.mem_filter, and_assoc] using fold (cx.v.items.filter (fun it => it.shown && keep it))

/-- The complete source forest retains the contribution of every shown item. -/
theorem uiComponents_mem (cx : Ctx) (n : UiNode) :
    n ∈ uiAtomsList (uiComponents cx) ↔
      ∃ it ∈ cx.v.items, it.shown = true ∧ n ∈ uiAtomsList (uiItem cx it []) := by
  simp [uiComponents, uiComponentsWhere_mem]

@[simp] theorem uiLabel_nonempty (s fallback : String) (h : fallback ≠ "") :
    uiLabel s fallback ≠ "" := by
  by_cases hs : s = "" <;> simp [uiLabel, hs, h]

/-- D1: one shell banner contains the patient's identifiers in human format. -/
theorem D1_landmark (sp prog facts disp user s) :
    (renderUi sp prog facts disp user s).banner = uiClinicalBanner facts disp ∧
    ("Patient", disp.banner.name) ∈ (renderUi sp prog facts disp user s).banner ∧
    ("DOB", uiDate disp.banner.dob) ∈ (renderUi sp prog facts disp user s).banner ∧
    ("MRN", disp.banner.mrn) ∈ (renderUi sp prog facts disp user s).banner := by
  simp [renderUi, uiClinicalBanner, uiBanner]

/-- Every actual nav entry is precisely one shown, enabled goto component. -/
theorem uiNav_mem (cx : Ctx) (n : UiNode) :
    n ∈ uiNavAtoms (uiNav cx) ↔ ∃ it ∈ cx.v.items,
      it.shown = true ∧ uiNavButton cx it = true ∧
      n = .button it.comp.id (uiLabel it.comp.label "Action") "nav" true none none := by
  constructor
  · intro hn
    obtain ⟨group, hg, hn⟩ := List.mem_flatMap.mp hn
    obtain ⟨title, ht, rfl⟩ := List.mem_map.mp hg
    obtain ⟨pair, hp, heq⟩ := List.mem_map.mp hn
    obtain ⟨it, hi, rfl⟩ := List.mem_map.mp hp
    simp only [List.mem_filter, Bool.and_eq_true] at hi
    exact ⟨it, hi.1.1, hi.1.2.1, hi.1.2.2, heq.symm⟩
  · rintro ⟨it, hi, hs, hb, rfl⟩
    apply List.mem_flatMap.mpr
    refine ⟨_, List.mem_map.mpr ⟨uiNavTitle cx it, ?_, rfl⟩, ?_⟩
    · apply List.mem_eraseDups.mpr
      exact List.mem_append_right _ (List.mem_map.mpr ⟨it, List.mem_filter.mpr ⟨hi, by simp [hs, hb]⟩, rfl⟩)
    · apply List.mem_map.mpr
      refine ⟨_, List.mem_map.mpr ⟨it, ?_, rfl⟩, rfl⟩
      simp [hs, hb, hi]

/-- Relocated nav entries retain the exact semantic click, with no invented id. -/
theorem uiNavButton_item (cx : Ctx) (it : ItemView) (h : uiNavButton cx it = true) :
    uiItem cx it [] = [.button it.comp.id (uiLabel it.comp.label "Action") "nav" true none none] := by
  cases hk : it.comp.kind <;> simp [uiNavButton, hk] at h
  rename_i a
  cases a <;> simp [uiNavButton, hk] at h
  simp [uiItem, hk, actionRole, uiButton, h.1.1, uiBlocked, h.1.2]

/-- T10: every semantic contribution of every shown item appears in UiScreen,
whether its proper region is the shell, navigation, workspace, or side. -/
theorem T10_ui_shown (cx : Ctx) (it : ItemView) (hi : it ∈ cx.v.items)
    (hs : it.shown = true) (n : UiNode) (hn : n ∈ uiAtomsList (uiItem cx it [])) :
    UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n := by
  by_cases hb : it.comp.kind = .banner
  · simp [uiItem, hb, uiAtoms] at hn
    subst n
    simp [UiPresent, renderUi, uiBannerAtom]
  by_cases hv : uiNavButton cx it = true
  · rw [uiNavButton_item cx it hv] at hn
    simp [uiAtoms] at hn
    subst n
    have h := (uiNav_mem cx _).mpr ⟨it, hi, hs, hv, rfl⟩
    simp only [UiPresent, renderUi, Ctx.rebuild, List.mem_append, List.mem_singleton]
    exact Or.inl (Or.inr h)
  by_cases hd : uiSideAt cx it.comp.id = true
  · have h := (uiComponentsWhere_mem cx (fun jt => jt.comp.kind != .banner && !uiNavButton cx jt && uiSideAt cx jt.comp.id) n).mpr
        ⟨it, hi, hs, by simp [hb, hv, hd], hn⟩
    simp only [UiPresent, renderUi, Ctx.rebuild, uiSide, uiAtomsList_append, List.mem_append, List.mem_singleton]
    exact Or.inl (Or.inl (Or.inr (Or.inl (Or.inl h))))
  · have h := (uiComponentsWhere_mem cx (uiInWorkspace cx) n).mpr
        ⟨it, hi, hs, by simp [uiInWorkspace, hb, hv, hd], hn⟩
    simp only [UiPresent, renderUi, Ctx.rebuild, uiWorkspace, uiAtomsList_cons, uiAtoms, uiAtomsList_append, List.mem_append, List.mem_singleton]
    exact Or.inl (Or.inl (Or.inl (Or.inr (Or.inl h))))

/-- Read-only additions are clinical info or the visit-progress overview. -/
def UiReadOnly : UiNode → Prop
  | .info "" _ _ _ _ | .stepper _ _ => True
  | _ => False

/-- Missing-review additions have no component event id. -/
theorem uiMissing_readOnly (cx : Ctx) (n : UiNode)
    (hn : n ∈ uiAtomsList (uiMissingReviews cx)) : UiReadOnly n := by
  unfold uiMissingReviews at hn
  generalize ((uiRequiredReviews cx).filter _) = rs at hn
  induction rs with
  | nil => simp at hn
  | cons r rs ih =>
    simp [uiInfo, uiAtoms] at hn
    rcases hn with rfl | hn
    · trivial
    · exact ih hn

/-- Side defaults are read-only; original side controls retain their witnesses. -/
theorem uiSide_source (cx : Ctx) (n : UiNode) (hn : n ∈ uiAtomsList (uiSide cx)) :
    (∃ it ∈ cx.v.items, it.shown = true ∧ n ∈ uiAtomsList (uiItem cx it [])) ∨ UiReadOnly n := by
  simp only [uiSide, uiAtomsList_append, List.mem_append] at hn
  rcases hn with (hn | hn) | hn
  · obtain ⟨it, hi, hs, _, hn⟩ := (uiComponentsWhere_mem cx _ n).mp hn
    exact Or.inl ⟨it, hi, hs, hn⟩
  · right
    split at hn <;> simp [uiAtoms] at hn
    subst n; trivial
  · generalize ([("allergyList", "Allergies"), ("currentMeds", "Active medications"),
       ("problemList", "Problems"), ("vitals", "Recent vitals")] : List (String × String)) = pairs at hn
    right
    induction pairs with
    | nil => simp at hn
    | cons pair pairs ih =>
      simp only [List.filterMap_cons] at hn
      split at hn
      · exact ih hn
      · rename_i node heq
        split at heq
        · contradiction
        · cases heq
          simp [uiAtoms] at hn
          rcases hn with rfl | hn
          · trivial
          · exact ih (by simpa only [List.any_eq_true, Bool.and_eq_true] using hn)

/-- Every addressable node on the screen has a shown interpreter witness.
Only the clinical shell, progress overview and read-only supplements are added. -/
theorem uiPresent_source (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n) :
    (∃ it ∈ cx.v.items, it.shown = true ∧ n ∈ uiAtomsList (uiItem cx it [])) ∨ UiReadOnly n := by
  simp only [UiPresent, renderUi, Ctx.rebuild, uiWorkspace, uiAtomsList_cons, uiAtoms, uiAtomsList_append,
    List.mem_append, List.mem_singleton] at hn
  rcases hn with ((((rfl | (hn | hn)) | hn) | hn) | hn)
  · right; trivial
  · obtain ⟨it, hi, hs, _, hn⟩ := (uiComponentsWhere_mem cx _ n).mp hn
    exact Or.inl ⟨it, hi, hs, hn⟩
  · exact Or.inr (uiMissing_readOnly cx n hn)
  · exact uiSide_source cx n hn
  · obtain ⟨it, hi, hs, hb, rfl⟩ := (uiNav_mem cx n).mp hn
    exact Or.inl ⟨it, hi, hs, by simp [uiNavButton_item cx it hb, uiAtoms]⟩
  · subst n; right; trivial

/-- Only this item's id or the read-only banner id occurs in its nodes. -/
theorem uiItem_only_id (cx : Ctx) (it : ItemView) (n : UiNode)
    (hn : n ∈ uiAtomsList (uiItem cx it [])) (id : CompId) (hne : id ≠ "")
    (hid : uiComp n = some id) : id = it.comp.id := by
  cases hk : it.comp.kind <;>
    simp [uiItem, hk, uiField, uiItemInfo, uiButton, uiAtoms] at hn
  all_goals first
    | (rcases hn with rfl | hn; simp_all [uiComp])
    | (subst n; simpa [uiComp] using hid.symm)
    | (split at hn <;> simp_all [uiAtoms, uiAtomsList, uiComp])
  all_goals split at hn <;> simp_all [uiAtoms, uiComp]
  all_goals rcases hn with rfl | rfl <;> simp_all [uiComp]

/-- T10: hidden component ids are absent from workspace, side and nav. -/
theorem T10_ui_only_shown (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n)
    (id : CompId) (hne : id ≠ "") (hid : uiComp n = some id) : Shown cx id := by
  rcases uiPresent_source cx n hn with ⟨it, hi, hs, hn⟩ | hr
  · exact ⟨it, hi, hs, (uiItem_only_id cx it n hn id hne hid).symm⟩
  · cases n <;> simp_all [UiReadOnly, uiComp]

/-- T10: hidden components cannot leak through any screen region. -/
theorem T10_ui_hidden (cx : Ctx) (id : CompId) (hne : id ≠ "")
    (hidden : ¬ Shown cx id) :
    ∀ n, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n → uiComp n ≠ some id := by
  intro n hn hid
  exact hidden (T10_ui_only_shown cx n hn id hne hid)
/-- A counted info is a shown item of the interpreter, not a renderer guess. -/
theorem uiInfo_witness (cx : Ctx) (i : InfoId)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s i = true) :
    ∃ it ∈ cx.v.items, it.shown = true ∧ showsInfo i it.comp.kind = true := by
  obtain ⟨c, hc, hinfo⟩ := List.any_eq_true.mp hi
  simp only [Bool.and_eq_true] at hinfo
  let it := itemView cx.sp cx.facts cx.s (cx.prog.compsOf cx.s.screen) c
  have hm : it ∈ cx.v.items := by
    rw [Ctx.v_exact]
    exact List.mem_map.mpr ⟨c, hc, rfl⟩
  refine ⟨it, hm, ?_, hinfo.1⟩
  dsimp [it, itemView]
  unfold compShown
  rw [hinfo.2]
  cases hk : c.kind <;> simp_all [showsInfo]

/-- Every shown info contributes its entire full-detail or compact projection.
The projection is chosen only by shell placement, never by a row limit. -/
theorem uiItem_info (cx : Ctx) (it : ItemView) (i : InfoId)
    (hi : showsInfo i it.comp.kind = true) :
    ∃ comp label display rows, .info comp label i display rows ∈ uiAtomsList (uiItem cx it []) ∧
      (rows = uiRows cx i ∨ rows = uiSummaryRows cx i) := by
  cases hk : it.comp.kind <;> simp [showsInfo, hk, bannerInfo] at hi
  all_goals subst i
  · exact ⟨"", "Patient banner", "summary", [uiClinicalBanner cx.facts cx.disp],
      by simp [uiItem, hk, uiAtoms], Or.inl (by simp [uiRows, uiOrderInfo])⟩
  all_goals
    simp [uiItem, hk, uiItemInfo, uiAtoms]
    unfold uiItemRows
    refine ⟨_, _, _, _, ⟨rfl, rfl, rfl, rfl⟩, ?_⟩
    split <;> simp

/-- T11: the actual screen retains every relevant row of each shown info.
Workspace panels show full records; side panels show the specified compact
record projection (all allergies/meds, active problems, latest vitals per code). -/
theorem T11_ui_info (cx : Ctx) (i : InfoId)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s i = true) :
    ∃ comp label display rows, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label i display rows) ∧ (rows = uiRows cx i ∨ rows = uiSummaryRows cx i) := by
  obtain ⟨it, hm, hs, hk⟩ := uiInfo_witness cx i hi
  obtain ⟨comp, label, display, rows, hn, hr⟩ := uiItem_info cx it i hk
  exact ⟨comp, label, display, rows, T10_ui_shown cx it hm hs _ hn, hr⟩

/-- Workspace info always shows the complete full-detail records. -/
theorem uiWorkspace_info (cx : Ctx) (it : ItemView) (i : InfoId)
    (hw : uiInWorkspace cx it = true) (hi : showsInfo i it.comp.kind = true) :
    ∃ label display, .info it.comp.id label i display (uiRows cx i) ∈ uiAtomsList (uiItem cx it []) := by
  have hd : uiSideAt cx it.comp.id = false := by
    simp only [uiInWorkspace, Bool.and_eq_true, Bool.not_eq_true] at hw
    simpa using hw.2
  cases hk : it.comp.kind <;> simp [showsInfo, hk, bannerInfo] at hi
  · simp [uiInWorkspace, hk] at hw
  all_goals subst i; simp [uiItem, hk, uiItemInfo, uiItemRows, hd, uiAtoms]

/-- T11 for each full workspace panel: its exact source id and every full
clinical row are present. Compact summaries cannot satisfy this contract. -/
theorem T11_ui_full_info (cx : Ctx) (it : ItemView) (i : InfoId)
    (hm : it ∈ cx.v.items) (hs : it.shown = true)
    (hw : uiInWorkspace cx it = true) (hi : showsInfo i it.comp.kind = true) :
    ∃ label display, UiWorkspacePresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info it.comp.id label i display (uiRows cx i)) := by
  obtain ⟨label, display, hn⟩ := uiWorkspace_info cx it i hw hi
  refine ⟨label, display, ?_⟩
  have h := (uiComponentsWhere_mem cx (uiInWorkspace cx) _).mpr ⟨it, hm, hs, hw, hn⟩
  simp only [UiWorkspacePresent, renderUi, Ctx.rebuild, uiWorkspace, uiAtomsList_cons, uiAtoms,
    uiAtomsList_append, List.mem_append, List.mem_singleton]
  exact Or.inr (Or.inl h)

/-- D2: every required review is in the workspace with full rows. A compact
sidebar, receipt, or unselected tab cannot replace these complete commit reviews. -/
theorem D2_workspace_required (cx : Ctx) (r : ReviewReq) (hr : r ∈ uiRequiredReviews cx) :
    ∃ comp label display, UiWorkspacePresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label r.info display (uiRows cx r.info)) := by
  by_cases hi : uiFullInfoShown cx r.info = true
  · obtain ⟨it, hm, hs⟩ := List.any_eq_true.mp hi
    simp only [Bool.and_eq_true] at hs
    obtain ⟨label, display, hn⟩ := uiWorkspace_info cx it r.info hs.1.2 hs.2
    refine ⟨it.comp.id, label, display, ?_⟩
    have h := (uiComponentsWhere_mem cx (uiInWorkspace cx) _).mpr ⟨it, hm, hs.1.1, hs.1.2, hn⟩
    simp only [UiWorkspacePresent, renderUi, Ctx.rebuild, uiWorkspace, uiAtomsList_cons, uiAtoms, uiAtomsList_append, List.mem_append, List.mem_singleton]
    exact Or.inr (Or.inl h)
  · refine ⟨"", uiLabel (infoLabel cx r.info) (uiLabel (infoLabel cx r.info) "Clinical information"), (if uiOrderInfo r.info then "table" else "list"), ?_⟩
    have hm : uiInfo cx "" (infoLabel cx r.info) r.info "list" ∈ uiMissingReviews cx := by
      apply List.mem_map.mpr
      exact ⟨r, List.mem_filter.mpr ⟨hr, by simpa using hi⟩, rfl⟩
    have atoms_mem (ns : List UiNode) (node : UiNode) (hm : node ∈ ns) :
        ∀ atom ∈ uiAtoms node, atom ∈ uiAtomsList ns := by
      induction ns with
      | nil => simp at hm
      | cons n ns ih =>
        intro atom ha
        rcases List.mem_cons.mp hm with rfl | ht
        · simpa only [uiAtomsList_cons] using List.mem_append_left (uiAtomsList ns) ha
        · simpa only [uiAtomsList_cons] using List.mem_append_right (uiAtoms n) (ih ht atom ha)
    have h := atoms_mem _ _ hm (uiInfo cx "" (infoLabel cx r.info) r.info "list") (by simp [uiInfo, uiAtoms])
    simp only [UiWorkspacePresent, renderUi, Ctx.rebuild, uiWorkspace, uiAtomsList_cons, uiAtoms, uiAtomsList_append, List.mem_append, List.mem_singleton]
    exact Or.inr (Or.inr h)

/-- D2 also implies presence in the complete screen. -/
theorem D2_required_info (cx : Ctx) (r : ReviewReq) (hr : r ∈ uiRequiredReviews cx) :
    ∃ comp label display, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label r.info display (uiRows cx r.info)) := by
  obtain ⟨comp, label, display, hn⟩ := D2_workspace_required cx r hr
  exact ⟨comp, label, display, List.mem_append_left _ (List.mem_append_left _ (List.mem_append_left _ hn))⟩

/-- Disabled actions always carry a nonempty reason, including malformed inputs. -/
theorem uiBlocked_reason (cx : Ctx) (id : CompId) (h : uiEnabled cx id = false) :
    ∃ why, uiBlocked cx id = some why ∧ why ≠ "" := by
  exact ⟨uiLabel (uiReasonText cx (blockedReason cx id)) "Action unavailable", by simp [uiBlocked, h],
    uiLabel_nonempty _ _ (by decide)⟩

theorem uiButton_honest (cx : Ctx) (it : ItemView) (role : String)
    (hp : role = "primary" → ∃ jt ∈ cx.v.items, jt.shown = true ∧
      jt.comp.id = it.comp.id ∧ ∃ cm, jt.comp.kind = .button (.commit cm)) :
    UiActionHonest cx (uiButton cx it role) := by
  exact ⟨uiLabel_nonempty _ _ (by decide), uiBlocked_reason cx _, fun h => ⟨hp h, rfl⟩⟩

/-- Every button contributed by a shown item is labeled and honest. -/
theorem uiItem_honest (cx : Ctx) (it : ItemView) (hm : it ∈ cx.v.items)
    (hs : it.shown = true) (n : UiNode) (hn : n ∈ uiAtomsList (uiItem cx it [])) :
    UiActionHonest cx n := by
  have button (role) (hp : role ≠ "primary") := uiButton_honest cx it role (by simp [hp])
  cases hk : it.comp.kind <;>
    simp [uiItem, hk, uiAtoms, uiInfo, uiItemInfo, uiField, uiButton] at hn
  all_goals first
    | (subst n; trivial)
    | (subst n; exact button _ (by decide))
    | skip
  case field e slot prefill =>
    rcases hn with rfl | hn
    · simp [UiActionHonest]
    · split at hn
      · simp [uiAtoms] at hn
        subst n
        exact ⟨by decide, uiBlocked_reason cx _, by simp⟩
      · simp at hn
  case button action =>
    subst n
    apply uiButton_honest
    intro hp
    cases action <;> simp [actionRole] at hp
    exact ⟨it, hm, hs, rfl, _, hk⟩
  case search scope =>
    rcases hn with rfl | hn
    · trivial
    · split at hn <;> simp [uiAtoms] at hn
      subst n; trivial
  case group coll start =>
    by_cases hg : uiNavGroup it = true
    · simp [hg] at hn
    · simp only [hg, Bool.false_eq_true, ↓reduceIte] at hn
      by_cases hc : coll = true
      · simp [hc, uiAtoms] at hn
        rcases hn with rfl | rfl
        · trivial
        · exact ⟨by split <;> decide, uiBlocked_reason cx _, by simp⟩
      · simp [hc, uiAtoms] at hn
        subst n; trivial

/-- D3 covers all screen regions without changing interpreter enablement. -/
theorem D3_honest_actions (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n) :
    UiActionHonest cx n := by
  rcases uiPresent_source cx n hn with ⟨it, hm, hs, hn⟩ | hr
  · exact uiItem_honest cx it hm hs n hn
  · cases n <;> simp_all [UiReadOnly, UiActionHonest]

/-- D4: an open interruptive alert appears as a modal with an enabled ack.
The clinical label is displayed; the internal alert key is never exposed. -/
theorem D4_interruptive_modal (cx : Ctx) (a key : String) (rule : AlertSpec)
    (hp : cx.v.popup? = some (a, key)) (hr : cx.sp.alert? a = some rule)
    (ht : rule.tier = .interruptive) :
    (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).modal =
      some (.section a (uiLabel rule.label "Clinical alert")
        [.button a "Acknowledge" "ack" true none none]) := by
  simp [renderUi, uiModal, hp, hr, ht]

/-- D4: even an externally supplied malformed state cannot put a passive
alert in a modal. Passive alerts remain inline semantic alert nodes. -/
theorem D4_passive_no_modal (cx : Ctx) (a key : String) (rule : AlertSpec)
    (hp : cx.v.popup? = some (a, key)) (hr : cx.sp.alert? a = some rule)
    (ht : rule.tier = .passive) :
    (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).modal = none := by
  simp [renderUi, uiModal, hp, hr, ht]

/-- D6: a shown field's provenance, human-only, and pending-confirm flags are
copied exactly from the interpreter; pending confirmation has its own action. -/
theorem D6_clear_fields (cx : Ctx) (it : ItemView) (e : ElementId) (slot prefill)
    (hm : it ∈ cx.v.items) (hs : it.shown = true)
    (hk : it.comp.kind = .field e slot prefill) :
    UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) (uiField cx it e) ∧
    (∃ label kind value unit required, uiField cx it e =
      .field it.comp.id label kind value unit it.provenance? it.pendingConfirm it.humanOnly required ∧ label ≠ "") ∧
    (it.pendingConfirm = true → UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.button it.comp.id "Confirm prefilled value" "confirm" (uiEnabled cx it.comp.id)
        (uiBlocked cx it.comp.id) none)) := by
  refine ⟨T10_ui_shown cx it hm hs _ ?_, ?_, ?_⟩
  · simp [uiItem, hk, uiAtoms, uiField]
  · unfold uiField
    dsimp
    exact ⟨_, _, _, _, _, rfl, uiLabel_nonempty _ _ (by decide)⟩
  · intro hp
    apply T10_ui_shown cx it hm hs
    simp [uiItem, hk, hp, uiAtoms, uiField]

/-- D2 in direct spec/program terms: all hypotheses can be met by a disabled
commit too. No certification or guard-success assumption is needed. -/
theorem D2_commit_review (cx : Ctx) (r : ReviewReq) (hr : r ∈ cx.sp.reviews)
    (hw : whenHolds cx.facts cx.s r.when = true)
    (it : ItemView) (hm : it ∈ cx.v.items) (hs : it.shown = true)
    (hk : it.comp.kind = .button (.commit r.commit)) :
    ∃ comp label display, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label r.info display (uiRows cx r.info)) := by
  apply D2_required_info
  apply List.mem_filter.mpr
  refine ⟨hr, ?_⟩
  simp only [hw, Bool.true_and]
  exact List.any_eq_true.mpr ⟨it, hm, by simp [hs, hk]⟩

/-- T11: every allergy record survives both full panels and compact summaries. -/
theorem T11_ui_allergy_rows (cx : Ctx) (r : AllergyRow) (hr : r ∈ cx.disp.allergies)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "allergyList" display rows) ∧
      (allergyCells r ∈ rows ∨ uiAllergySummary r ∈ rows) := by
  obtain ⟨comp, label, display, rows, hm, hfull | hsummary⟩ := T11_ui_info cx "allergyList" hi
  · exact ⟨comp, label, display, rows, hm, Or.inl (hfull ▸ List.mem_map.mpr ⟨r, hr, rfl⟩)⟩
  · exact ⟨comp, label, display, rows, hm, Or.inr (hsummary ▸ List.mem_map.mpr ⟨r, hr, rfl⟩)⟩

/-- T11: every medication record survives both full panels and compact summaries. -/
theorem T11_ui_med_rows (cx : Ctx) (r : MedRow) (hr : r ∈ cx.disp.meds)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "currentMeds" display rows) ∧
      (medCells r ∈ rows ∨ uiMedSummary r ∈ rows) := by
  obtain ⟨comp, label, display, rows, hm, hfull | hsummary⟩ := T11_ui_info cx "currentMeds" hi
  · exact ⟨comp, label, display, rows, hm, Or.inl (hfull ▸ List.mem_map.mpr ⟨r, hr, rfl⟩)⟩
  · exact ⟨comp, label, display, rows, hm, Or.inr (hsummary ▸ List.mem_map.mpr ⟨r, hr, rfl⟩)⟩

/-- T11 from raw FHIR to semantic UiScreen: every active allergy resource survives. -/
theorem T11_ui_allergy_fhir (cx : Ctx) (ctx : FactsContext) (b r : Lean.Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (ha : Fhir.isAllergy r = true) (active : Fhir.allergyActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "allergyList" display rows) ∧ (allergyCells (Fhir.allergyRow r) ∈ rows ∨ uiAllergySummary (Fhir.allergyRow r) ∈ rows) :=
  T11_ui_allergy_rows cx _ (Fhir.T11_allergy ctx b _ _ hp r hr ha active) hi

/-- T11 from raw FHIR to semantic UiScreen: every current medication survives. -/
theorem T11_ui_med_fhir (cx : Ctx) (ctx : FactsContext) (b r : Lean.Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (ha : Fhir.isMedRequest r = true) (active : Fhir.medActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "currentMeds" display rows) ∧ (medCells (Fhir.medRow r) ∈ rows ∨ uiMedSummary (Fhir.medRow r) ∈ rows) :=
  T11_ui_med_rows cx _ (Fhir.T11_med ctx b _ _ hp r hr ha active) hi

/-- D4: a shown passive alert is an inline alert node, never a modal node. -/
theorem D4_passive_inline (cx : Ctx) (it : ItemView) (a : AlertId) (popup : Bool) (rule : AlertSpec)
    (hm : it ∈ cx.v.items) (hs : it.shown = true) (hk : it.comp.kind = .alert a popup)
    (hr : cx.sp.alert? a = some rule) (ht : rule.tier = .passive) :
    UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.alert it.comp.id a (uiLabel rule.label "Clinical alert") "passive") := by
  apply T10_ui_shown cx it hm hs
  simp [uiItem, hk, hr, ht, uiAtoms]

/-- Modal buttons are always labeled acknowledgments; they are not commits. -/
theorem uiModal_honest (cx : Ctx) (n : UiNode) (hn : n ∈ uiAtomsList (uiModal cx).toList) :
    UiActionHonest cx n := by
  cases hp : cx.v.popup? with
  | none => simp [uiModal, hp] at hn
  | some pair =>
    rcases pair with ⟨a, key⟩
    cases hr : cx.sp.alert? a with
    | none => simp [uiModal, hp, hr] at hn
    | some rule =>
      by_cases ht : rule.tier = .passive
      · simp [uiModal, hp, hr, ht] at hn
      · simp [uiModal, hp, hr, ht, uiAtoms] at hn
        rcases hn with rfl | rfl <;> simp [UiActionHonest]

/-- D3 includes the modal's acknowledgment action. -/
theorem D3_all_buttons (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n ∨
      n ∈ uiAtomsList (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).modal.toList) :
    UiActionHonest cx n := by
  rcases hn with hn | hn
  · exact D3_honest_actions cx n hn
  · apply uiModal_honest cx n
    simpa only [renderUi, Ctx.rebuild] using hn

/-- D6: labels are nonempty in every region, including side controls. -/
theorem D6_field_labels (cx : Ctx) (id label kind value unit provenance pending human required)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.field id label kind value unit provenance pending human required)) : label ≠ "" := by
  rcases uiPresent_source cx _ hn with ⟨it, _, _, hi⟩ | hr
  · cases hk : it.comp.kind <;>
      simp [uiItem, hk, uiItemInfo, uiField, uiButton, uiAtoms] at hi
    · rcases hi with hi | hi
      · obtain ⟨_, rfl, _⟩ := hi
        exact uiLabel_nonempty _ _ (by decide)
      · split at hi <;> simp [uiAtoms] at hi
    · split at hi <;> simp [uiAtoms] at hi
      split at hi <;> simp [uiAtoms] at hi
    · rcases hi with hi | hi
      · obtain ⟨_, rfl, _⟩ := hi
        exact uiLabel_nonempty _ _ (by decide)
      · split at hi <;> simp [uiAtoms] at hi
  · simp [UiReadOnly] at hr

/-- A shown Notes component retains every narrative and metadata field. -/
theorem uiNotes_complete (cx : Ctx) (r : NoteRow) (hr : r ∈ cx.disp.notes)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "encounterNotes" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "encounterNotes" display rows) ∧ noteCells r ∈ rows := by
  obtain ⟨comp, label, display, rows, hm, hf | hs⟩ := T11_ui_info cx "encounterNotes" hi
  · exact ⟨comp, label, display, rows, hm, hf ▸ List.mem_map.mpr ⟨r, hr, rfl⟩⟩
  · exact ⟨comp, label, display, rows, hm, hs ▸ List.mem_map.mpr ⟨r, hr, rfl⟩⟩

#print axioms uiNotes_complete

end Ehr.Render
