import Ehr.Core.Json
import Ehr.Core.Interp
import Ehr.Render.Fhir

/-!
Pure native commit-boundary prototype. The future service supplies authenticated
state/release/user/context and a freshly read, complete FHIR bundle. This module
does not authenticate, lock, map effects, or persist. An accept is a read-set
precondition plan, not a permission that can safely be used after releasing locks.
-/

namespace Ehr.Commit

open Lean Render Render.Fhir

/-- Exact FHIR resource version; unlike the review digest, this is not hashed. -/
structure ResourceVersion where
  url : String
  version : String
  deriving DecidableEq, Repr, ToJson, FromJson

/-- Attach this ETag to an actual update of this URL in the transaction.
Read-only dependencies additionally require revision controls; see the design. -/
structure Precondition where
  url : String
  ifMatch : String
  deriving DecidableEq, Repr, ToJson, FromJson

/-- Internal service input. `state` is before the staged event. Caller-supplied
facts are deliberately absent; parse the supplied current FHIR bundle instead.
All fields except intent/version expectations must be authenticated by a wrapper. -/
structure Request where
  spec : Spec
  program : Program
  user : User
  patient : String
  state : Ehr.State
  event : Event
  commit : CommitId
  factsVersions : List ResourceVersion
  currentBundle : Json
  context : FactsContext
  deriving ToJson, FromJson

/-- Prepared current projection and the exact read-set versions. -/
structure Current where
  facts : Facts
  versions : List ResourceVersion

/-- No persistence occurs here. The accepted state was recomputed, not trusted
from the caller's claim that a commit already succeeded. -/
inductive Decision where
  | accept (preconditions : List Precondition) (state : Ehr.State)
  | reject (reason : String)
  deriving DecidableEq, Repr, ToJson, FromJson

/-- FHIR id syntax, also used for resource version IDs; prevents ETag injection. -/
def validId (s : String) : Bool :=
  !s.isEmpty && s.length ≤ 64 && s.toList.all (fun c =>
    (c.isAlphanum && c.toNat < 128) || c == '-' || c == '.')

/-- Extract one usable URL/version pair. Never silently omit unversioned input. -/
def resourceVersion (r : Json) : Except String ResourceVersion := do
  let kind := resourceType r
  let id := str r "id"
  let version := str (field r "meta") "versionId"
  if kind.isEmpty || !kind.toList.all (fun c => c.isAlpha && c.toNat < 128) then
    throw "invalid resource type"
  if !validId id then throw "missing or invalid resource id"
  if !validId version then throw s!"missing or invalid version: {kind}/{id}"
  pure { url := kind ++ "/" ++ id, version }

/-- Canonicalize the vector without hashing. Duplicates are not removed. -/
def sortedVersions (vs : List ResourceVersion) : List ResourceVersion :=
  vs.mergeSort (fun a b => a.url ≤ b.url)

/-- Read every version from a fully assembled collection. Search pages and
duplicate resource identities are refused rather than mistaken for a snapshot. -/
def currentVersions (bundle : Json) : Except String (List ResourceVersion) := do
  if resourceType bundle != "Bundle" || str bundle "type" != "collection" then
    throw "currentBundle must be an assembled collection Bundle"
  if (arr bundle "link").any (fun l => str l "relation" == "next") then
    throw "incomplete bundle: next page"
  let entries ← (field bundle "entry").getArr?.mapError (fun _ => "bundle entry must be an array")
  let vs ← entries.toList.mapM (fun e => resourceVersion (field e "resource"))
  if !(vs.map (·.url)).Nodup then throw "duplicate resource identity"
  pure (sortedVersions vs)

