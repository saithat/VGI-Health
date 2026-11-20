import Ehr.Check.ContextSound
import Ehr.Proofs.Frame

namespace Ehr.Check
open Ehr Ehr.Props

private theorem unique_lookup (cs : List Component) (c : Component) (P : Component → Bool)
    (ids : (cs.map Component.id).Nodup) (hc : c ∈ cs) (hp : P c) :
    cs.find? (fun x => x.id == c.id && P x) = some c := by
  induction cs with
  | nil => contradiction
  | cons x xs ih =>
    simp only [List.map_cons, List.nodup_cons] at ids
    rcases List.mem_cons.mp hc with rfl | hc
    · simp [hp]
    · have different : x.id ≠ c.id := fun eq => ids.1 (eq ▸ List.mem_map_of_mem hc)
      simp [different, ih ids.2 hc]

/-- Every screen returned by the search satisfies any invariant preserved by its edges. -/
private theorem bfs_closed (p : Program) (edges : ScreenId → List Hop) (a : ScreenId)
    (P : ScreenId → Prop) (start : P a) (extend : ∀ x, P x → ∀ h ∈ edges x, P h.2) :
    ∀ row ∈ bfs p edges a, P row.1 := by
  let good := fun (rows : List (ScreenId × List Hop)) => ∀ row ∈ rows, P row.1
  have round (seen frontier) (hf : good frontier) : good (bfsRound edges seen frontier) := by
    apply List.foldlRecOn (motive := good)
    · simp [good]
    · intro _ ha row hr
      apply List.foldlRecOn (motive := good) _ _ ha
      intro acc hb hop hh
      split
      · exact hb
      · intro r h
        rcases List.mem_append.mp h with h | h
        · exact hb r h
        · obtain rfl := List.mem_singleton.mp h
          exact extend _ (hf row hr) _ hh
  have loop (n seen frontier) (hs : good seen) (hf : good frontier) : good (bfsAux edges n seen frontier) := by
    induction n generalizing seen frontier with
    | zero => exact hs
    | succ n ih =>
      unfold bfsAux
      split
      · exact hs
      · have hg := round seen frontier hf
        exact ih _ _ (fun r hr => (List.mem_append.mp hr).elim (hs r) (hg r)) hg
  exact loop _ _ _ (by simpa [good]) (by simpa [good])

/-- Fixed-shown goto edges compose to a run of successful human clicks. -/
private theorem context_route (sp p f u a z) (ids : IdsUnique p) (hz : z ∈ contextDestinations sp p a)
    (s : State) (hs : s.screen = a) (modal : s.popup? = none) :
    ∃ es t, OkRun sp p f u s es t ∧ t.screen = z ∧ t.popup? = none := by
  obtain ⟨row, filtered, rfl⟩ := List.mem_map.mp hz
  have hr := (List.mem_filter.mp filtered).1
  refine bfs_closed p (contextEdges p) a
    (fun z => ∃ es t, OkRun sp p f u s es t ∧ t.screen = z ∧ t.popup? = none)
    ⟨[], s, .nil s, hs, modal⟩ ?_ row hr
  intro x h hop he
  obtain ⟨es, t, ran, screen, clear⟩ := h
  obtain ⟨c, hc, hhop⟩ := List.mem_filterMap.mp he
  cases hk : c.kind with
  | button act =>
    cases act <;> simp [hk, gotoOf?] at hhop
    rename_i dest
    obtain ⟨⟨fixed, existsDst⟩, rfl⟩ := hhop
    obtain ⟨dst, lookup⟩ := Option.isSome_iff_exists.mp existsDst
    have unique : ((p.compsOf x).map Component.id).Nodup := by
      cases hlook : p.screen? x with
      | none => simp [Program.compsOf, hlook]
      | some scr => simpa [Program.compsOf, hlook] using ids.2 scr (List.mem_of_find?_eq_some hlook)
    have shown : shownComp? sp p f t c.id = some c := by
      unfold shownComp?
      rw [screen]
      apply unique_lookup _ _ _ unique hc
      simp [compShown, hk, fixedShown_sound sp f t _ c fixed]
    let arrived := prefillScreen sp p f { t with screen := dest, history := t.screen :: t.history }
    have event : step sp p f u .human t (.click c.id) = (arrived, .ok) := by
      simp [step, clear, clickedMacro?, shown, hk, stepCore, stepEvent, clickCore, goTo, lookup, arrived]
    have frame := Ehr.Proofs.prefillScreen_frame sp p f { t with screen := dest, history := t.screen :: t.history }
    exact ⟨_, arrived, ran.append (.cons event (.nil _)), frame.2.2.2.2.1, frame.2.2.2.1.trans clear⟩
  | _ => all_goals simp [hk, gotoOf?] at hhop

