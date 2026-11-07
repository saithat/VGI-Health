import Ehr.Commit.Adt
import Ehr.Commit.Protocol.Model

/-! NEW owner-review ADT protocol specifications. The native administrative
reducer is reused without changing its policy. Baselines are consistent imported
boards. A COMMIT atomically publishes every changed stream and its request
receipt (Postgres assumption); provisional writes are private. Swap/cancel are
not commands in the implemented API. No physical placement or fairness claim. -/
namespace Ehr.Commit.Protocol.AdtModel
open Ehr.Commit

structure Request where
  id : String -- tenant + actor + request ID
  payload : String
  expected : List Adt.Version
  role : Adt.Role := .bedManager
  command : Adt.Command
  eligible : Bool := true -- clinical endpoint's fresh non-ADT checks; admin always true
  versionValid : Bool := true -- clinical session/base/revision checks; admin always true
  deriving DecidableEq, Repr, Lean.FromJson

inductive Value where
  | patient (p : Adt.Patient) | bed (b : Adt.Bed)
  deriving DecidableEq, Repr

def keys (s : Adt.State) : List String :=
  ((s.patients.map (fun p => "patient:" ++ p.id)) ++
    (s.beds.map (fun b => "bed:" ++ toString b.id))).mergeSort (· ≤ ·)

def value (s : Adt.State) (key : String) : Option Value :=
  ((s.patients.map (fun p => ("patient:" ++ p.id, Value.patient p))) ++
    (s.beds.map (fun b => ("bed:" ++ toString b.id, Value.bed b)))).lookup key

def changed (before after : Adt.State) : List String :=
  (keys before).filter fun k => value before k != value after k

structure Event where
  request : Request
  before : List Adt.Version
  writes : List String
  deriving DecidableEq, Repr
structure Durable where
  board : Adt.State
  events : List Event := [] -- newest first; one event per multi-stream transaction
  receipts : List Receipt := []
  deriving DecidableEq, Repr

def initial (s : Adt.State) : Durable := { board := s }
def version (d : Durable) (k : String) : Nat :=
  (d.events.filter fun e => k ∈ e.writes).length
def versions (d : Durable) : List Adt.Version :=
  (keys d.board).map fun key => { key, version := version d key }
def input (d : Durable) (r : Request) : Adt.Input :=
  { state := d.board, versions := versions d, expected := r.expected, role := r.role, command := r.command }
def receipt (d : Durable) (r : Request) : Option Receipt :=
  d.receipts.find? (·.id == r.id)

def decide (d : Durable) (r : Request) : Answer :=
  if !r.versionValid || versions d != r.expected then .conflict
  else if !r.eligible then .refused
  else match Adt.commit (input d r) with
    | none => .refused
    | some a => if (changed d.board a.state).isEmpty then .refused
      else .accepted (d.events.length + 1)

def publish (d : Durable) (r : Request) : Durable × Answer :=
  match receipt d r with
  | some a => (d, if a.payload == r.payload then a.answer else .payloadConflict)
  | none =>
    let answer := decide d r
    let receipts := { id := r.id, payload := r.payload, answer } :: d.receipts
    match answer with
    | .accepted _ =>
      let next := Adt.apply d.board r.command
      ({ board := next
         events := { request := r, before := versions d, writes := changed d.board next } :: d.events
         receipts }, answer)
    | _ => ({ d with receipts }, answer)

def foldLog (baseline : Adt.State) (events : List Event) : Adt.State :=
  events.foldr (fun e s => Adt.apply s e.request.command) baseline

structure Tx where
  request : Request
  phase : Phase := .start
  held : List String := []
  observed : List Adt.Version := []
  answer : Option Answer := none
  staged : List String := [] -- private stream event INSERTs
  updated : Option String := none -- private UPDATE awaiting its event INSERT
  deriving DecidableEq, Repr
structure Machine where
  durable : Durable
  txs : List Tx := []
  deriving DecidableEq, Repr
inductive Op where
  | request | lock | read | guard | update | write | stage | commit | unlock | respond | crash | retry | timeout
  deriving DecidableEq, Repr

def ownsRequest (t : Tx) : Bool :=
  ![Phase.start, .aborted, .released, .done].contains t.phase

def freeRequest (m : Machine) (i : Nat) (id : String) : Bool :=
  !(m.txs.zipIdx).any fun (t,j) => j != i && ownsRequest t && t.request.id == id

def freeKey (m : Machine) (i : Nat) (k : String) : Bool :=
  !(m.txs.zipIdx).any fun (t,j) => j != i && k ∈ t.held

def writeSet (d : Durable) (t : Tx) : List String :=
  match t.answer with
  | some (.accepted _) => changed d.board (Adt.apply d.board t.request.command)
  | _ => []

