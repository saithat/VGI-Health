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
  cases hk : it.comp.kind <;>
    simp [uiItem, hk, uiTakesChildren, uiAtoms]
  split <;> simp [uiAtomsList]

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
theorem uiComponents_mem (cx : Ctx) (n : UiNode) :
    n ∈ uiAtomsList (uiComponents cx) ↔
      ∃ it ∈ cx.v.items, it.shown = true ∧ n ∈ uiAtomsList (uiItem cx it []) := by
  have fold (items : List ItemView) :
      n ∈ uiAtomsList ((items.foldr (uiNest cx) []).flatMap (·.nodes)) ↔
        ∃ it ∈ items, n ∈ uiAtomsList (uiItem cx it []) := by
    induction items with
    | nil => simp [uiAtomsList]
    | cons it items ih =>
      rw [List.foldr_cons, uiNest_mem, ih]
      simp only [List.mem_cons, exists_eq_or_imp]
  simpa [uiComponents, List.mem_filter, and_assoc] using fold (cx.v.items.filter (·.shown))

/-- D1: the sole banner landmark is the first field of UiScreen, and contains
name, DOB, and MRN on every input. Missing source values remain visibly empty;
the renderer cannot invent a missing patient identifier. -/
theorem D1_landmark (sp prog facts disp user s) :
    (renderUi sp prog facts disp user s).banner = uiBanner disp ∧
    ("Patient", disp.banner.name) ∈ (renderUi sp prog facts disp user s).banner ∧
    ("DOB", disp.banner.dob) ∈ (renderUi sp prog facts disp user s).banner ∧
    ("MRN", disp.banner.mrn) ∈ (renderUi sp prog facts disp user s).banner := by
  simp [renderUi, uiBanner]

@[simp] theorem uiLabel_nonempty (s fallback : String) (h : fallback ≠ "") :
    uiLabel s fallback ≠ "" := by
  by_cases hs : s = "" <;> simp [uiLabel, hs, h]

/-- T10: every node contributed by a shown item is in the actual UiScreen.
Container nodes are observed with their bodies empty by uiAtomsList. -/
theorem T10_ui_shown (cx : Ctx) (it : ItemView) (hi : it ∈ cx.v.items)
    (hs : it.shown = true) (n : UiNode) (hn : n ∈ uiAtomsList (uiItem cx it [])) :
    UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n := by
  have hm := uiComponents_mem cx n |>.mpr ⟨it, hi, hs, hn⟩
  change n ∈ uiAtomsList (.stepper _ _ :: (uiComponents cx ++ uiMissingReviews cx))
  simp only [uiAtomsList_cons, uiAtoms, uiAtomsList_append, List.mem_append]
  exact Or.inr (Or.inl hm)

/-- Each component produces its own id, even if its original label is empty. -/
theorem uiItem_has_id (cx : Ctx) (it : ItemView) :
    ∃ n ∈ uiAtomsList (uiItem cx it []), uiComp n = some it.comp.id := by
  cases hk : it.comp.kind <;>
    simp [uiItem, hk, uiField, uiInfo, uiButton, uiAtoms, uiComp]

/-- Only this item's id can occur in its own semantic nodes. -/
theorem uiItem_only_id (cx : Ctx) (it : ItemView) (n : UiNode)
    (hn : n ∈ uiAtomsList (uiItem cx it [])) (id : CompId) (hid : uiComp n = some id) :
    id = it.comp.id := by
  cases hk : it.comp.kind <;>
    simp [uiItem, hk, uiField, uiInfo, uiButton, uiAtoms] at hn
  all_goals first
    | (rcases hn with rfl | hn; simp_all [uiComp])
    | (subst n; simpa [uiComp] using hid.symm)
    | (split at hn <;> simp_all [uiAtoms, uiAtomsList, uiComp])
  all_goals split at hn <;> simp_all [uiAtoms, uiComp]

