import Ehr.Check.EntryWitness

/-! Clinical checkpoints are an adapter to the shared proof-carrying Trial
vocabulary, not a second trace interpreter or search engine. -/
namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. A checkpoint describes a control,
its checked native observations and preservation of predecessor evidence. -/
structure Checkpoint where
  label : String
  accepts : Component → Bool
  act : InitInput → State → Component → Except String State
  preserves : State → State → Bool := fun _ _ => true

/-- New specification for owner review. After a certified native prefix, check
the control, human observations and preservation of the original saved evidence. -/
def performAt (i : InitInput) (g : Checkpoint) (s : State) (pos : {t // Path i s t})
    (cid : CompId) : Except String State := do
  let ⟨(c,t),_⟩ ← revealAt i pos cid
  unless g.accepts c do throw s!"Provide {g.label} on {t.screen}"
  let after ← g.act i t c
  unless g.preserves s after do throw s!"{g.label} changed saved evidence"
  return after

/-- New specification for owner review. The checkpoint contract replays the
whole native path before its action and saved-evidence observations. -/
def perform (i : InitInput) (g : Checkpoint) (s : State) (path : List Hop) (cid : CompId) :
    Except String State := do
  performAt i g s (← travel i s path) cid

/-- New specification for owner review. Compile a checkpoint to the shared
bounded choice. Reusing a prefix supplies the very same performance equation. -/
def checkpoint (i : Scene) (g : Checkpoint) : Trial Unit :=
  choose i g.label (fun _ c => g.accepts c)
    (fun s _ t => ∃ path cid, perform i.toInitInput g s path cid = .ok t)
    fun s path pos reached cid =>
      match h : performAt i.toInitInput g s pos cid with
      | .error msg => .error msg
      | .ok t => .ok ⟨((),t),path,cid,by unfold perform; rw [reached]; exact h⟩

/-- New specification for owner review. Sequence all checkpoints through the
same intermediate states, using the Trial monad shared with entry scenarios. -/
def steps (i : Scene) : List Checkpoint → Trial Unit
  | [] => pure ()
  | g :: gs => do checkpoint i g; steps i gs

/-- New specification for owner review. Cache the shared route graph once for
this encounter. Only search, never the relation, uses the service filter. -/
def scene (i : InitInput) (service := false) : Scene :=
  {i with paths := routes i.program service}

/-- New specification for owner review. Route filtering changes only search;
every checkpoint retains exactly the same native performance equation. -/
theorem steps_policy (i : InitInput) (service : Bool) (gs : List Checkpoint) (s t : State) :
    (steps (scene i service) gs).holds s () t ↔ (steps (scene i) gs).holds s () t := by
  induction gs generalizing s t with
  | nil => rfl
  | cons g gs ih =>
    change (∃ (_ : Unit) (m : State), (∃ path cid, perform i g s path cid = .ok m) ∧
      (steps (scene i service) gs).holds m () t) ↔
      (∃ (_ : Unit) (m : State), (∃ path cid, perform i g s path cid = .ok m) ∧
      (steps (scene i) gs).holds m () t)
    constructor <;> rintro ⟨x,m,h,rest⟩
    · exact ⟨x,m,h,(ih m t).mp rest⟩
    · exact ⟨x,m,h,(ih m t).mpr rest⟩

#print axioms steps_policy

/-- New specification for owner review. Continue a probe at its actual reached
state, erasing only the shared engine's proof after successful validation. -/
def continueAt (i : InitInput) (s : State) (gs : List Checkpoint) : Except String State :=
  (execute (steps (scene i) gs) s).map (·.2)

/-- New specification for owner review. Open and hydrate through the same
native initialization script used by every entry fixture. -/
def beginEncounter (i : InitInput) : Except String State :=
  (execute (openChart i) (runInit i)).map (·.2)

/-- New specification for owner review. The entire encounter is a single Trial,
including chart opening and every checkpoint or counterfactual observation. -/
def encounter (i : InitInput) (gs : List Checkpoint) (service := false) : Trial Unit := do
  checked (fun s => (execute (openChart i) s).map (·.2))
  steps (scene i service) gs

/-- New specification for owner review. The shared initialized-trace relation
for a clinical catalog entry. Search policy has no logical role. -/
def Scenario (i : InitInput) (gs : List Checkpoint) : Prop :=
  Realized i (encounter i gs)

/-- New specification for owner review. Compatibility with the former
checkpoint contract: one concrete performance, then the suffix on its result. -/
theorem steps_cons_iff (i : Scene) (g : Checkpoint) (gs : List Checkpoint) (s : State) :
    (∃ t, (steps i (g :: gs)).holds s () t) ↔
      ∃ path cid m, perform i.toInitInput g s path cid = .ok m ∧
        ∃ t, (steps i gs).holds m () t := by
  constructor
  · rintro ⟨t, x, m, ⟨path,cid,ok⟩,rest⟩
    cases x
    exact ⟨path,cid,m,ok,t,rest⟩
  · rintro ⟨path,cid,m,ok,t,rest⟩
    exact ⟨t,(),m,⟨path,cid,ok⟩,rest⟩

/-- New specification for owner review. Compatibility with the former scenario
contract: native opening followed by all concrete checkpoint performances. -/
theorem scenario_iff (i : InitInput) (gs : List Checkpoint) :
    Scenario i gs ↔ ∃ s, beginEncounter i = .ok s ∧ ∃ t, (steps (scene i) gs).holds s () t := by
  constructor
  · rintro ⟨t,x,s,opened,rest⟩
    cases x
    exact ⟨s,opened,t,rest⟩
  · rintro ⟨s,opened,t,rest⟩
    exact ⟨t,(),s,opened,rest⟩

#print axioms steps_cons_iff
#print axioms scenario_iff
end Ehr.Check.ReviewTrace
