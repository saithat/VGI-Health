import Ehr.Commit.Check
import Ehr.Specs.MarTiming
import Ehr.Multi.Proofs

/-! W4's patient-stream reduction. SQL must persist the returned version, events,
FHIR resource and shared state atomically while retaining the checked snapshot.
No claims about physical scanning or SQL execution are axioms of these proofs. -/
namespace Ehr.Commit.Mar
open Lean Render.Fhir

deriving instance ToJson, FromJson for Multi.DoseKey
deriving instance ToJson, FromJson for Multi.State

inductive Event where
  | administered (dose : Multi.DoseKey) (actor : Nat) (user : String)
  | held (dose : Multi.DoseKey) (user reason : String)
  | refused (dose : Multi.DoseKey) (user reason : String)
  | notGiven (dose : Multi.DoseKey) (user reason : String)
  | delayed (dose : Multi.DoseKey) (user reason : String)
  | barcodeScanned (dose : Multi.DoseKey) (user target value : String)
  | doubleCheckCosign (dose : Multi.DoseKey) (user cosigner : String)
  deriving DecidableEq, Repr, ToJson, FromJson

structure State where
  shared : Multi.State := {}
  events : List Event := []
  deriving DecidableEq, Repr, ToJson, FromJson

/-- Held/refused/not-given/delayed doses and evidence never consume a scheduled occurrence. -/
def applyEvent (s : State) (e : Event) : State :=
  { shared := match e with
      | .administered dose actor _ => Multi.step s.shared (.administer actor dose)
      | _ => s.shared
    events := s.events ++ [e] }

def reduce (s : State) (events : List Event) : State := events.foldl applyEvent s

def Invariant (s : State) : Prop := Multi.Invariant s.shared

theorem applyEvent_invariant (s : State) (e : Event) (h : Invariant s) :
    Invariant (applyEvent s e) := by
  cases e <;> first | exact Multi.step_invariant _ _ h | exact h

theorem reduce_invariant (s : State) (events : List Event) (h : Invariant s) :
    Invariant (reduce s events) := by
  induction events generalizing s with
  | nil => exact h
  | cons e rest ih => exact ih _ (applyEvent_invariant s e h)

/-- New outcome states are documentation only; a later offer uses the same key. -/
theorem nonadministration_preserves_shared (s : State) (dose : Multi.DoseKey)
    (user reason : String) :
    (applyEvent s (.held dose user reason)).shared = s.shared ∧
    (applyEvent s (.refused dose user reason)).shared = s.shared ∧
    (applyEvent s (.notGiven dose user reason)).shared = s.shared ∧
    (applyEvent s (.delayed dose user reason)).shared = s.shared := by
  exact ⟨rfl, rfl, rfl, rfl⟩

/-- Any finite history, including repeated offers, has at most one administration
per occurrence when the starting store satisfies the existing invariant. -/
theorem reoffers_doses_unique (s : State) (events : List Event) (h : Invariant s) :
    Multi.DosesUnique (reduce s events).shared := (reduce_invariant s events h).1

structure Input where
  state : State
  version : Nat
  expectedVersion : Nat
  actor : Nat
  dose : Multi.DoseKey
  request : Request
  medicationRequest : String
  encounter : String
  time : String
  /-- Separate charting timestamp; time remains the bedside/outcome timestamp. -/
  chartedTime? : Option String := none
  timing? : Option AdministrationDecision := none
  resourceId : String
  deriving FromJson

structure Accepted where
  state : State
  version : Nat
  readVersion : Nat
  staged : Ehr.State
  resource : Json
  events : List Event
  deriving ToJson

/-- Only confirmed captures from the recomputed Lean step become MAR data. -/
def capturedText (s : Ehr.State) (element : String) : String :=
  match s.captured.find? (fun c => c.element == element && c.confirmed) with
  | none => ""
  | some c => match c.value with
    | .text t | .code t | .user t => t
    | _ => ""

def evidence (i : Input) (s : Ehr.State) : List Event :=
  [.barcodeScanned i.dose i.request.user.id "patient" (capturedText s "wristbandScan"),
   .barcodeScanned i.dose i.request.user.id "medication" (capturedText s "medScan")] ++
  (if capturedText s "highAlertCosign" == "" then [] else
    [.doubleCheckCosign i.dose i.request.user.id (capturedText s "highAlertCosign")])

