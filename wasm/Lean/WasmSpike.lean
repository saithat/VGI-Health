module

public import Lean.Data.Json
meta import Lean.Data.Json

public section

@[export ehr_step]
def step (input : String) : String :=
  match Lean.Json.parse input with
  | .error message => (Lean.Json.mkObj [("error", .str message)]).compress
  | .ok value =>
    match value.getObjValAs? Nat "counter" with
    | .error message => (Lean.Json.mkObj [("error", .str message)]).compress
    | .ok counter =>
      (Lean.Json.mkObj [("counter", Lean.toJson (counter + 1)),
        ("items", Lean.toJson [counter, counter + 1, counter + 2]),
        ("input", value)]).compress

#guard (Lean.Json.parse (step "{\"counter\":41}") >>= fun j =>
  j.getObjValAs? Nat "counter").toOption == some 42
