import Ehr.Commit.MarTests
import Ehr.Sim.Policy
import Ehr.Canonical.Program

open Ehr Ehr.Sim Ehr.Commit Ehr.Commit.Mar Lean

/-- Check generated decisions through real JSON, goal derivation, outcome-event
mapping, FHIR projection and the shared reducer, retaining occurrence identity. -/
def main : IO UInt32 := do
  let line ← (← IO.getStdin).getLine
  let .ok medicines := decodeJson (List OrderChoice) line
    | IO.eprintln "invalid generated administration choices"; return 1
  let mut state : Mar.State := {}
  let mut keys : List String := []
  for m in medicines do
    let some a := m.administration? | IO.eprintln "missing typed outcome"; return 1
    unless keys.contains a.occurrence do keys := keys ++ [a.occurrence]
    let occurrence := (keys.idxOf a.occurrence)
    let i := { Mar.Tests.input state with dose := { patient := 1, order := 9, occurrence } }
    let captured := Mar.Tests.goalCaptures m
    let some event := outcomeEvent i captured | IO.eprintln "outcome lost in goal mapping"; return 1
    let reason := administrationReason m
    let expected : Mar.Event := match a.outcome with
      | .given => .administered i.dose i.actor i.request.user.id
      | .held => .held i.dose i.request.user.id reason
      | .refused => .refused i.dose i.request.user.id reason
      | .notGiven => .notGiven i.dose i.request.user.id reason
      | .delayed => .delayed i.dose i.request.user.id reason
    unless event == expected do IO.eprintln "incorrect outcome or reason"; return 1
    let next := reduce state [event]
    if a.outcome != .given then
      unless next.shared == state.shared do IO.eprintln "nonadministration consumed occurrence"; return 1
      unless Render.Fhir.field (resource i captured) "dosage" == .null do
        IO.eprintln "nonadministration projected a delivered dose"; return 1
    unless (next.shared.administrations.map Prod.fst).Nodup do
      IO.eprintln "duplicate administration"; return 1
    let eps := episodes Commit.Tests.currentFacts .W4 { administer := [m] }
    unless eps.length == (if a.notifyPrescriber then 2 else 1) do
      IO.eprintln "lost escalation documentation"; return 1
    if a.notifyPrescriber then
      let some ep := eps[1]? | IO.eprintln "missing follow-up episode"; return 1
      let goals := deriveGoals Specs.V1.specV1 Commit.Tests.currentFacts
        { id := "nurse", role := .rn } .W4 ep.choices [] ep.med?
      unless goals.values.any (fun g => g.element == "nursingAssessment" &&
          g.value? == some (.text (administrationFollowup m))) do
        IO.eprintln "escalation narrative lost"; return 1
    state := next
  -- Execute every controlled scenario through the actual canonical nursing UI.
  -- The remaining generated rows exhaustively exercise the pure boundary above.
  let tasks := (medicines.take 17).zipIdx |>.map fun (m, index) =>
    { id := s!"outcome-{index}", day := 1, persona := "P3", workflow := .W4,
      patientId := Commit.Tests.currentFacts.patientId, startMin := index * 20,
      choices := { administer := [m] } : Task }
  let persona : PersonaParams := {
    id := "P3", role := .rn, keyboardShare := 50, reviewsAllergiesEarly := true,
    scansSidebar := true, backtrackRate := 0, searchWhenBuried := true, overrideRate := 0 }
  let day := simulate Specs.V1.specV1 Canonical.canonicalV1 persona
    { day := 1, persona := "P3", load := "normal", tasks } (fun _ => Commit.Tests.currentFacts) 1
  unless day.tasks.length == tasks.length && day.tasks.all (·.completed) do
    IO.eprintln s!"canonical nursing documentation incomplete: {repr day.complaints}"; return 1
  IO.println s!"checked {medicines.length} administration decisions"
  return 0