/-- The safety supplement dispatches no component events. -/
theorem uiMissing_only_empty (cx : Ctx) (n : UiNode)
    (hn : n ∈ uiAtomsList (uiMissingReviews cx)) (id : CompId) (hid : uiComp n = some id) : id = "" := by
  unfold uiMissingReviews at hn
  have mapped (rs : List ReviewReq) :
      ∀ n ∈ uiAtomsList (rs.map (fun r => uiInfo cx "" (infoLabel cx r.info) r.info "list")),
        uiComp n = some id → id = "" := by
    induction rs with
    | nil => simp
    | cons r rs ih =>
      intro n hn hid
      simp only [List.map_cons, uiAtomsList_cons, List.mem_append] at hn
      rcases hn with hn | hn
      · simp [uiInfo, uiAtoms] at hn
        subst n; simpa [uiInfo, uiComp] using hid.symm
      · exact ih n hn hid
  exact mapped _ n hn hid

/-- T10: a nonempty component id can occur in the workspace only if shown.
The empty id is reserved for read-only shell/safety information. -/
theorem T10_ui_only_shown (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n)
    (id : CompId) (hne : id ≠ "") (hid : uiComp n = some id) : Shown cx id := by
  change n ∈ uiAtomsList (.stepper _ _ :: (uiComponents cx ++ uiMissingReviews cx)) at hn
  simp only [uiAtomsList_cons, uiAtoms, List.mem_append, List.mem_singleton, uiAtomsList_append] at hn
  rcases hn with hn | hn | hn
  · subst n; simp [uiComp] at hid
  · obtain ⟨it, hi, hs, hm⟩ := (uiComponents_mem cx n).mp hn
    exact ⟨it, hi, hs, (uiItem_only_id cx it n hm id hid).symm⟩
  · exact False.elim (hne (uiMissing_only_empty cx n hn id hid))

/-- T10: an id that is never shown is absent from the semantic workspace.
This includes hidden groups, nonselected tabs, invisible and tiny components. -/
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
  refine ⟨it, List.mem_map.mpr ⟨c, hc, rfl⟩, ?_, hinfo.1⟩
  dsimp [it, itemView]
  unfold compShown
  rw [hinfo.2]
  cases hk : c.kind <;> simp_all [showsInfo]

/-- All rows of each shown info item are present in one semantic info node. -/
theorem uiItem_info (cx : Ctx) (it : ItemView) (i : InfoId)
    (hi : showsInfo i it.comp.kind = true) :
    ∃ label display, .info it.comp.id label i display (uiRows cx i) ∈ uiAtomsList (uiItem cx it []) := by
  cases hk : it.comp.kind <;> simp [showsInfo, hk, bannerInfo] at hi
  all_goals subst i; simp [uiItem, hk, uiInfo, uiAtoms]

/-- T11: whenever the interpreter counts info as visible, the actual workspace
contains its complete clinical rows, in the selected body or at workspace level. -/
theorem T11_ui_info (cx : Ctx) (i : InfoId)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s i = true) :
    ∃ comp label display, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label i display (uiRows cx i)) := by
  obtain ⟨it, hm, hs, hk⟩ := uiInfo_witness cx i hi
  obtain ⟨label, display, hn⟩ := uiItem_info cx it i hk
  exact ⟨it.comp.id, label, display, T10_ui_shown cx it hm hs _ hn⟩