private theorem context_fuel (cs l n c m) (h : contextShownAux cs l n c) (hm : n ≤ m) :
    contextShownAux cs l m c := by
  induction n generalizing c m with
  | zero => contradiction
  | succ n ih =>
    cases m with
    | zero => omega
    | succ m =>
      simp only [contextShownAux, Bool.and_eq_true] at h ⊢
      refine ⟨h.1, ?_⟩
      cases hp : c.parent? with
      | none => rfl
      | some id =>
        cases hf : cs.find? (·.id == id) with
        | none => simp [hp, hf] at h
        | some par =>
          simp only [hp, hf, Bool.and_eq_true] at h ⊢
          exact ⟨h.2.1, ih _ _ h.2.2 (by omega)⟩

-- Moving a container toward a verified layout keeps all ancestor gates that
-- are already open in both the current and desired layout.
private theorem context_keep (cs : List Component) (current goal next : State)
    (keep : ∀ a b, parentOpen current a b → parentOpen goal a b → parentOpen next a b)
    (n c) (h : contextShownAux cs current n c) (g : contextShownAux cs goal n c) :
    contextShownAux cs next n c := by
  induction n generalizing c with
  | zero => contradiction
  | succ n ih =>
    simp only [contextShownAux, Bool.and_eq_true] at h g ⊢
    refine ⟨h.1, ?_⟩
    cases hp : c.parent? with
    | none => simp
    | some id =>
      cases hf : cs.find? (·.id == id) with
      | none => simp [hp, hf] at h
      | some par =>
        simp only [hp, hf, Bool.and_eq_true] at h g ⊢
        exact ⟨keep _ _ h.2.1 g.2.1, ih _ h.2.2 g.2.2⟩

private theorem context_lookup (sp p f s cs) (ids : (cs.map Component.id).Nodup)
    (atScreen : p.compsOf s.screen = cs) (c n) (member : c ∈ cs)
    (h : contextShownAux cs s n c) (len : n ≤ cs.length + 1)
    (ordinary : ∀ a popup, c.kind ≠ .alert a popup) :
    shownComp? sp p f s c.id = some c := by
  unfold shownComp?
  rw [atScreen]
  apply unique_lookup _ _ _ ids member
  have vis := contextShownAux_sound sp f s cs s _ c (context_fuel _ _ _ _ _ h len)
  simp only [compShown, Bool.and_eq_true]
  exact ⟨vis, by cases hk : c.kind <;> simp_all⟩

