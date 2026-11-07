import Ehr.Commit.Protocol.AdtModel

namespace Ehr.Commit.Protocol.AdtModel

private def ops : List Op := [.request, .lock, .read, .guard, .update, .write, .stage,
  .commit, .unlock, .respond, .crash, .retry, .timeout]

/-- Exhaustive finite transaction graph, including repeated crashes/retries.
State budget exhaustion fails; paths are shortest BFS witnesses. -/
def explore (label : String) (board : Adt.State) (requests : List Request) (budget := 150000) : IO Unit := do
  let initial : Machine := { durable := initial board, txs := requests.map fun r => { request := r } }
  let mut seen : Std.HashSet String := {reprStr initial}
  let mut queue := #[(initial, ([] : List (Nat × Op)))]
  let mut cursor := 0
  let mut edges := 0
  let mut depth := 0
  while cursor < queue.size do
    let (m,path) := (queue[cursor]?).getD (initial, [])
    cursor := cursor + 1
    depth := max depth path.length
    for i in List.range requests.length do
      for op in ops do
        if let some next := advance m i op then
          edges := edges + 1
          unless safe board next.durable && lockSafe next do
            throw <| IO.userError s!"COUNTEREXAMPLE {label}: {reprStr ((i,op) :: path).reverse}\n{reprStr next}"
          let key := reprStr next
          unless seen.contains key do
            if queue.size >= budget then throw <| IO.userError s!"INCOMPLETE {label}: {budget} states"
            seen := seen.insert key
            queue := queue.push (next, (i,op) :: path)
  IO.println s!"ADT {label}: exhausted {seen.size} states, {edges} transitions, depth {depth}; no counterexample"

def board : Adt.State :=
  { patients := [{ id := "a" }, { id := "b" }],
    beds := [{ id := 1, unit := "u" }, { id := 2, unit := "u" }] }
private def req (d : Durable) (id : String) (command : Adt.Command) : Request :=
  { id, payload := id, command, expected := versions d }

private def commands : List Adt.Command :=
  ["a", "b"].flatMap (fun p => [.discharge p] ++ [1,2].flatMap (fun b =>
    [.admit p b, .assign p b, .release p b] ++ [1,2].map (Adt.Command.transfer p b))) ++
  [1,2].flatMap (fun b => [.clean b, .ready b])

/-- All reachable two-patient/two-bed reducer boards, all commands and roles.
This complements transaction graphs whose fixed IDs bound the log size. -/
private def boards : IO Unit := do
  let mut queue := #[board]
  let mut seen : Std.HashSet String := {reprStr board}
  let mut cursor := 0
  let mut edges := 0
  while cursor < queue.size do
    let s := (queue[cursor]?).getD board
    cursor := cursor + 1
    for role in [Adt.Role.bedManager, .chargeNurse, .admittingClerk] do
      for command in commands do
        if let some a := Adt.commit { state := s, versions := [], expected := [], role, command } then
          edges := edges + 1
          unless Adt.valid a.state do throw <| IO.userError s!"ADT BOARD COUNTEREXAMPLE {reprStr s} {reprStr command}"
          let key := reprStr a.state
          unless seen.contains key do
            if queue.size >= 10000 then throw <| IO.userError "INCOMPLETE board graph"
            seen := seen.insert key
            queue := queue.push a.state
  IO.println s!"ADT reducer: exhausted {seen.size} boards, {edges} accepted edges; all 3 roles / 2 patients / 2 beds"

private def controls : IO Unit := do
  let d := initial board
  let r := req d "one" (.admit "a" 1)
  let good := (publish d r).1
  let bad : List Durable := [
    { good with board := board },
    { good with receipts := [] },
    { good with events := good.events ++ good.events },
    { good with events := good.events.map fun e => { e with writes := ["patient:a"] } },
    { good with board := { good.board with patients := [{id := "a", admitted := true, bed := some 2}, {id := "b"}] } }]
  for d in bad do
    if safe board d then throw <| IO.userError "ADT negative control passed"
  -- Opposite stream-lock orders can form a wait cycle; sorted service order cannot.
  let cycle : Machine := { durable := d, txs := [
    { request := r, phase := .locked, held := ["bed:1"] },
    { request := req d "two" (.admit "b" 2), phase := .locked, held := ["bed:2"] }] }
  unless !freeKey cycle 0 "bed:2" && !freeKey cycle 1 "bed:1" do
    throw <| IO.userError "lock-cycle negative control failed"
  if noCycle 2 (fun i j => i != j && !freeKey cycle i (if i == 0 then "bed:2" else "bed:1")) then throw <| IO.userError "lock cycle went undetected"
  IO.println "ADT controls: rejected projection, missing receipt, duplicate effect, partial stream set and double placement; detected reversed-lock cycle"

def bounded : IO Unit := do
  controls
  boards
  let d := initial board
  let a := req d "A" (.admit "a" 1)
  explore "admission race" board [a, req d "B" (.admit "b" 1)]
  explore "duplicate replicas" board [a,a]
  explore "changed payload" board [a,{ a with payload := "changed", command := .admit "a" 2 }]
  explore "role refusal" board [{ a with role := .admittingClerk, command := .discharge "a" },a]
  let admitted := (publish d a).1
  let base := admitted.board
  let d := initial base
  let transfer := req d "T" (.transfer "a" 1 2)
  explore "transfer vs discharge" base [transfer, req d "D" (.discharge "a")]
  explore "transfer vs competing admission" base [transfer, req d "B" (.admit "b" 2)]
  explore "release vs transfer" base [req d "R" (.release "a" 1), transfer]
  let release := req d "R" (.release "a" 1)
  let released := (publish d release).1
  explore "release then assign / successor vector" base [release, req released "S" (.assign "a" 2)]
  let both := (Adt.apply base (.admit "b" 2))
  let d := initial both
  explore "occupied-target opposite transfers" both [req d "X" (.transfer "a" 1 2), req d "Y" (.transfer "b" 2 1)]
  let dirty := Adt.apply base (.discharge "a")
  let d := initial dirty
  let clean := req d "C" (.clean 1)
  explore "clean then ready / successor vector" dirty [clean, req (publish d clean).1 "Y" (.ready 1)]
  explore "dirty bed admission refusal" dirty [req d "A" (.admit "b" 1), req d "C" (.clean 1)]
  let d := initial board
  let first := req d "A" (.admit "a" 1)
  explore "three attempts / successor discharge" board [first, req d "B" (.admit "b" 2),
    req (publish d first).1 "D" (.discharge "a")]

end Ehr.Commit.Protocol.AdtModel

def main : IO Unit := Ehr.Commit.Protocol.AdtModel.bounded
