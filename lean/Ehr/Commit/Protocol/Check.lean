import Ehr.Commit.Protocol.Model
import Ehr.Commit.Protocol.Cache
import Lean

namespace Ehr.Commit.Protocol

private def ops : List Op := [.request, .lock, .read, .guard, .stage, .commit,
  .unlock, .respond, .crash, .retry, .timeout]

/-- Breadth-first exploration retaining shortest counterexamples. A budget hit
fails closed rather than reporting a completed model check. -/
def explore (label : String) (requests : List Request) (budget := 100000) : IO Unit := do
  let initial : Machine := { txs := requests.map fun r => { request := r } }
  let mut seen : Std.HashSet String := {reprStr initial}
  let mut queue : Array (Machine × List (Nat × Op)) := #[(initial, [])]
  let mut cursor := 0
  let mut edges := 0
  let mut depth := 0
  while cursor < queue.size do
    let (s, path) := (queue[cursor]?).getD (initial, [])
    cursor := cursor + 1
    depth := max depth path.length
    for i in List.range requests.length do
      for op in ops do
        if let some next := advance s i op then
          edges := edges + 1
          unless safe next.durable do
            throw <| IO.userError s!"COUNTEREXAMPLE {label}: {reprStr ((i, op) :: path).reverse}\n{reprStr next}"
          let key := reprStr next
          unless seen.contains key do
            if queue.size >= budget then
              throw <| IO.userError s!"INCOMPLETE {label}: state budget {budget}"
            seen := seen.insert key
            queue := queue.push (next, (i, op) :: path)
  IO.println s!"{label}: exhausted {seen.size} states, {edges} transitions, maximum shortest-path depth {depth}; no counterexample"

private def req (id patient : String) (action : Option Multi.Action := none) : Request :=
  let keys := if action.isSome then ["shared", patient] else [patient]
  { id, payload := id, patient, keys, expected := keys.map (·, 0), action }

private structure CacheWorld where
  version : Nat := 0
  session : Cache.Session Nat Nat := { base := 0 }
  deriving Repr

private def cacheCheck : IO Unit := do
  let initial : CacheWorld := {}
  let replayInit := fun n => n * 100
  let replayStep := fun n e => n * 2 + e
  let mut queue := #[initial]
  let mut seen : Std.HashSet String := {reprStr initial}
  let mut cursor := 0
  while cursor < queue.size do
    let w := (queue[cursor]?).getD initial
    cursor := cursor + 1
    let s := w.session
    let mut next : List CacheWorld := []
    if s.journal.length < 3 then
      for revision in [s.revision, s.revision + 1] do
        for event in [0, 1] do
          if let some ns := Cache.interact replayInit replayStep s w.version revision event then
            next := { w with session := ns } :: next
      if w.version < 2 && s.base == w.version then
        next := { version := w.version + 1, session := Cache.projectingCommit s (w.version + 1) 1 } :: next
    if w.version < 2 then next := { w with version := w.version + 1 } :: next
    for n in next do
      unless Cache.reconstruct replayInit replayStep n.session ==
          Cache.replay replayInit replayStep n.session.base n.session.journal do
        throw <| IO.userError s!"CACHE COUNTEREXAMPLE: {reprStr n}"
      let key := reprStr n
      unless seen.contains key do
        seen := seen.insert key
        queue := queue.push n
  IO.println s!"session cache/journal: exhausted {seen.size} states (3 events, 2 version advances); no counterexample"

private def negativeControls : IO Unit := do
  let r := req "A" "patient:A" (.some (.assignBed 1 1 9))
  let good := (publish {} r).1
  let badGuard := { r with native := false }
  let controls : List Durable := [
    { good with events := good.events ++ good.events },
    { good with projection := {} },
    { good with receipts := [] },
    { good with events := [] },
    { events := [{ request := badGuard, before := readVersions {} badGuard }],
      projection := effect {} badGuard,
      receipts := [{ id := r.id, payload := r.payload, answer := .accepted 1 }] }]
  for d in controls do
    if safe d then throw <| IO.userError "checker failed to reject an unsafe negative control"
  IO.println "negative controls: rejected duplicate, projection, missing-receipt, missing-event and guard violations"

def bounded : IO Unit := do
  negativeControls
  cacheCheck
  let a := req "A" "patient:A"
  let b := req "B" "patient:A"
  explore "same patient / stale session" [a, b]
  explore "duplicate request across replicas" [a, a]
  explore "payload conflict" [a, { a with payload := "changed" }]
  explore "bed / different patients" [req "A" "patient:A" (.some (.assignBed 1 1 9)),
    req "B" "patient:B" (.some (.assignBed 2 2 9))]
  let dose : Multi.DoseKey := { patient := 1, order := 9, occurrence := 600 }
  explore "same scheduled dose" [req "A" "patient:A" (.some (.administer 1 dose)),
    req "B" "patient:A" (.some (.administer 2 dose))]
  explore "disjoint patients" [a, req "B" "patient:B"]
  explore "stale optimistic cache / fresh refusal" [
    { a with native := false, cacheVersion := some 0, cacheNative := true }, b]
  explore "screen mismatch / rollback and corrected intent" [{ a with screenValid := false }, { a with payload := "corrected" }]
  explore "session revision mismatch" [{ a with sessionRevision := 1 }, b]
  explore "fresh successor version" [a, { b with expected := [("patient:A", 1)], sessionVersion := 1 }]
  let assign := req "assign" "patient:A" (.some (.assignBed 1 1 9))
  let release := { (req "release" "patient:A" (.some (.releaseBed 1 1 9))) with
    expected := [("shared", 1), ("patient:A", 1)], sessionVersion := 1 }
  let reuse := { (req "reuse" "patient:B" (.some (.assignBed 2 2 9))) with
    expected := [("shared", 2), ("patient:B", 0)] }
  explore "three requests / bed release and reuse" [assign, release, reuse]

end Ehr.Commit.Protocol

def main : IO Unit := Ehr.Commit.Protocol.bounded
