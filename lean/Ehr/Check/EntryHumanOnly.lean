import Ehr.Check.EntryCases

namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. The independent probe catalog. -/
def humanElements : List ElementId := ["patientIdReentry", "wristbandScan", "medScan",
  "highAlertCosign", "consentVerified", "painScore", "painReassessment", "curesExemptionReason",
  "naloxoneOffer", "naloxoneEducation", "priorAuthRequest"]

/-- New specification for owner review. Clinical facts and sampled injection value
of the human-only probe. -/
def probeInput (sp : Spec) (e : ElementId) : Facts × Value × String := Id.run do
  let cm := if ["medScan","wristbandScan","highAlertCosign","painScore","painReassessment"].contains e
    then "administerMed" else "signOrders"
  let f := if e == "consentVerified" then { facts cm with encounterKind? := some "preop" } else facts cm
  let v := sample sp cm "metformin" e
  let raw := match v with
    | .text s | .code s | .user s => s
    | .flag b => toString b
    | _ => "undefined"
  return (f,v,raw)

/-- New specification for owner review. Inject exactly at the suite's first
matching screen and first matching field, preserving its tab and parent. -/
def inject (p : Program) (e raw : String) (macroAttack : Bool) : Option (Program × String) := do
  let isField := fun (c : Component) => (fieldOf? c.kind).any (·.1 == e)
  let sc ← p.screens.find? fun sc => sc.components.any isField
  let c ← sc.components.find? isField
  let (_,slot,_) ← fieldOf? c.kind
  let id := c.id ++ ".heldoutProbe"
  let label := "Held-out runtime probe"
  let probe : Component := { id, kind := .macro id, label, tab := c.tab, parent? := c.parent?, tag := "heldout-probe" }
  let update := if macroAttack then sc.components ++ [probe] else
    sc.components.map fun x => if x.id == c.id then { x with kind := .field e slot (.default raw) } else x
  let macros := if macroAttack then p.macros ++ [⟨id,label,[.setValue c.id raw]⟩] else p.macros
  let screens := p.screens.map fun s => if s.id == sc.id then { s with components := update } else s
  return ({ p with screens, macros }, id)

/-- New specification for owner review. From fresh init on the modified program,
observe the shown field, exact attempted macro (when injected), human refusal,
absence of capture on every slot, then successful confirmed human input. -/
def humanCase (i : Scene) (e id : String) (v : Value) (macroAttack : Bool) : Trial Unit := do
  openChart i.toInitInput
  let _ ← field i e
  if macroAttack then
    require ((i.program.screens.flatMap (·.components)).countP (·.tag == "heldout-probe") == 1)
      "Keep the injected human-only control identifiable by its probe tag"
    let c ← visit i ("injected macro for " ++ e) fun _ c =>
      c.tag == "heldout-probe" && c.id == id && c.kind == .macro id
    let r ← act i.toInitInput (.click c.id)
    require (match r with
      | .blocked reason => reason == macroStopReason 0 (.blocked ("human only: " ++ e))
      | _ => false) s!"Refuse the macro's attempted human-only entry of {e}; observed {repr r}"
  require (!(← current).captured.any (·.element == e)) s!"Automation captured {e}"
  enter i e v

end Ehr.Check.EntryWitness