/-- Request lock precedes the complete sorted board read set. Reads follow full
acquisition; private writes are staged one stream at a time. Crash/retry is
available at every phase, including between stream writes and after COMMIT. -/
def advance (m : Machine) (i : Nat) (op : Op) : Option Machine := do
  let t ← m.txs[i]?
  let put := fun (t : Tx) (d : Durable) => some { durable := d, txs := m.txs.set i t }
  match op with
  | .request =>
    if t.phase != .start || !freeRequest m i t.request.id then none
    else put { t with phase := .requestLocked } m.durable
  | .lock =>
    if t.phase != .requestLocked && t.phase != .locked then none else
    if (receipt m.durable t.request).isSome then none else
    match ((keys m.durable.board).drop t.held.length).head? with
    | none => none
    | some k => if !freeKey m i k then none else
      put { t with phase := .locked, held := t.held ++ [k] } m.durable
  | .read =>
    if t.phase != .locked || t.held != keys m.durable.board then none else
    put { t with phase := .read, observed := versions m.durable } m.durable
  | .guard =>
    if t.phase != .read then none else
    put { t with phase := .guarded, answer := some (decide m.durable t.request) } m.durable
  | .update =>
    if t.phase != .guarded || t.updated.isSome then none else
    match (writeSet m.durable t).drop t.staged.length |>.head? with
    | none => none
    | some k => put { t with updated := some k } m.durable
  | .write =>
    if t.phase != .guarded then none else
    match t.updated with
    | none => none
    | some k =>
      if ((writeSet m.durable t).drop t.staged.length).head? != some k then none else
      put { t with staged := t.staged ++ [k], updated := none } m.durable
  | .stage =>
    if t.phase == .requestLocked && (receipt m.durable t.request).isSome then
      put { t with phase := .staged } m.durable
    else if t.phase != .guarded || t.staged != writeSet m.durable t || t.updated.isSome then none else
      put { t with phase := .staged } m.durable
  | .commit =>
    if t.phase != .staged then none else
    if (receipt m.durable t.request).isNone &&
        (t.observed != versions m.durable || t.answer != some (decide m.durable t.request) ||
          t.staged != writeSet m.durable t) then none else
    let (d,a) := publish m.durable t.request
    put { t with phase := .committed, held := [], answer := some a } d
  | .unlock =>
    if t.phase != .committed then none else put { t with phase := .released } m.durable
  | .respond =>
    if t.phase != .released then none else put { t with phase := .done } m.durable
  | .crash =>
    if t.phase == .aborted then none else
    put { t with phase := .aborted, held := [], staged := [], updated := none, answer := none } m.durable
  | .retry =>
    if t.phase != .done && t.phase != .aborted then none else
    put { request := t.request } m.durable
  | .timeout => some m

/-- Resource wait graph, including duplicate request reservations. Completed
holders can release; an unfinished terminal action is not a lock wait. -/
def waitsFor (m : Machine) (i j : Nat) : Bool := Id.run do
  let some a := m.txs[i]? | return false
  let some b := m.txs[j]? | return false
  if i == j then return false
  if a.phase == .start then
    return ownsRequest b && a.request.id == b.request.id
  if a.phase != .requestLocked && a.phase != .locked then return false
  if (receipt m.durable a.request).isSome then return false
  return (((keys m.durable.board).drop a.held.length).head?).any (fun k => k ∈ b.held)

def noCycle (count : Nat) (edge : Nat → Nat → Bool) : Bool := Id.run do
  let indices := List.range count
  let mut edges := indices.flatMap fun i => indices.filterMap fun j =>
    if edge i j then some (i,j) else none
  for _ in indices do
    edges := (edges ++ edges.flatMap (fun (i,j) => edges.filterMap fun (k,l) =>
      if j == k then some (i,l) else none)).eraseDups
  return !edges.any (fun (i,j) => i == j)

def noLockCycle (m : Machine) : Bool := noCycle m.txs.length (waitsFor m)

def lockSafe (m : Machine) : Bool :=
  m.txs.all (fun t => t.held == (keys m.durable.board).take t.held.length) &&
  (m.txs.zipIdx).all (fun (a,i) => (m.txs.zipIdx).all fun (b,j) =>
    i == j || a.held.all (fun k => k ∉ b.held)) && noLockCycle m

/-- Executable safety oracle: semantic projection fold, exact changed-stream
version history, two-sided placement consistency, and request/effect bijection. -/
def historySafe (baseline : Adt.State) : List Event → Bool
  | [] => true
  | e :: es =>
    let prior : Durable := { board := foldLog baseline es, events := es }
    e.before == versions prior && decide prior e.request == .accepted (es.length + 1) &&
    e.writes == changed prior.board (Adt.apply prior.board e.request.command) && historySafe baseline es

def safe (baseline : Adt.State) (d : Durable) : Bool :=
  Adt.valid d.board && d.board == foldLog baseline d.events && historySafe baseline d.events &&
  (d.events.map (·.request.id)).eraseDups.length == d.events.length &&
  (d.receipts.map Receipt.id).eraseDups.length == d.receipts.length &&
  d.events.all (fun e => d.receipts.any fun a => a.id == e.request.id && a.payload == e.request.payload &&
    match a.answer with | .accepted _ => true | _ => false) &&
  d.receipts.all (fun a => match a.answer with
    | .accepted _ => d.events.any (fun e => e.request.id == a.id && e.request.payload == a.payload)
    | _ => true)

end Ehr.Commit.Protocol.AdtModel
