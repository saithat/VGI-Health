import Ehr.Commit.Check

/-! Native-only entry point. No server credentials or network effects. -/

namespace Ehr.Cli.Commit

/-- The CLI uses the same pure operation covered by acceptance soundness. -/
def run (request : Ehr.Commit.Request) : Ehr.Commit.Decision :=
  Ehr.Commit.check request

end Ehr.Cli.Commit
