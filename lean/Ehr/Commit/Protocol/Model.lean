import Ehr.Multi.Proofs

/-!
NEW specifications for owner review. This is a host-protocol abstraction, not a
proof of TypeScript, SQL, JSON decoding, or the native guard implementation.

Postgres assumption: a sole online writer, READ COMMITTED primary reads after
row-lock acquisition, unique request/stream-version keys, transaction-scoped
exclusive locks, and atomic durable COMMIT of all events, projections, and the
request outcome. Failed transactions publish nothing; loss of a COMMIT reply
may leave either durable outcome. No fairness or eventual-response assumption.
Initial imports/provisioning are represented by version-zero empty streams.

A request key encodes (tenant, authenticated actor, request ID); payload binds
exact intent. `keys` includes the patient, dose/closed-board, and session read
set. Native semantics are abstracted by `native` (the fresh locked guard result)
and the existing proved Multi reducer. Caches are advisory: final authority
requires fresh native screen verification before the guard, then uses `native`; equivalence of actual cached reconstruction to fresh
replay remains a separate implementation obligation.
-/
namespace Ehr.Commit.Protocol

structure Request where
  id : String
  payload : String
  patient : String
  keys : List String
  expected : List (String × Nat)
  sessionVersion : Nat := 0
  revision : Nat := 0
  sessionRevision : Nat := 0
  screenValid : Bool := true -- fresh native comparison; mismatch throws and rolls back
  native : Bool := true
  action : Option Multi.Action := none
  cacheVersion : Option Nat := none
  cacheNative : Bool := false
  projection : String := "" -- opaque clinical successor; interpretation is a refinement obligation
  deriving DecidableEq, Repr

inductive Answer where
  | accepted (serial : Nat)
  | refused
  | conflict
  | payloadConflict
  deriving DecidableEq, Repr

structure Event where
  request : Request
  before : List (String × Nat)
  deriving DecidableEq, Repr

structure Receipt where
  id : String
  payload : String
  answer : Answer
  deriving DecidableEq, Repr

structure Durable where
  events : List Event := [] -- newest first
  projection : Multi.State := {}
  patientProjection : List (String × String) := []
  receipts : List Receipt := []
  deriving DecidableEq, Repr

def effect (s : Multi.State) (r : Request) : Multi.State :=
  r.action.map (Multi.step s) |>.getD s

def foldLog (es : List Event) : Multi.State := es.foldr (fun e s => effect s e.request) {}

/-- Clinical payloads remain opaque. Event and snapshot publication must agree
on the same successor; correctness of the FHIR transformer is not assumed proved. -/
def projectPatient (prior : List (String × String)) (r : Request) : List (String × String) :=
  (r.patient, r.projection) :: prior.filter (fun entry => entry.1 != r.patient)

def foldPatientLog (es : List Event) : List (String × String) :=
  es.foldr (fun e prior => projectPatient prior e.request) []

def PatientProjectionCorrect (d : Durable) : Prop := d.patientProjection = foldPatientLog d.events

def version (d : Durable) (key : String) : Nat :=
  (d.events.filter fun e => key ∈ e.request.keys).length

def readVersions (d : Durable) (r : Request) : List (String × Nat) :=
  r.keys.map fun k => (k, version d k)

def receipt (d : Durable) (r : Request) : Option Receipt :=
  d.receipts.find? fun a => a.id == r.id

/-- The version of the clinical snapshot/session must agree with the locked read.
Native refusal and shared no-op cannot append. Caches cannot bypass this test. -/
def decide (d : Durable) (r : Request) : Answer :=
  if r.expected != readVersions d r || r.sessionVersion != version d r.patient ||
      r.revision != r.sessionRevision then .conflict
  else if !r.native then .refused
  else if r.action.isSome && effect d.projection r == d.projection then .conflict
  else .accepted (d.events.length + 1)

/-- One durable publication, under the Postgres assumption. Returned refusals
are durable too; exceptions before this step have no receipt. -/
def publish (d : Durable) (r : Request) : Durable × Answer :=
  match receipt d r with
  | some a => (d, if a.payload == r.payload then a.answer else .payloadConflict)
  | none =>
    let a := decide d r
    let receipts := { id := r.id, payload := r.payload, answer := a } :: d.receipts
    match a with
    | .accepted _ =>
      ({ events := { request := r, before := readVersions d r } :: d.events,
         projection := effect d.projection r,
         patientProjection := projectPatient d.patientProjection r, receipts }, a)
    | _ => ({ d with receipts }, a)

inductive Phase where
  | start | requestLocked | locked | read | guarded | staged | committed | released | done | aborted
  deriving DecidableEq, Repr

structure Tx where
  request : Request
  phase : Phase := .start
  held : List String := []
  observed : List (String × Nat) := []
  answer : Option Answer := none
  cacheHit : Bool := false
  deriving DecidableEq, Repr

structure Machine where
  durable : Durable := {}
  txs : List Tx := []
  deriving DecidableEq, Repr

inductive Op where
  | request | lock | read | guard | stage | commit | unlock | respond | crash | retry | timeout
  deriving DecidableEq, Repr

