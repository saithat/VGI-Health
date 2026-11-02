import Ehr.Commit.Tests

/-- Print a valid internal prototype request for piping into `ehr commit-check`.
This is demo data, not an authenticated service request. -/
def main : IO Unit := IO.println (Ehr.encodeJson Ehr.Commit.Tests.request)