/-- Open or select ancestors from the outside in, preserving the shown path to each parent. -/
private theorem context_reveal (sp p f u cs goal) (ids : (cs.map Component.id).Nodup)
    (n c) (g : contextShownAux cs goal n c) (len : n ≤ cs.length + 1)
    (s : State) (atScreen : p.compsOf s.screen = cs) (modal : s.popup? = none) :
    ∃ es t, OkRun sp p f u s es t ∧ t.screen = s.screen ∧ t.popup? = none ∧
      contextShownAux cs t n c := by
  induction n generalizing c with
  | zero => contradiction
  | succ n ih =>
    simp only [contextShownAux, Bool.and_eq_true] at g
    cases hp : c.parent? with
    | none => exact ⟨[], s, .nil _, rfl, modal, by simpa [contextShownAux, hp] using g.1⟩
    | some id =>
      cases hf : cs.find? (·.id == id) with
      | none => simp [hp, hf] at g
      | some par =>
        simp only [hp, hf, Bool.and_eq_true] at g
        obtain ⟨es, t, ran, screen, clear, shown⟩ := ih par g.2.2 (by omega)
        by_cases already : parentOpen t par c
        · exact ⟨es, t, ran, screen, clear, by simpa [contextShownAux, hp, hf, already, shown] using g.1⟩
        have lookup := context_lookup sp p f t cs ids (screen ▸ atScreen) par n
          (List.mem_of_find?_eq_some hf) shown (by omega) (by
            intro a popup h; simp [parentOpen, h] at g)
        have goalOpen := g.2.1
        cases hk : par.kind with
        | group coll start =>
          cases coll with
          | false => simp [parentOpen, hk] at already
          | true =>
            have closed : par.id ∉ t.expanded := by simpa [parentOpen, hk] using already
            let opened := { t with expanded := t.expanded ++ [par.id] }
            have event : step sp p f u .human t (.click par.id) = (opened, .ok) := by
              simp [step, clear, clickedMacro?, lookup, hk, stepCore, stepEvent, clickCore, toggle, closed, opened]
            have still := context_keep cs t goal opened (by
              intro a b ha _
              cases k : a.kind <;> simp only [parentOpen, k, Bool.false_eq_true] at ha ⊢
              case group => simp [opened] at ha ⊢; grind
              case tabs => exact ha) n par shown g.2.2
            refine ⟨_, opened, ran.append (.cons event (.nil _)), screen, clear, ?_⟩
            simp [contextShownAux, hp, hf, still, parentOpen, hk, opened, g.1]
        | tabs =>
          have target : goal.tabOf par.id = c.tab := by simpa [parentOpen, hk] using goalOpen
          let selected := { t with tabSel := (par.id, c.tab) :: t.tabSel.filter (·.1 != par.id) }
          have event : step sp p f u .human t (.selectTab par.id c.tab) = (selected, .ok) := by
            simp [step, stepCore, stepEvent, clear, Event.isAck, selectTabCore, lookup, hk, selected]
          have still := context_keep cs t goal selected (by
            intro a b ha hb
            cases k : a.kind <;> simp_all only [parentOpen, Bool.false_eq_true]
            case tabs =>
              by_cases eq : a.id = par.id
              · simp_all [State.tabOf, selected]
              · have pred : (fun v : CompId × Nat => decide ((v.1 != par.id) = true ∧ (v.1 == a.id) = true)) =
                    (fun v => v.1 == a.id) := by
                    funext v
                    by_cases e : v.1 = a.id <;> simp_all
                simpa only [State.tabOf, selected, List.find?_cons, beq_eq_false_iff_ne.mpr (Ne.symm eq), Bool.false_eq_true, ↓reduceIte,
                  List.find?_filter, pred] using ha
            all_goals exact ha) n par shown g.2.2
          refine ⟨_, selected, ran.append (.cons event (.nil _)), screen, clear, ?_⟩
          simp [contextShownAux, hp, hf, still, parentOpen, hk, selected, State.tabOf, g.1]
        | _ => all_goals simp [parentOpen, hk] at goalOpen