def outcomeEvent (i : Input) (s : Ehr.State) : Option Event :=
  if i.timing?.any (fun a => capturedText s "adminStatus" != match a.outcome with
    | .given => "given" | .held => "held" | .refused => "refused"
    | .notGiven => "not-given" | .delayed => "delayed") then none else
  match capturedText s "adminStatus" with
  | "given" => some (.administered i.dose i.actor i.request.user.id)
  | "held" => some (.held i.dose i.request.user.id (capturedText s "adminReason"))
  | "refused" => some (.refused i.dose i.request.user.id (capturedText s "adminReason"))
  | "not-given" => some (.notGiven i.dose i.request.user.id (capturedText s "adminReason"))
  | "delayed" => some (.delayed i.dose i.request.user.id (capturedText s "adminReason"))
  | _ => none

private def ref (value : String) : Json := Json.mkObj [("reference", .str value)]
private def cc (text : String) : Json := Json.mkObj [("text", .str text)]

/-- Deterministic R4 projection from the accepted captures and exact imported
order. Source version/event identity are retained for idempotent exchange. -/
def resource (i : Input) (s : Ehr.State) : Json := Id.run do
  let status := capturedText s "adminStatus"
  let order := (bundleResources i.request.currentBundle).find? (fun r =>
    resourceType r == "MedicationRequest" && str r "id" == i.medicationRequest)
  let dose := s.captured.find? (fun c => c.element == "administeredDose" && c.confirmed)
  let quantity := match dose.map (·.value) with
    | some (.qty n u) => Json.mkObj [("value", (Json.parse s!"{n / 10}.{n % 10}").toOption.getD .null), ("unit", .str (Render.unitName u))]
    | _ => .null
  let dosage := ((if quantity == .null then [] else [("dose", quantity)]) ++
    [("text", .str (capturedText s "administeredDose")),
     ("route", cc (capturedText s "actualAdministrationRoute")),
     ("site", cc (capturedText s "adminSite"))].filter (fun pair =>
       pair.2 != .str "" && pair.2 != cc ""))
  return Json.mkObj (([
    ("resourceType", .str "MedicationAdministration"), ("id", .str i.resourceId),
    ("meta", Json.mkObj [("versionId", .str (toString (i.version + 1)))]),
    ("identifier", toJson [Json.mkObj [("system", .str "urn:vgi:mar-event"), ("value", .str i.resourceId)]]),
    ("status", .str (if status == "given" then "completed" else if status == "delayed" then "on-hold" else "not-done")),
    ("statusReason", if status == "given" then .null else
      toJson [Json.mkObj [("coding", toJson [Json.mkObj [("system", .str "urn:vgi:mar-status"),
        ("code", .str status)]]), ("text", .str (capturedText s "adminReason"))]]),
    ("subject", ref ("Patient/" ++ i.request.patient)), ("context", ref ("Encounter/" ++ i.encounter)),
    ("request", ref ("MedicationRequest/" ++ i.medicationRequest)),
    ("effectiveDateTime", .str i.time),
    ("note", toJson [Json.mkObj [("text", .str (capturedText s "adminReason")),
      ("authorReference", ref ("Practitioner/" ++ i.request.user.id)), ("time", .str (i.chartedTime?.getD i.time))]]),
    ("medicationCodeableConcept", field (order.getD .null) "medicationCodeableConcept"),
    ("performer", toJson [Json.mkObj [("actor", ref ("Practitioner/" ++ i.request.user.id))]]),
    ("extension", toJson [Json.mkObj [("url", .str "urn:vgi:scheduled-dose"), ("valueString", .str (toJson i.dose).compress)],
      Json.mkObj [("url", .str "urn:vgi:mar-evidence"), ("valueString", .str (toJson (evidence i s)).compress)]])] ++
    (if status != "given" || dosage.isEmpty then [] else [("dosage", Json.mkObj dosage)])).filter (fun pair => pair.2 != .null))

structure ContextInput where
  bundle : Json
  context : Render.FactsContext
  medicationRequest : String
  encounter : String
  scheduledTime : String
  deriving FromJson

