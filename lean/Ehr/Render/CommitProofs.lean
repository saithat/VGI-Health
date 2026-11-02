import Ehr.Render.Proofs
namespace Ehr.Render

theorem enabled_mem (cx : Ctx) (id : CompId) :
    id ∈ cx.v.enabled ↔ cx.s.popup? = none ∧
      ∃ c ∈ cx.prog.compsOf cx.s.screen,
        compShown cx.sp cx.facts cx.s (cx.prog.compsOf cx.s.screen) c = true ∧
        c.id = id ∧ actionStatus cx.sp cx.prog cx.facts cx.user cx.s c = some none := by
  cases hp : cx.s.popup? with
  | none =>
    simp [Ctx.v, Ctx.viewCache_exact, view, hp, List.mem_filterMap, List.mem_filter]
    constructor
    · rintro ⟨a, b, ⟨c, ⟨hc, hs⟩, ha, he⟩, hb, hid⟩
      subst b
      exact ⟨c, hc, hs, he.trans hid, ha⟩
    · rintro ⟨c, hc, hs, hid, ha⟩
      exact ⟨id, none, ⟨c, ⟨hc, hs⟩, ha, hid⟩, rfl, rfl⟩
  | some p => simp [Ctx.v, Ctx.viewCache_exact, view, hp]
/-- Unique component ids identify the same component, even for malformed
 programs elsewhere. The theorem requires uniqueness only on this screen. -/
theorem id_unique (cs : List Component) (hn : (cs.map (·.id)).Nodup)
    (a b : Component) (ha : a ∈ cs) (hb : b ∈ cs) (he : a.id = b.id) : a = b := by
  induction cs with
  | nil => simp at ha
  | cons c cs ih =>
    simp only [List.map_cons, List.nodup_cons] at hn
    rcases List.mem_cons.mp ha with hac | hat
    · subst a
      rcases List.mem_cons.mp hb with hbc | hbt
      · exact hbc.symm
      · exact False.elim (hn.1 (List.mem_map.mpr ⟨b, hbt, he.symm⟩))
    · rcases List.mem_cons.mp hb with hbc | hbt
      · subst b
        exact False.elim (hn.1 (List.mem_map.mpr ⟨a, hat, he⟩))
      · exact ih hn.2 hat hbt

/-- A commit button's local action status is exactly the base guard and
 not-already-committed test. Opening its pending alert remains a valid click. -/
theorem commit_status (cx : Ctx) (c : Component) (cm : CommitId) (hk : c.kind = .button (.commit cm)) :
    actionStatus cx.sp cx.prog cx.facts cx.user cx.s c = some none ↔
      cm ∉ cx.s.commits ∧ guardBase cx.sp cx.prog cx.facts cx.user cx.s cm = true := by
  by_cases hc : cm ∈ cx.s.commits <;>
    by_cases hg : guardBase cx.sp cx.prog cx.facts cx.user cx.s cm = true <;>
      simp [actionStatus, hk, hc, hg]

/-- T10: a shown commit button is enabled exactly when no popup is open,
 the commit is new, and the actual interpreter's base guard holds. -/
theorem T10_commit_enabled (cx : Ctx) (c : Component) (cm : CommitId)
    (hn : ((cx.prog.compsOf cx.s.screen).map (·.id)).Nodup)
    (hc : c ∈ cx.prog.compsOf cx.s.screen)
    (hs : compShown cx.sp cx.facts cx.s (cx.prog.compsOf cx.s.screen) c = true)
    (hk : c.kind = .button (.commit cm)) :
    c.id ∈ cx.v.enabled ↔ cx.s.popup? = none ∧ cm ∉ cx.s.commits ∧
      guardBase cx.sp cx.prog cx.facts cx.user cx.s cm = true := by
  rw [enabled_mem]
  constructor
  · rintro ⟨hp, d, hd, _, hid, ha⟩
    have he := id_unique _ hn d c hd hc hid
    subst d
    exact ⟨hp, (commit_status cx c cm hk).mp ha⟩
  · rintro ⟨hp, hnew, hg⟩
    exact ⟨hp, c, hc, hs, rfl, (commit_status cx c cm hk).mpr ⟨hnew, hg⟩⟩

-- Tiny has a shown but blocked sign button; the guard equivalence is not vacuous.
example :
    "signButton" ∈ (view Examples.Tiny.spec Examples.Tiny.program Examples.Tiny.facts Examples.Tiny.user
      { tinyCtx.s with screen := "sign" }).enabled ↔
      ({ tinyCtx.s with screen := "sign" } : State).popup? = none ∧
      "signOrders" ∉ tinyCtx.s.commits ∧
      guardBase Examples.Tiny.spec Examples.Tiny.program Examples.Tiny.facts Examples.Tiny.user
        { tinyCtx.s with screen := "sign" } "signOrders" = true := by
  exact T10_commit_enabled { tinyCtx with viewCache := ⟨_, rfl⟩, s := { tinyCtx.s with screen := "sign" } }
    { id := "signButton", kind := .button (.commit "signOrders"), label := "Sign", hotkey? := some "Ctrl+Enter", tag := "sign" }
    "signOrders" (by decide) (by decide) (by decide) rfl

#print axioms T10_commit_enabled
end Ehr.Render