/-- Project current facts, checking identity and exact displayed versions.
Context is trusted service input, including clock, selected episode and receipts.
This checks supplied data; it cannot establish completeness or freshness of reads. -/
def prepare (i : Request) : Except String Current := do
  if !validId i.patient then throw "invalid patient id"
  let versions ← currentVersions i.currentBundle
  if versions != sortedVersions i.factsVersions then throw "stale facts versions: refresh required"
  let patients := (bundleResources i.currentBundle).filter (resourceType · == "Patient")
  let patient ← match patients with
    | [p] => pure p
    | _ => throw "expected exactly one Patient"
  if str patient "id" != i.patient then throw "patient mismatch"
  if i.state.patientContext?.any (fun c =>
      c.patient? != some i.patient || c.bound? != some i.patient) then
    throw "state is not bound to this patient"
  if let some encounterId := i.context.encounterId? then
    let encounters := (bundleResources i.currentBundle).filter (fun r =>
      resourceType r == "Encounter" && str r "id" == encounterId)
    match encounters with
    | [e] =>
      if !patientReferenceMatches (field e "subject") patient then
        throw "encounter subject mismatch"
    | _ => throw "selected encounter missing or ambiguous"
  let (facts, _) ← parseBundle i.context i.currentBundle
  if facts.sourcePatientId? != some i.patient then throw "projected patient mismatch"
  pure { facts, versions }

/-- Render ETags from the exact vector returned by preparation. -/
def preconditions (current : Current) : List Precondition :=
  current.versions.map fun v => { url := v.url, ifMatch := "W/\"" ++ v.version ++ "\"" }

/-- Recheck the existing guard and re-run the existing human interpreter step.
No copy or relaxation of the hospital guard is used here. -/
def checkCurrent (i : Request) (current : Current) : Decision :=
  if commitGuard i.spec i.program current.facts i.user i.state i.commit then
    if i.commit ∈ i.state.commits then .reject "commit already staged: supply before-state"
    else
      let staged := step i.spec i.program current.facts i.user .human i.state i.event
      if staged.1.commits = i.state.commits ++ [i.commit] ∧
          staged.1.receipts = i.state.receipts ∧ staged.2 = .ok then
        .accept (preconditions current) staged.1
      else .reject "event must add exactly the requested commit and no review receipt"
  else .reject (if !guardBase i.spec i.program current.facts i.user i.state i.commit then
    guardReason i.spec i.program current.facts i.user i.state i.commit
    else "interruptive alert acknowledgment required")

/-- Native service operation: validation failures and guard failures both reject. -/
def check (i : Request) : Decision :=
  match prepare i with
  | .error reason => .reject reason
  | .ok current => checkCurrent i current

/-- Acceptance implies the unmodified guard on the supplied current projection,
and returns exactly its version preconditions and recomputed human step state. -/
theorem checkCurrent_sound (i : Request) (current : Current)
    (ps : List Precondition) (staged : Ehr.State)
    (h : checkCurrent i current = .accept ps staged) :
    commitGuard i.spec i.program current.facts i.user i.state i.commit = true ∧
    ps = preconditions current ∧
    staged = (step i.spec i.program current.facts i.user .human i.state i.event).1 := by
  unfold checkCurrent at h
  split at h
  · rename_i guard
    split at h
    · contradiction
    · dsimp only at h
      split at h
      · cases h
        exact ⟨guard, rfl, rfl⟩
      · contradiction
  · contradiction

/-- Every accepted JSON request has a successful current-bundle projection on
which its guard holds. Currency, provenance and persistence are wrapper duties. -/
theorem accepted_current_guard (i : Request) (ps : List Precondition) (staged : Ehr.State)
    (h : check i = .accept ps staged) :
    ∃ current, prepare i = .ok current ∧
      commitGuard i.spec i.program current.facts i.user i.state i.commit = true ∧
      ps = preconditions current ∧
      staged = (step i.spec i.program current.facts i.user .human i.state i.event).1 := by
  unfold check at h
  cases hp : prepare i with
  | error reason => simp [hp] at h
  | ok current =>
    rw [hp] at h
    exact ⟨current, rfl, checkCurrent_sound i current ps staged h⟩

#print axioms checkCurrent_sound
#print axioms accepted_current_guard

end Ehr.Commit
