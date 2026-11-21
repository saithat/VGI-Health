import Ehr.Check.RuleSound

namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. Every applicable clinical case has a witness from native initialization.
The task relation specifies the observations and state transitions; it has no
search-success premise. In a human-only case the input is the injected copy. -/
theorem accepted_entryTraces {sp prev can p} (h : check sp prev can p = .ok)
    {c} (hc : c ∈ casesFor sp can p) : Realized c.input c.task := by
  let r : Rule := {
    property := "entryTraces", passes := (entryFailure sp can p).isNone
    explain := fun _ => (entryFailure sp can p).bind (plain "entryTraces") }
  have pass := (check_ok_iff sp prev can p).mp h r (by
    repeat' first | exact List.Mem.head _ | apply List.Mem.tail)
  have clean : entryFailure sp can p = none := Option.isNone_iff_eq_none.mp pass
  have ok := List.findSome?_eq_none_iff.mp clean c hc
  apply diagnose_sound
  simpa using ok

/-- New specification for owner review. Each required commit has its entire ordered family of actionable omissions,
human entries, linked captures, acknowledgments and successful signature. -/
theorem accepted_actionableEntries {sp prev can p cm} (h : check sp prev can p = .ok)
    (required : cm ∈ workload sp can p) :
    let i := scene sp p cm (facts cm)
    Realized i (entryScenario i cm) := by
  apply accepted_entryTraces h (c := coreCase sp p cm)
  apply List.mem_append_left
  apply List.mem_append_left
  exact List.mem_map.mpr ⟨cm,required,rfl⟩

/-- New specification for owner review. Either injection at the first declared
field really produces a program; a present field cannot silently drop out of
the probe catalog. -/
theorem inject_present {p : Program} {e : ElementId} (raw : String) (attack : Bool)
    (site : p.screens.any fun sc => sc.components.any fun c => (fieldOf? c.kind).any (·.1 == e)) :
    ∃ modified id, inject p e raw attack = some (modified, id) := by
  let pred := fun (c : Component) => (fieldOf? c.kind).any (·.1 == e)
  obtain ⟨sc, hs⟩ := Option.isSome_iff_exists.mp
    (List.find?_isSome.mpr (List.any_eq_true.mp site))
  change p.screens.find? (fun sc => sc.components.any pred) = some sc at hs
  have fields : sc.components.any pred := List.find?_some (p := fun sc : Screen => sc.components.any pred) hs
  obtain ⟨c, hc⟩ := Option.isSome_iff_exists.mp
    (List.find?_isSome.mpr (List.any_eq_true.mp fields))
  have atField : pred c := List.find?_some hc
  cases hf : fieldOf? c.kind with
  | none => simp [pred, hf] at atField
  | some f =>
    obtain ⟨_, _, _⟩ := f
    simp [inject, show (fun c : Component => (fieldOf? c.kind).any (·.1 == e)) = pred from rfl,
      hs, hc, hf]

/-- New specification for owner review. A surfaced, declared human-only entry
has a complete trace on the injected layout, for either attack. -/
theorem accepted_humanProbe {sp prev can p e} (h : check sp prev can p = .ok)
    (scope : (workload sp can p).isEmpty = false) (he : e ∈ humanElements)
    (declared : (sp.element? e).isNone = false)
    (site : p.screens.any fun sc => sc.components.any fun c => (fieldOf? c.kind).any (·.1 == e))
    (attack : Bool) :
    let (f,v,raw) := probeInput sp e
    ∃ modified id, inject p e raw attack = some (modified,id) ∧
      let i := scene sp modified "" f
      Realized i (humanCase i e id v attack) := by
  generalize hi : probeInput sp e = inp
  obtain ⟨f,v,raw⟩ := inp
  obtain ⟨modified,id,hinj⟩ := inject_present raw attack site
  refine ⟨modified,id,hinj,?_⟩
  let i := scene sp modified "" f
  let c : Case := ⟨"human-only." ++ e ++ (if attack then ".macro" else ".prefill"), i,
    humanCase i e id v attack⟩
  apply accepted_entryTraces h (c := c)
  apply List.mem_append_right
  simp only [scope, Bool.false_eq_true, ↓reduceIte]
  apply List.mem_flatMap.mpr
  refine ⟨e, he, ?_⟩
  simp only [declared, Bool.false_eq_true, ↓reduceIte, hi, Id.run, pure, List.mem_filterMap]
  exact ⟨attack, by cases attack <;> simp, by simp [hinj, c, i]⟩

/-- New specification for owner review. A required prescribing workflow covers
each applicable medication fixture with its own refusal and repair trace. -/
theorem accepted_medicationCases {sp prev can p} (h : check sp prev can p = .ok)
    (orders : "signOrders" ∈ workload sp can p) {c} (hc : c ∈ medicationCases sp p) :
    Realized c.input c.task := by
  apply accepted_entryTraces h
  apply List.mem_append_left
  apply List.mem_append_right
  simpa [List.contains_iff_mem, orders] using hc

#print axioms inject_present
#print axioms accepted_humanProbe
#print axioms accepted_medicationCases
#print axioms accepted_entryTraces
#print axioms accepted_actionableEntries
end Ehr.Check.EntryWitness
