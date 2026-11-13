import Ehr.Commit.Check

/-! Native-only entry point. No server credentials or network effects. -/

namespace Ehr.Cli.Commit

/-- The CLI uses the same pure operation covered by acceptance soundness. -/
def run (request : Ehr.Commit.Request) : Ehr.Commit.Decision :=
  Ehr.Commit.check request

/-- New specification for owner review: append the native timing projection to
accepted output. Legacy captures produce no new output field. -/
def output (request : Ehr.Commit.Request) : Lean.Json :=
  let decision := run request
  match decision, Ehr.Commit.prepare request with
  | .accept ps state, .ok current =>
    let times := EntryTimes.records request.spec current.facts request.state
    Lean.Json.mkObj [("accept", Lean.Json.mkObj (
      [("preconditions", Lean.toJson ps), ("state", Lean.toJson state)] ++
      if times.isEmpty then [] else [("entryTimes", Lean.toJson times)]))]
  | _, _ => Lean.toJson decision

end Ehr.Cli.Commit
