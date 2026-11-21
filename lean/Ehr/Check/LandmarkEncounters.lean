import Ehr.Check.AlertEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props

/-- New specification for owner review. Possible forward moves from this
screen, including intermediate destinations a goto-only macro pushes onto
Back history. Ignore visibility when deciding which screens need inspection. -/
def tourTargets (p : Program) (sc : Screen) : List ScreenId :=
  sc.components.flatMap fun c => match c.kind with
    | .button (.goto dest) => [dest]
    | .«macro» id => Id.run do
      let some m := p.macro? id | return []
      let dests := m.steps.filterMap fun step => match step with | .goto z => some z | _ => none
      return if dests.length == m.steps.length then dests else []
    | _ => []

/-- New specification for owner review. Certify an overestimate of the tour:
it contains the opening/history seeds and is closed under all forward moves.
If that validation fails, inspect every declared screen. -/
def closedTour (p : Program) (initial proposed : List ScreenId) : List Screen :=
  if initial.all proposed.contains && p.screens.all (fun sc =>
      !proposed.contains sc.id || (tourTargets p sc).all proposed.contains) then
    p.screens.filter (fun sc => proposed.contains sc.id)
  else p.screens

/-- New specification for owner review. Compute candidates from chart opening
and Back history. A disconnected cycle has no path from either seed. -/
def tourScreens (i : InitInput) : List Screen :=
  let p := i.program
  let initial := (beginEncounter i).toOption.toList.flatMap fun s => s.screen :: s.history
  let edges := p.screens.map fun sc => (sc.id, (tourTargets p sc).map fun dest => ("", dest))
  let proposed := initial.flatMap fun seed => (bfs p (fun z => (edges.lookup z).getD []) seed).map (·.1)
  closedTour p initial proposed

/-- New specification for owner review. Inspect the first banner on every
candidate screen in program order. Each included screen needs a real route. -/
def landmarkCases (sp : Spec) (p : Program) (nursing : Bool) : List ClinicalCase :=
  [false, true].map fun clean =>
    let visit := fun (sc : Screen) =>
      let first := sc.components.find? (·.kind == .banner)
      (⟨"inspect patient banner on " ++ sc.id, fun c => c.kind == .banner && first.any (·.id == c.id),
        fun i s _ => do
          unless s.screen == sc.id do throw s!"Reach {sc.id} before inspecting its banner"
          let items := (runView ⟨sp, p, i.facts, i.user, s⟩).items
          if clean then
            unless s.popup?.isNone && !items.any (fun it =>
              it.shown && (alertOf? it.comp.kind).isSome && !it.firing) do
              throw s!"Unexpected popup or nonfiring alert on {sc.id}"
          else unless (items.filter fun it => it.shown && it.comp.kind == .banner).length == 1 do
            throw s!"Show exactly one patient banner on {sc.id}"
          return s, fun _ _ => true⟩ : Checkpoint)
    let f := if nursing then {clinicalFacts with medToGive? := some (if clean then "metformin" else "morphine")}
             else clinicalFacts
    let i := encounterInput sp p f
    ⟨if clean then "alerts.no-false-alarms" else "design.banner", i, (tourScreens i).map visit, false⟩

end Ehr.Check.ReviewTrace
