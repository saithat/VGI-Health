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

/-- The order line's dose is outside the drug's per-kg range for the kg
weight. Needs a known drug with a range, a dose in mg, and a kg weight.
In tenths: in range iff `min * weight ≤ 10 * dose ≤ max * weight`. -/
def doseOutOfRange (facts : Facts) (s : State) (slot : Nat) (d : String) : Bool :=
  match lookupDrug d, lineDoseMgTenths? s slot, weightKgTenths? facts s with
  | some di, some dose, some w =>
    decide (0 < di.maxMgPerKgTenths) && decide (0 < w) &&
      (decide (10 * dose < di.minMgPerKgTenths * w) ||
       decide (di.maxMgPerKgTenths * w < 10 * dose))
  | _, _, _ => false

/-- A captured weight in lb. -/
def isLbWeight (x : Captured) : Bool :=
  x.element == weightElement &&
    match x.value with
    | .qty _ .lb => true
    | _ => false

/-- The keys an alert condition fires for (empty = the condition does not hold). -/
def alertKeys (facts : Facts) (s : State) : AlertCond → List String
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
