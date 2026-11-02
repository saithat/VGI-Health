import Ehr.Sem.Exotic
import Ehr.Render.Api
import Ehr.Sim.Policy

namespace Ehr.Sem.Exotic
open Ehr Render Sim Lean

structure ChoiceInput where
  render : RenderInput
  task : Task
  episode : Nat := 0
  deriving FromJson

/-- The existing goal policy supplies legal candidates; the decision model chooses
among them. No model output is treated as an interpreter event or clinical value. -/
def choiceOutput (input : ChoiceInput) : Json := Id.run do
  let i := input.render
  let ep := (taskEpisodes i.facts input.task)[input.episode]?.getD
    { facts := i.facts, choices := input.task.choices, orders := input.task.choices.orders, med? := none }
  let g := deriveGoals i.spec i.facts i.user input.task.workflow ep.choices ep.orders ep.med?
  let ctx : Context := ⟨i.spec, i.program, i.facts, i.user, { g with values := g.values ++ g.waivers }⟩
  let es : List Event := match i.state.popup? with
    | some p => [.ack p.1]
    | none => let as := actions ctx i.state
              if as.isEmpty then ((planNavigation ctx i.state).getD []).take 1 else as
  return Json.mkObj [("done", toJson (ctx.done i.state)), ("events", toJson es),
    ("problems", toJson g.problems)]

/-- One-string API is shared by the research renderer, native fixture and WASM. -/
@[export ehr_exotic]
def apiExotic (input : String) : String :=
  match Json.parse input with
  | .error e => errorJson e
  | .ok json =>
    match (json.getObjValAs? String "op") with
    | .error e => errorJson e
    | .ok "choices" => match fromJson? (α := ChoiceInput) json with
      | .error e => errorJson e
      | .ok i => (choiceOutput i).compress
    | .ok "canonical" => (Json.mkObj [("axis", toJson canonicalAxis),
        ("screen", toJson canonicalTimelineProgramScreen),
        ("input", toJson ({ spec := timelineProgramCtx.sp, program := timelineProgramCtx.prog, facts := timelineProgramCtx.facts, display := timelineProgramCtx.disp, user := timelineProgramCtx.user, state := timelineProgramCtx.s } : RenderInput)),
        ("commands", toJson (commands canonicalTimelineProgramScreen)),
        ("zones", toJson (zones canonicalTimelineProgramScreen))]).compress
    | .ok "axis" => match json.getObjValAs? Axis "axis" with
      | .error e => errorJson e
      | .ok a => (Json.mkObj [("accepted", toJson (admitAxis a).isSome),
          ("children", toJson (axisChildren a))]).compress
    | .ok "render" => match json.getObjValAs? RenderInput "render" with
      | .error e => errorJson e
      | .ok i =>
        let s := runRenderUi i
        (Json.mkObj [("screen", toJson s), ("commands", toJson (commands s)),
          ("zones", toJson (zones s))]).compress
    | .ok op => errorJson s!"Unknown research operation {op}"
end Ehr.Sem.Exotic