/-- A held request lock survives until transaction end, including replay paths. -/
def ownsRequest (t : Tx) : Bool :=
  ![Phase.start, .aborted, .released, .done].contains t.phase

def freeRequest (m : Machine) (i : Nat) (r : Request) : Bool :=
  !(m.txs.zipIdx).any fun (t, j) => j != i && ownsRequest t && t.request.id == r.id

def freeKey (m : Machine) (i : Nat) (key : String) : Bool :=
  !(m.txs.zipIdx).any fun (t, j) => j != i && key ∈ t.held

/-- The next sorted lock is acquired separately so partial acquisition, waits,
crashes and lock timeouts are explicit. Session locks precede stream locks in
the service; both are represented in this abstract read set. -/
def advance (m : Machine) (i : Nat) (op : Op) : Option Machine := do
  let t ← m.txs[i]?
  let put := fun (t : Tx) (d : Durable) => some { durable := d, txs := m.txs.set i t }
  match op with
  | .request =>
    if t.phase != .start || !freeRequest m i t.request then none else
    put { t with phase := .requestLocked } m.durable
  | .lock =>
    if t.phase != .requestLocked && t.phase != .locked then none else
    match receipt m.durable t.request with
    | some _ => none -- retry reads the durable answer without opening the session
    | none =>
      match (t.request.keys.filter fun k => k ∉ t.held).head? with
      | none => none
      | some key => if !freeKey m i key then none else
        put { t with phase := .locked, held := t.held ++ [key] } m.durable
  | .read =>
    if t.phase != .locked || t.held != t.request.keys then none else
    put { t with phase := .read, observed := readVersions m.durable t.request, cacheHit := t.request.cacheVersion == some (version m.durable t.request.patient) } m.durable
  | .guard =>
    if t.phase != .read || !t.request.screenValid then none else
    put { t with phase := .guarded, answer := some (decide m.durable t.request) } m.durable
  | .stage =>
    if t.phase == .requestLocked && (receipt m.durable t.request).isSome then
      put { t with phase := .staged } m.durable
    else if t.phase != .guarded then none else
      put { t with phase := .staged } m.durable
  | .commit =>
    if t.phase != .staged then none else
    if (receipt m.durable t.request).isNone &&
        (t.observed != readVersions m.durable t.request || t.answer != some (decide m.durable t.request)) then none
    else
      let (d, a) := publish m.durable t.request
      put { t with phase := .committed, held := [], answer := some a } d
  | .unlock =>
    if t.phase != .committed then none else
    put { t with phase := .released, held := [] } m.durable
  | .respond =>
    if t.phase != .released then none else
    put { t with phase := .done } m.durable
  | .crash =>
    if t.phase == .aborted then none else
    put { t with phase := .aborted, held := [], answer := none } m.durable
  | .retry =>
    if t.phase != .aborted && t.phase != .done then none else
    put { request := t.request } m.durable
  | .timeout => some m -- client loses patience; server may still commit

/-- Durable safety specifications, independent of client/request bounds. -/
def ProjectionCorrect (d : Durable) : Prop := d.projection = foldLog d.events

def NoDuplicateEffect (d : Durable) : Prop := (d.events.map fun e => e.request.id).Nodup

def NativeGuarded (d : Durable) : Prop := ∀ e ∈ d.events, e.request.native = true

def AcceptedRecorded (d : Durable) : Prop :=
  ∀ a ∈ d.receipts, ∀ n, a.answer = .accepted n →
    ∃ e ∈ d.events, e.request.id = a.id ∧ e.request.payload = a.payload

def Invariant (d : Durable) : Prop :=
  ProjectionCorrect d ∧ NoDuplicateEffect d ∧ NativeGuarded d ∧
  Multi.Invariant d.projection ∧ AcceptedRecorded d

def historySafe : List Event → Bool
  | [] => true
  | e :: es =>
    let prior : Durable := { events := es, projection := foldLog es }
    e.before == readVersions prior e.request &&
    decide prior e.request == .accepted (es.length + 1) && historySafe es

/-- Executable safety check used in bounded exploration and trace replay.
The stronger inductive proofs are in Proofs.lean. -/
def safe (d : Durable) : Bool :=
  d.patientProjection == foldPatientLog d.events &&
  historySafe d.events &&
  (d.receipts.map Receipt.id).eraseDups.length == d.receipts.length &&
  d.events.all (fun e => d.receipts.any fun a => a.id == e.request.id &&
    a.payload == e.request.payload && match a.answer with | .accepted _ => true | _ => false) &&
  d.projection == foldLog d.events &&
  (d.events.map fun e => e.request.id).eraseDups.length == d.events.length &&
  d.events.all (fun e => e.request.native) &&
  (d.projection.administrations.map Prod.fst).eraseDups.length == d.projection.administrations.length &&
  (d.projection.placements.map Prod.fst).eraseDups.length == d.projection.placements.length &&
  d.receipts.all fun a => match a.answer with
    | .accepted _ => d.events.any fun e => e.request.id == a.id && e.request.payload == a.payload
    | _ => true

end Ehr.Commit.Protocol