/-- Resolve the exact scheduled order in Lean, including encounter, patient,
active status and an explicit schedule event. No JS drug or schedule inference. -/
def contextFor (i : ContextInput) : Except String Render.FactsContext := do
  let rs := bundleResources i.bundle
  let [patient] := rs.filter (resourceType · == "Patient") | throw "ambiguous patient"
  let some order := rs.find? (fun r => resourceType r == "MedicationRequest" &&
    str r "id" == i.medicationRequest) | throw "scheduled order missing"
  let some encounter := rs.find? (fun r => resourceType r == "Encounter" &&
    str r "id" == i.encounter) | throw "encounter missing"
  if !acuteRefersTo (field order "subject") patient ||
      !acuteRefersTo (field encounter "subject") patient ||
      !acuteRefersTo (field order "encounter") encounter || str order "status" != "active" ||
      str encounter "status" != "in-progress" ||
      !["IMP", "ACUTE", "NONAC", "inpatient"].contains (str (field encounter "class") "code") then
    throw "scheduled order binding mismatch"
  if !(marOrderRow order).scheduled.contains i.scheduledTime then throw "scheduled occurrence missing"
  let drug := medDrug order
  if drug == "" then throw "unknown formulary drug"
  return { i.context with
    medToGive? := some drug
    encounterId? := some i.encounter
    encounterKind? := some "inpatient" }

/-- Initial imports cannot silently erase an already-recorded administration of
this order. Reconciliation of historical occurrences is privileged future work. -/
def importContextFor (i : ContextInput) : Except String Render.FactsContext := do
  let context ← contextFor i
  let order := (bundleResources i.bundle).find? (fun r => resourceType r == "MedicationRequest" &&
    str r "id" == i.medicationRequest)
  if (bundleResources i.bundle).any (fun r => resourceType r == "MedicationAdministration" &&
      str r "status" == "completed" && order.any (acuteRefersTo (field r "request"))) then
    throw "prior administration of this order requires baseline reconciliation"
  pure context

/-- Successful reduction writes exactly one successor of the checked version.
All clinical authorization comes from Commit.check on this version's bundle. -/
def commit (i : Input) : Option Accepted :=
  if i.timing?.any (fun a => !Specs.MarTiming.valid a) then none else
  if i.version != i.expectedVersion then none else
  if i.request.commit != "administerMed" || i.request.user.role != .rn then none else
  match check i.request with
  | .reject _ => none
  | .accept _ staged =>
    match outcomeEvent i staged with
    | none => none
    | some event =>
      if (i.dose ∈ i.state.shared.administrations.map Prod.fst) then none else
      let events := evidence i staged ++ [event]
      some { state := reduce i.state events
             version := i.version + 1
             readVersion := i.version
             staged := staged
             resource := resource i staged
             events := events }

theorem commit_invariant (i : Input) (a : Accepted) (h : Invariant i.state)
    (accepted : commit i = some a) : Invariant a.state := by
  unfold commit at accepted
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  cases accepted
  exact reduce_invariant _ _ h

/-- Every accepted MAR write checked the existing guard against its exact input
bundle and version. SQL must supply and atomically CAS that locked version. -/
theorem accepted_guard_at_written_version (i : Input) (a : Accepted)
    (accepted : commit i = some a) :
    a.readVersion = i.expectedVersion ∧ a.version = i.expectedVersion + 1 ∧
    ∃ current, prepare i.request = .ok current ∧
      commitGuard i.request.spec i.request.program current.facts i.request.user
        i.request.state i.request.commit = true := by
  unfold commit at accepted
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  rename_i versionOk
  have hv : i.version = i.expectedVersion := by simpa using versionOk
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  rename_i ps staged checked
  split at accepted <;> try contradiction
  split at accepted <;> try contradiction
  cases accepted
  obtain ⟨current, hp, hg, _⟩ := accepted_current_guard i.request ps staged checked
  exact ⟨hv, congrArg (· + 1) hv, current, hp, hg⟩

theorem accepted_timing_valid (i : Input) (a : Accepted) (t : AdministrationDecision)
    (timing : i.timing? = some t) (accepted : commit i = some a) :
    Specs.MarTiming.valid t = true := by
  unfold commit at accepted
  split at accepted
  · contradiction
  · rename_i h
    simpa [timing] using h

#print axioms accepted_timing_valid
#print axioms nonadministration_preserves_shared
#print axioms reoffers_doses_unique
#print axioms applyEvent_invariant
#print axioms reduce_invariant
#print axioms commit_invariant
#print axioms accepted_guard_at_written_version
end Ehr.Commit.Mar
