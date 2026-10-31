module

public import Init

public section

/-- Runtime/ABI control probe; deliberately does not claim to parse JSON. -/
@[export ehr_step]
def step (input : String) : String := input ++ " (Lean Init/WASM)"

#guard step "hello" == "hello (Lean Init/WASM)"