/-- D2: every applicable review on a screen with its shown commit button is in
workspace with all rows, even if a malformed program omits the review panel.
The supplement does not remove or rename any existing component. -/
theorem D2_required_info (cx : Ctx) (r : ReviewReq) (hr : r ∈ uiRequiredReviews cx) :
    ∃ comp label display, UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.info comp label r.info display (uiRows cx r.info)) := by
  by_cases hi : infoShown cx.sp cx.prog cx.facts cx.s r.info = true
  · exact T11_ui_info cx r.info hi
  · refine ⟨"", uiLabel (infoLabel cx r.info) (uiLabel (infoLabel cx r.info) "Clinical information"), "list", ?_⟩
    have hm : uiInfo cx "" (infoLabel cx r.info) r.info "list" ∈ uiMissingReviews cx := by
      apply List.mem_map.mpr
      exact ⟨r, List.mem_filter.mpr ⟨hr, by simpa using hi⟩, rfl⟩
    have of_mem (ns : List UiNode) (node atom : UiNode) (hm : node ∈ ns)
        (ha : atom ∈ uiAtoms node) : atom ∈ uiAtomsList ns := by
      induction ns with
      | nil => simp at hm
      | cons n ns ih =>
        rcases List.mem_cons.mp hm with he | ht
        · subst n; simpa only [uiAtomsList_cons] using List.mem_append_left (uiAtomsList ns) ha
        · simpa only [uiAtomsList_cons] using List.mem_append_right (uiAtoms n) (ih ht)
    have atom := of_mem _ _ (uiInfo cx "" (infoLabel cx r.info) r.info "list") hm (by simp [uiInfo, uiAtoms])
    change _ ∈ uiAtomsList (.stepper _ _ :: (uiComponents cx ++ uiMissingReviews cx))
    simp only [uiAtomsList_cons, uiAtoms, uiAtomsList_append, List.mem_append]
    exact Or.inr (Or.inr atom)

/-- Disabled actions always carry a nonempty reason, including malformed inputs. -/
theorem uiBlocked_reason (cx : Ctx) (id : CompId) (h : uiEnabled cx id = false) :
    ∃ why, uiBlocked cx id = some why ∧ why ≠ "" := by
  exact ⟨uiLabel (blockedReason cx id) "Action unavailable", by simp [uiBlocked, h],
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
    simp [uiItem, hk, uiAtoms, uiInfo, uiField, uiButton] at hn
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
  case group coll start =>
    rcases hn with rfl | hn
    · trivial
    · split at hn
      · simp [uiAtoms] at hn
        subst n; exact button _ (by decide)
      · simp at hn

/-- The read-only review supplement introduces no actions. -/
theorem uiMissing_honest (cx : Ctx) (n : UiNode) (hn : n ∈ uiAtomsList (uiMissingReviews cx)) :
    UiActionHonest cx n := by
  unfold uiMissingReviews at hn
  generalize ((uiRequiredReviews cx).filter _) = rs at hn
  induction rs with
  | nil => simp at hn
  | cons r rs ih =>
    simp only [List.map_cons, uiAtomsList_cons, List.mem_append] at hn
    rcases hn with hn | hn
    · simp [uiInfo, uiAtoms] at hn; subst n; trivial
    · exact ih hn

/-- D3: all workspace buttons have nonempty labels and disabled reasons.
A primary button is a shown interpreter commit, enabled exactly by its view. -/
theorem D3_honest_actions (cx : Ctx) (n : UiNode)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s) n) :
    UiActionHonest cx n := by
  change n ∈ uiAtomsList (.stepper _ _ :: (uiComponents cx ++ uiMissingReviews cx)) at hn
  simp only [uiAtomsList_cons, uiAtoms, List.mem_append, List.mem_singleton, uiAtomsList_append] at hn
  rcases hn with rfl | hn | hn
  · trivial
  · obtain ⟨it, hm, hs, hi⟩ := (uiComponents_mem cx n).mp hn
    exact uiItem_honest cx it hm hs n hi
  · exact uiMissing_honest cx n hn

/-- D4: an open interruptive alert appears as a modal with an enabled ack.
The clinical label is displayed; the internal alert key is never exposed. -/
theorem D4_interruptive_modal (cx : Ctx) (a key : String) (rule : AlertSpec)
    (hp : cx.v.popup? = some (a, key)) (hr : cx.sp.alert? a = some rule)
    (ht : rule.tier = .interruptive) :
    (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).modal =
      some (.section a (uiLabel rule.label "Clinical alert")
        [.text (uiLabel rule.label "Clinical alert"), .button a "Acknowledge" "ack" true none none]) := by
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

