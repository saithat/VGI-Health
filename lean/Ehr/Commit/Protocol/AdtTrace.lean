import Ehr.Commit.Protocol.AdtTraceCore

def main (args : List String) : IO Unit :=
  Ehr.Commit.Protocol.AdtModel.traceCommand args
