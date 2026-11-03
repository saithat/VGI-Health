import Ehr.Render.Ui

/-!
Reviewable requirements for the EHR tree sent to the browser.
They describe which controls and information are present and which actions
are allowed, independently of browser styling.
-/

namespace Ehr.Render

/-- Read-only additions are clinical info or the visit-progress overview. -/
def UiReadOnly : UiNode → Prop
  | .info "" _ _ _ _ | .stepper _ _ => True
  | _ => False

@[simp] theorem uiDatedWorkspace_atoms (cx : Ctx) :
    uiAtomsList (uiDatedWorkspace cx) = uiAtomsList (uiWorkspace cx) := by
  unfold uiDatedWorkspace
  split <;> simp [uiAtomsList, uiAtoms]

#print axioms uiDatedWorkspace_atoms

/-- Any emitted index row requires binding and matching present source identities. -/
theorem uiDateSourcesAt_bound (cx : Ctx) (nodes : List UiNode) (source : UiSourceDate)
    (h : source ∈ uiDateSourcesAt cx nodes) :
    (Workspace.enabled cx.prog = false ∨ Workspace.bound cx.facts cx.s = true) ∧
      cx.facts.sourcePatientId?.isSome = true ∧ cx.facts.sourcePatientId? = cx.disp.sourcePatientId? := by
  unfold uiDateSourcesAt at h
  split at h
  · rename_i gate
    simp only [uiDateBound, Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true', beq_iff_eq] at gate
    exact ⟨gate.1.1, gate.1.2, gate.2⟩
  · simp at h

/-- A real rendered info row, not an arbitrary whole-bundle candidate, authorizes
this source. Payload overrides deliberately carry no implicit authorization. -/
theorem uiDateSourcesAt_shown (cx : Ctx) (nodes : List UiNode) (source : UiSourceDate)
    (h : source ∈ uiDateSourcesAt cx nodes) :
    source ∈ cx.disp.timelineSources?.getD [] ∧
    ∃ b ∈ cx.disp.timelineBackings?.getD [], b.source = source ∧
      (infoPayload cx.facts b.info).isNone = true ∧ ∃ comp title style rows,
        UiNode.info comp title b.info style rows ∈ uiAtomsList nodes ∧ b.row ∈ rows := by
  unfold uiDateSourcesAt at h
  split at h
  · obtain ⟨hc, b, hb, hs, witness⟩ := DateIndex.selected_source _ _ _ _ h
    obtain ⟨hb, hp⟩ := List.mem_filter.mp hb
    simp only [Bool.and_eq_true] at hp
    exact ⟨hc, b, hb, hs, hp.2, witness⟩
  · simp at h

/-- Direct ordinary calls cannot build a clinical index during unbound lookup. -/
theorem uiDatedWorkspace_unbound (cx : Ctx)
    (enabled : Workspace.enabled cx.prog = true) (unbound : Workspace.bound cx.facts cx.s = false) :
    uiDatedWorkspace cx = uiWorkspace cx := by
  simp [uiDatedWorkspace, uiDateBound, enabled, unbound]

theorem uiDateSourcesAt_unbound (cx : Ctx) (nodes : List UiNode)
    (enabled : Workspace.enabled cx.prog = true) (unbound : Workspace.bound cx.facts cx.s = false) :
    uiDateSourcesAt cx nodes = [] := by
  simp [uiDateSourcesAt, uiDateBound, enabled, unbound]

#print axioms uiDateSourcesAt_bound
#print axioms uiDateSourcesAt_shown
#print axioms uiDatedWorkspace_unbound
#print axioms uiDateSourcesAt_unbound

/-- Nav pairs carry real click component ids. This observer expands each pair
into its semantic button meaning; it adds no rendered workspace node. -/
def uiNavAtoms (nav : List (String × List (String × String))) : List UiNode :=
  nav.flatMap fun (_, entries) => entries.map fun (id, label) =>
    .button id label "nav" true none none

/-- Observe the shell's clinical fields once. The banner is read-only. -/
def uiBannerAtom (screen : UiScreen) : UiNode :=
  .info "" "Patient banner" "patientBanner" "summary" [screen.banner]

/-- Presence across workspace, side, real nav clicks, and the shell banner.
Modals have their separate D4 presentation contract. -/
def UiPresent (screen : UiScreen) (node : UiNode) : Prop :=
  node ∈ uiAtomsList screen.workspace ++ uiAtomsList screen.side ++
    uiNavAtoms screen.nav ++ [uiBannerAtom screen]

/-- The witness is present in the actual ordinary renderer, not merely in a
candidate display list or an unrendered program item. -/
theorem uiDateSources_present (cx : Ctx) (source : UiSourceDate)
    (h : source ∈ uiDateSources cx) :
    ∃ b ∈ cx.disp.timelineBackings?.getD [], b.source = source ∧
      ∃ comp title style rows,
        UiPresent (renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s)
          (.info comp title b.info style rows) ∧ b.row ∈ rows := by
  obtain ⟨_, b, hb, hs, _, comp, title, style, rows, hn, hr⟩ :=
    uiDateSourcesAt_shown cx _ source h
  refine ⟨b, hb, hs, comp, title, style, rows, ?_, hr⟩
  simp only [uiAtomsList_append, List.mem_append] at hn
  simp only [UiPresent, renderUi, Ctx.rebuild, uiDatedWorkspace_atoms,
    List.mem_append, List.mem_singleton]
  rcases hn with hw | hs
  · simp [hw]
  · simp [hs]

/-- The ordinary observer records the entire payload and all inherited indexes. -/
theorem uiDatedWorkspace_observed (cx : Ctx) :
    DateIndex.observeList (uiDatedWorkspace cx) =
      if uiDateBound cx && cx.v.items.any (fun it => it.shown &&
          (it.comp.tag == "layout.datedTimeline" || it.comp.tag.endsWith ".layout.datedTimeline")) then
        [.datedTimeline "Dated clinical timeline (UTC)" (Dated.dated (uiDateSources cx))
          (Dated.undated (uiDateSources cx)) []] ++ DateIndex.observeList (uiWorkspace cx)
      else DateIndex.observeList (uiWorkspace cx) := by
  unfold uiDatedWorkspace
  split <;> simp_all [DateIndex.observeList, DateIndex.observe]

#print axioms uiDateSources_present
#print axioms uiDatedWorkspace_observed

/-- D2 retains the stricter workspace-only requirement for commit reviews. -/
def UiWorkspacePresent (screen : UiScreen) (node : UiNode) : Prop :=
  node ∈ uiAtomsList screen.workspace

/-- Identity of component-bearing semantic nodes. Sidebar and safety supplement
info nodes use the empty id and cannot dispatch component events. -/
def uiComp : UiNode → Option CompId
  | .section id _ _ | .tabs id _ _ _ => some id
  | .field id _ _ _ _ _ _ _ _ | .info id _ _ _ _ | .alert id _ _ _
  | .button id _ _ _ _ _ => some id
  | _ => none

/-- Semantic action safety includes every button, including toggle and confirm. -/
def UiActionHonest (cx : Ctx) (node : UiNode) : Prop :=
  match node with
  | .button id label role enabled reason _ =>
    label ≠ "" ∧
    (enabled = false → ∃ why, reason = some why ∧ why ≠ "") ∧
    (role = "primary" →
      (∃ it ∈ cx.v.items, it.shown = true ∧ it.comp.id = id ∧
        ∃ cm, it.comp.kind = .button (.commit cm)) ∧ enabled = uiEnabled cx id)
  | _ => True

end Ehr.Render