/-- T11: every allergy display row is in the shown allergy info, with no limit. -/
theorem T11_ui_allergy_rows (cx : Ctx) (r : AllergyRow) (hr : r ∈ cx.disp.allergies)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "allergyList" display rows) ∧ allergyCells r ∈ rows := by
  obtain ⟨comp, label, display, hm⟩ := T11_ui_info cx "allergyList" hi
  exact ⟨comp, label, display, uiRows cx "allergyList", hm, List.mem_map.mpr ⟨r, hr, rfl⟩⟩

/-- T11: every active/on-hold medication display row is in the shown meds info. -/
theorem T11_ui_med_rows (cx : Ctx) (r : MedRow) (hr : r ∈ cx.disp.meds)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "currentMeds" display rows) ∧ medCells r ∈ rows := by
  obtain ⟨comp, label, display, hm⟩ := T11_ui_info cx "currentMeds" hi
  exact ⟨comp, label, display, uiRows cx "currentMeds", hm, List.mem_map.mpr ⟨r, hr, rfl⟩⟩

/-- T11 from raw FHIR to semantic UiScreen: every active allergy resource survives. -/
theorem T11_ui_allergy_fhir (cx : Ctx) (ctx : FactsContext) (b r : Lean.Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (ha : Fhir.isAllergy r = true) (active : Fhir.allergyActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "allergyList" display rows) ∧ allergyCells (Fhir.allergyRow r) ∈ rows :=
  T11_ui_allergy_rows cx _ (Fhir.T11_allergy ctx b _ _ hp r hr ha active) hi

/-- T11 from raw FHIR to semantic UiScreen: every current medication survives. -/
theorem T11_ui_med_fhir (cx : Ctx) (ctx : FactsContext) (b r : Lean.Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (ha : Fhir.isMedRequest r = true) (active : Fhir.medActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ comp label display rows,
      UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
        (.info comp label "currentMeds" display rows) ∧ medCells (Fhir.medRow r) ∈ rows :=
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
        rcases hn with rfl | rfl | rfl <;> simp [UiActionHonest]

/-- D3 covers the complete UiScreen, including the clinical side and modal. -/
theorem D3_all_buttons (cx : Ctx) (n : UiNode)
    (hn : n ∈ uiAtomsList
      ((renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).workspace ++
       (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).side ++
       (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s).modal.toList)) :
    UiActionHonest cx n := by
  simp only [uiAtomsList_append, List.mem_append] at hn
  rcases hn with (hn | hn) | hn
  · exact D3_honest_actions cx n hn
  · change n ∈ uiAtomsList (uiSide cx) at hn
    simp [uiSide, uiInfo, uiAtoms] at hn
    rcases hn with rfl | rfl | rfl | rfl <;> trivial
  · exact uiModal_honest cx n hn

/-- Every semantic field has a nonempty label, including chart search fields. -/
theorem D6_field_labels (cx : Ctx) (id label kind value unit provenance pending human required)
    (hn : UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
      (.field id label kind value unit provenance pending human required)) : label ≠ "" := by
  change _ ∈ uiAtomsList (.stepper _ _ :: (uiComponents cx ++ uiMissingReviews cx)) at hn
  simp only [uiAtomsList_cons, uiAtoms, List.mem_append, List.mem_singleton, uiAtomsList_append] at hn
  rcases hn with hn | hn | hn
  · cases hn
  · obtain ⟨it, _, _, hi⟩ := (uiComponents_mem cx _).mp hn
    cases hk : it.comp.kind <;>
      simp [uiItem, hk, uiInfo, uiField, uiButton, uiAtoms] at hi
    · rcases hi with hi | hi
      · obtain ⟨_, rfl, _⟩ := hi
        exact uiLabel_nonempty _ _ (by decide)
      · split at hi <;> simp [uiAtoms] at hi
    · split at hi <;> simp [uiAtoms] at hi
    · obtain ⟨_, rfl, _⟩ := hi
      exact uiLabel_nonempty _ _ (by decide)
  · unfold uiMissingReviews at hn
    generalize ((uiRequiredReviews cx).filter _) = rs at hn
    induction rs with
    | nil => simp at hn
    | cons r rs ih =>
      simp [uiInfo, uiAtoms] at hn
      exact ih hn

end Ehr.Render
