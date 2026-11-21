import Ehr.Check.EntryMedication
import Ehr.Check.EntryHumanOnly

namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. One named clinical fixture, with its
exact input program and human interaction requirements. -/
structure Case where
  name : String
  input : Scene
  task : Trial Unit

/-- New specification for owner review. Core entries and their positive continuation. -/
def coreCase (sp : Spec) (p : Program) (cm : CommitId) : Case :=
  let i := scene sp p cm (facts cm)
  ⟨cm,i,entryScenario i cm⟩

/-- New specification for owner review. Weight and multi-line variants have
their own record, applicability and post-refusal continuation. -/
def medicationCases (sp : Spec) (p : Program) : List Case := Id.run do
  let i := scene sp p "signOrders" (facts "signOrders")
  let (stale, task) := staleCase sp p
  let linked := p.screens.any fun sc => sc.components.any fun c => match c.kind with
    | .field "dosingWeight" _ (.linked "weight") => true | _ => false
  return [⟨"weight.lb",i,pounds i⟩, ⟨"weight.stale-record",stale,task⟩,
      ⟨"scheduleII",i,medicationLines i false⟩] ++
    (if linked then [⟨"weight.linked-source-refresh",i,refreshWeight i⟩] else []) ++
    (if sp.version == "v3" then [⟨"v3.antibiotic",i,medicationLines i true⟩] else [])

/-- New specification for owner review. Probe only a declared field present on
the candidate. Each case starts on a fresh copy with exactly one injection. -/
def humanCases (sp : Spec) (p : Program) : List Case :=
  humanElements.flatMap fun e => Id.run do
    if (sp.element? e).isNone then return []
    let (f,v,raw) := probeInput sp e
    return [false,true].filterMap fun attack => do
      let (modified,id) ← inject p e raw attack
      let i := scene sp modified "" f
      return ⟨"human-only." ++ e ++ (if attack then ".macro" else ".prefill"), i, humanCase i e id v attack⟩

/-- New specification for owner review. Apply the release's persona workload
independently of controls remaining on the candidate. -/
def casesFor (sp : Spec) (can p : Program) : List Case :=
  let cms := workload sp can p
  cms.map (coreCase sp p) ++ (if cms.contains "signOrders" then medicationCases sp p else []) ++
    (if cms.isEmpty then [] else humanCases sp p)

/-- New specification for owner review. Stop at the first unsuccessful
witness and name the workflow, field or action that needs attention. -/
def entryFailure (sp : Spec) (can p : Program) : Option String :=
  (casesFor sp can p).findSome? fun c =>
    (diagnose c.input c.task).map fun why => s!"{c.name}: {why}"

end Ehr.Check.EntryWitness