private theorem reach_request_control (sp p f u workflow kind start dest)
    (ids : IdsUnique p) (route : dest ∈ contextDestinations sp p start)
    (available : priorAuthDestination p workflow kind dest)
    (ordinary : ∀ a popup, kind ≠ .alert a popup)
    (s : State) (atStart : s.screen = start) (modal : s.popup? = none) :
    ∃ (es : List Event) (t : State) (c : Component), OkRun sp p f u s es t ∧
      t.screen = dest ∧ t.popup? = none ∧ (p.screen? t.screen).map Screen.workflow = some workflow ∧
      c.kind = kind ∧ shownComp? sp p f t c.id = some c ∧
      (itemView sp f t (p.compsOf t.screen) c).shown := by
  obtain ⟨path, arrived, go, here, clear⟩ := context_route sp p f u _ _ ids route s atStart modal
  cases look : p.screen? dest with
  | none => simp [priorAuthDestination, look] at available
  | some dst =>
    simp only [priorAuthDestination, look, Option.any_some, Bool.and_eq_true,
      beq_iff_eq, List.any_eq_true] at available
    obtain ⟨wf, c, member, ck, showable⟩ := available
    have unique := ids.2 dst (List.mem_of_find?_eq_some look)
    have comps : p.compsOf arrived.screen = dst.components := by simp [Program.compsOf, here, look]
    obtain ⟨events, t, reveal, screen, free, visible⟩ :=
      context_reveal sp p f u _ _ unique _ _ showable (Nat.le_refl _) arrived comps clear
    rw [← screen] at comps
    have lookup := context_lookup sp p f t _ unique comps c _ member visible (Nat.le_refl _) (ck ▸ ordinary)
    refine ⟨_, t, c, go.append reveal, screen.trans here, free, by simp [screen, here, look, wf], ck, lookup, ?_⟩
    have test := List.find?_some (p := fun x : Component =>
      x.id == c.id && compShown sp f t (p.compsOf t.screen) x) lookup
    exact (Bool.and_eq_true_iff.mp test).2

/-- New specification for owner review. From an open service composer, a human
can navigate and reveal the button, then its field, through successful interpreter
steps. Both are shown on their own workflow. An existing popup must be handled first. -/
theorem accepted_servicePriorAuth (sp prev can p) (h : check sp prev can p = .ok)
    (scr : Screen) (hs : scr ∈ p.screens) (declared : (sp.element? priorAuthElement).isSome)
    (service : serviceOrderScreen scr = true) (f : Facts) (u : User) (s : State)
    (atStart : s.screen = scr.id) (modal : s.popup? = none) :
    ∃ (before after : List Event) (b t : State) (button field : Component),
      OkRun sp p f u s before b ∧ OkRun sp p f u b after t ∧
      (p.screen? b.screen).map Screen.workflow = some scr.workflow ∧
      (p.screen? t.screen).map Screen.workflow = some scr.workflow ∧
      button.kind = .button .requestPriorAuth ∧ field.kind = .field priorAuthElement .current .none ∧
      shownComp? sp p f b button.id = some button ∧ shownComp? sp p f t field.id = some field ∧
      (itemView sp f b (p.compsOf b.screen) button).shown ∧
      (itemView sp f t (p.compsOf t.screen) field).shown := by
  have all := (check_ok_iff sp prev can p).mp h
  have pass : p.screens.all (priorAuthAvailable sp p) = true :=
    all _ (List.getLast_mem (l := rules sp prev can p) (by simp [rules]))
  have avail := List.all_eq_true.mp pass scr hs
  have absent : (sp.element? priorAuthElement).isNone = false := by
    cases he : sp.element? priorAuthElement <;> simp_all
  simp only [priorAuthAvailable, absent, service, Bool.not_true, Bool.false_or,
    List.any_eq_true, Bool.and_eq_true] at avail
  obtain ⟨z, route, btn, y, next, fld⟩ := avail
  have ids := (accepted_structural sp prev can p h).2.2.1
  obtain ⟨es, b, button, go, here, clear, wf, bk, bl, bv⟩ :=
    reach_request_control sp p f u _ _ _ _ ids route btn (by simp) s atStart modal
  obtain ⟨fs, t, field, visit, _, _, wf', fk, fl, fv⟩ :=
    reach_request_control sp p f u _ _ _ _ ids next fld (by simp) b here clear
  exact ⟨es, fs, b, t, button, field, go, visit, wf, wf', bk, fk, bl, fl, bv, fv⟩

#print axioms unique_lookup
#print axioms bfs_closed
#print axioms context_route
#print axioms context_fuel
#print axioms context_keep
#print axioms context_lookup
#print axioms context_reveal
#print axioms reach_request_control
#print axioms accepted_servicePriorAuth
end Ehr.Check
