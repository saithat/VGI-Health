import Ehr.Check.EntryCases
import Ehr.Render.Fhir

namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. Reuse the same ordered, active-slot
steps with a different drug, identity or a selected subset of fields. -/
def supplyFields (i : Scene) (drug : String) (es : List ElementId) : Trial Unit := do
  for e in es do
    if e == "patientIdReentry" then enter i e (.text (identityText i.facts.identity))
    else supply i "signOrders" drug e false

/-- New specification for owner review. An invalid lb entry blocks signing and
correcting its kg source requires re-confirmation before signature. -/
def pounds (i : Scene) : Trial Unit := do
  openChart i.toInitInput
  supplyFields i "metformin" (fields "signOrders")
  enter i "weight" (.qty 1540 .lb)
  refusal i "signOrders" "weight"
  enter i "weight" (.qty 700 .kg)
  let s ← current
  require (!(capturedAt? s "dosingWeight" s.currentSlot).any (·.confirmed))
    "Invalidate the old dosing-weight confirmation after correcting weight"
  enter i "dosingWeight" (.qty 700 .kg)
  finish i "signOrders"

/-- New specification for owner review. A previously confirmed 70 kg linked
copy is revisited after a 20 kg correction; a mismatch cannot sign, and the
corrected values can be signed in that episode. -/
def refreshWeight (i : Scene) : Trial Unit := do
  openChart i.toInitInput
  supplyFields i "metformin" ["visitDiagnosis", "patientIdReentry", "weight"]
  let old ← visit i "dosing weight linked to weight" fun s c => match c.kind with
    | .field "dosingWeight" slot (.linked "weight") => resolveSlot s slot == s.currentSlot
    | _ => false
  let s ← current
  if (capturedAt? s "dosingWeight" s.currentSlot).any (!·.confirmed) then
    applyOk i.toInitInput (.confirm old.id)
  let t ← current
  require ((capturedAt? t "dosingWeight" t.currentSlot).any fun x =>
    x.confirmed && x.value == .qty 700 .kg && x.provenance? == some "linked:weight")
    "Establish the confirmed 70 kg copy before correction"
  enter i "weight" (.qty 200 .kg)
  let c ← field i "dosingWeight"
  let t ← current
  if (capturedAt? t "dosingWeight" t.currentSlot).any (!·.confirmed) then
    let _ ← act i.toInitInput (.confirm c.id)
    pure ()
  supplyFields i "metformin" ((fields "signOrders").filter fun e => !["weight","dosingWeight"].contains e)
  let t ← current
  if !(capturedAt? t "dosingWeight" t.currentSlot).any (·.value == .qty 200 .kg) then
    let sign ← button i "signOrders"
    let _ ← act i.toInitInput (.click sign.id)
    require (!(← current).commits.contains "signOrders") "A stale linked weight must block signing"
    enter i "dosingWeight" (.qty 200 .kg)
  finish i "signOrders"

/-- New specification for owner review. Each of two Schedule II lines requires
zero refills; each of two antibiotic lines requires its own coded indication.
The first line is complete and stays intact across second-line refusal and repair. -/
def medicationLines (i : Scene) (antibiotic : Bool) : Trial Unit := do
  openChart i.toInitInput
  let cm := "signOrders"
  let drug := if antibiotic then "amoxicillin" else "oxycodone"
  let e := if antibiotic then "abxIndication" else "refills"
  supplyFields i drug (fields cm)
  if antibiotic then
    fork (refusal i cm e)
    enter i e (.code "respiratory-infection")
    fork (finish i cm)
  else fork do
    enter i e (.qty 30 .none)
    refusal i cm e
    enter i e (.qty 0 .none)
    finish i cm
  let before ← current
  let next ← visit i "add medication line" fun _ c => c.kind == .button .newOrderLine
  let atNext ← current
  require ((i.program.compsOf atNext.screen).any fun c => (fieldOf? c.kind).any (·.1 == "drug"))
    "Place the add-line action on a medication composer"
  applyOk i.toInitInput (.click next.id)
  require ((← current).currentSlot == before.currentSlot + 1) "Advance to the next medication slot"
  supplyFields i drug ((fields cm).dropWhile (· != "drug"))
  if !antibiotic then enter i e (.qty 30 .none)
  let t ← current
  require ((capturedAt? t e before.currentSlot).any fun x => x.confirmed &&
    x.value == sample i.spec cm drug e) s!"Preserve the first line's confirmed {e}"
  refusal i cm e
  enter i e (if antibiotic then .code "skin-infection" else .qty 0 .none)
  finish i cm

/-- New specification for owner review. The exact one-patient, one-observation
FHIR bundle used by weight.stale-record, including its measurement date. -/
def weightInput (day : String) : Render.Fhir.FactsInput :=
  { context := { today := "2026-11-02", now := 600 }
    bundle := json% { resourceType : "Bundle", type : "collection", entry : [
      { resource : { resourceType : "Patient", id : "heldout-A",
        name : [{ given : ["Heldout"], family : "heldout-A" }], gender : "female", birthDate : "1984-01-02",
        identifier : [{ type : { coding : [{ code : "MR" }] }, value : "heldout-A" }] } },
      { resource : { resourceType : "Observation", id : "heldout-A-weight", status : "final",
        subject : { reference : "Patient/heldout-A" },
        code : { coding : [{ system : "http://loinc.org", code : "29463-7" }] },
        effectiveDateTime : $(day ++ "T09:00:00Z"), valueQuantity : { value : 70, unit : "kg", code : "kg" } } }
    ] } }

/-- New specification for owner review. Use the native FHIR projections for
both dates; complete the episode on the *stale* chart after human entry. -/
def staleCase (sp : Spec) (p : Program) : Scene × Trial Unit := Id.run do
  let cm := "signOrders"
  let old := Render.Fhir.runFacts (weightInput "2026-11-01")
  let fresh := Render.Fhir.runFacts (weightInput "2026-11-02")
  let i := scene sp p cm ((old.toOption.map (·.facts)).getD default)
  return (i, do
    require (old.toOption.any fun o => o.facts.weightToday?.isNone) "Exclude yesterday's FHIR weight"
    openChart i.toInitInput
    let _ ← field i "weight"
    require (!(← current).captured.any (·.element == "weight")) "Do not prefill yesterday's weight"
    require (fresh.toOption.any fun o => o.facts.weightToday? == some (700,.kg)) "Project today's 70 kg observation"
    supplyFields i "metformin" (fields cm)
    finish i cm)

end Ehr.Check.EntryWitness
