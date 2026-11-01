import Ehr.Core.Basics

/-!
# Alerts

Each alert condition is computed from the facts, the captured values, and the
formulary. A condition yields a list of *keys*: one per thing it fires for
(e.g. a drug name plus the data version). The alert holds when the list is not
empty. An acknowledged `(alert, key)` pair never pops up again in the episode;
a new data version gives a new key, so the alert may fire again (A3).
-/

namespace Ehr

/-- A key made of a drug name and a data version, e.g. `"amoxicillin@3"`. -/
def keyAt (d : String) (v : Nat) : String :=
  d ++ "@" ++ toString v

/-- The drug is in a class the patient is allergic to. -/
def allergyMatch (facts : Facts) (d : String) : Bool :=
  (drugClasses d).any (facts.allergyClasses.contains ·)

/-- The drug interacts with a current medication's class or with another drug
in play (`others`). -/
def interacts (facts : Facts) (others : List String) (d : String) : Bool :=
  match lookupDrug d with
  | some di =>
    di.interactsWith.any fun cls =>
      facts.currentMedClasses.contains cls || others.any (inClass · cls)
  | none => false

/-- The drug's therapeutic class is already taken (current meds) or is shared
with another drug in play. -/
def duplicate (facts : Facts) (others : List String) (d : String) : Bool :=
  match primaryClass d with
  | some p => facts.currentMedClasses.contains p || others.any (primaryClass · == some p)
  | none => false

/-- A captured weight in kg (tenths), if any. -/
def capturedWeightKg? (s : State) : Option Nat :=
  s.captured.findSome? fun x =>
    if x.element == weightElement then
      match x.value with
      | .qty w .kg => some w
      | _ => none
    else none

/-- The weight in kg (tenths) used by the dose check: a captured kg weight,
else today's recorded weight if it is in kg. Never a weight in lb. -/
def weightKgTenths? (facts : Facts) (s : State) : Option Nat :=
  match capturedWeightKg? s with
  | some w => some w
  | none =>
    match facts.weightToday? with
    | some (w, .kg) => some w
    | _ => none

/-- Clamp a weight-based bound by the absolute cap, if specified. Values
are scaled by ten so weight × mg/kg and dose have the same units. -/
def cappedDoseBound (di : DrugInfo) (bound : Nat) : Nat :=
  if di.maxDoseMgTenths == 0 then bound else min bound (10 * di.maxDoseMgTenths)

/-- The dose exceeds the absolute per-dose cap, or lies outside the per-kg
range. Both ends of the per-kg range are clamped at the cap, so a heavy teen's
capped dose is accepted. An absolute overdose fires even without a kg weight;
the per-kg check still requires a nonzero kg weight and a known range. -/
def doseOutOfRange (facts : Facts) (s : State) (slot : Nat) (d : String) : Bool :=
  let native := (s.captured.filter (fun x => x.element == doseElement && x.slot == slot)).any fun x =>
    match x.value with
    | .qty dose unit => (drugDoseUnits d).any fun rule => rule.unit == unit &&
        ((0 < rule.minTenths && dose < rule.minTenths) ||
         (0 < rule.maxTenths && rule.maxTenths < dose))
    | _ => false
  native || match lookupDrug d, lineDoseMgTenths? s slot with
    | some di, some dose =>
      (decide (0 < di.maxDoseMgTenths) && decide (di.maxDoseMgTenths < dose)) ||
        match weightKgTenths? facts s with
        | some w =>
          decide (0 < di.maxMgPerKgTenths) && decide (0 < w) &&
            (decide (10 * dose < cappedDoseBound di (di.minMgPerKgTenths * w)) ||
             decide (cappedDoseBound di (di.maxMgPerKgTenths * w) < 10 * dose))
        | none => false
    | _, _ => false

/-- A captured weight in lb. -/
def isLbWeight (x : Captured) : Bool :=
  x.element == weightElement &&
    match x.value with
    | .qty _ .lb => true
    | _ => false

/-- The keys an alert condition fires for (empty = the condition does not hold). -/
def alertKeys (facts : Facts) (s : State) : AlertCond → List String
  | .clinical p =>
    match clinicalEval facts s p with
    | some false => []
    | result =>
      -- Bind acknowledgments to the complete clinical snapshot and captures.
      -- A changed code, provenance or capture yields a new key.
      [(if result == some true then "clinical:true:" else "clinical:unknown:") ++
        reprStr (facts.clinical?, facts.artifactBindings?, s.captured)]
  | .drugAllergy =>
    (((drugsInPlay facts s).filter (allergyMatch facts)).map (keyAt · facts.allergyVersion)).eraseDups
  | .interaction =>
    let ds := drugsInPlay facts s
    ((ds.filter (fun d => interacts facts (ds.erase d) d)).map (keyAt · facts.medsVersion)).eraseDups
  | .duplicateTherapy =>
    let ds := drugsInPlay facts s
    ((ds.filter (fun d => duplicate facts (ds.erase d) d)).map (keyAt · facts.medsVersion)).eraseDups
  | .doseOutOfRange =>
    (((orderLines s).filter (fun p => doseOutOfRange facts s p.1 p.2)).map
      (fun p => p.2 ++ "#" ++ toString p.1)).eraseDups
  | .weightInLb => if s.captured.any isLbWeight then ["weight"] else []
  | .careGap => facts.careGaps.eraseDups
  | .highAlertMed => ((drugsInPlay facts s).filter isHighAlert).eraseDups

/-- The alert's condition holds (looked up by ID; unknown alerts never hold). -/
def alertHolds (sp : Spec) (facts : Facts) (s : State) (a : AlertId) : Bool :=
  match sp.alert? a with
  | some al => !(alertKeys facts s al.cond).isEmpty
  | none => false

/-- The current screen has an alert component for `a` that asks to pop up. -/
def programPopsUp (prog : Program) (s : State) (a : AlertId) : Bool :=
  (prog.compsOf s.screen).any fun c =>
    match c.kind with
    | .alert a' true => a' == a
    | _ => false

/-- The alert may pop up: interruptive always; removable only if the current
screen asks for it; passive never (A4). Looked up by ID. -/
def canPopup (sp : Spec) (prog : Program) (s : State) (a : AlertId) : Bool :=
  match sp.alert? a with
  | some al =>
    match al.tier with
    | .interruptive => true
    | .removable => programPopsUp prog s a
    | .passive => false
  | none => false

/-- Alerts waiting to pop up before commit `c`: each `(alert, key)` whose
alert concerns `c`, may pop up, holds for `key`, and is not yet acknowledged. -/
def popupCandidates (sp : Spec) (prog : Program) (facts : Facts) (s : State)
    (c : CommitId) : List (AlertId × String) :=
  sp.alerts.flatMap fun al =>
    if al.commit == c && canPopup sp prog s al.id then
      ((alertKeys facts s al.cond).filter (fun k => !s.acked.contains (al.id, k))).map (al.id, ·)
    else []

/-- Every interruptive alert concerning `c` is acknowledged for each key it
currently fires for. -/
def alertsAcked (sp : Spec) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  sp.alerts.all fun al =>
    al.commit != c || al.tier != .interruptive ||
      (alertKeys facts s al.cond).all (fun k => s.acked.contains (al.id, k))

end Ehr
