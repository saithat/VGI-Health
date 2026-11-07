import Ehr.Check.CompletionModel
import Ehr.Proofs.T0
import Ehr.Props.Basics

/-! NEW interaction specifications for owner review. The claims below are
sourced directly from Core.Interp and the existing commit guard. They do not
claim storage durability or workspace patient-switch liveness. -/
namespace Ehr.Check.InteractionRules
open Ehr Ehr.Props Ehr.Proofs

/-- Interruptive alerts are acknowledged for every firing key before a new
commit appears. Acknowledging one key is not blanket consent for other keys. -/
def InterruptiveBeforeCommit (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ al ∈ ep.spec.alerts, al.commit = c → al.tier = .interruptive →
      ∀ key ∈ alertKeys ep.facts s al.cond, (al.id, key) ∈ s.acked

theorem interruptive_before_commit (ep : Episode) : InterruptiveBeforeCommit ep := by
  intro s _ actor e c newCommit
  exact ((commitGuard_iff ep.spec ep.prog ep.facts ep.user s c).mp
    (T0_commit_needs_guard ep.spec ep.prog ep.facts ep.user actor s e c newCommit.1 newCommit.2)).2.2.2.1

/-- Back retains every existing capture, including unconfirmed unsaved input.
The interpreter has no discard-on-Back branch, so no prompt is necessary. -/
def BackKeepsEntries (sp : Spec) (p : Program) (f : Facts) : Prop :=
  ∀ s x, x ∈ s.captured → x ∈ (goBack sp p f s).1.captured

theorem prefill_keeps_entries (sp : Spec) (f : Facts) (s : State) (c : Component)
    (x : Captured) (hx : x ∈ s.captured) : x ∈ (prefillField sp f s c).captured := by
  unfold prefillField
  repeat' first | split | dsimp only
  all_goals first | exact hx | exact List.mem_append_left _ hx

theorem prefill_screen_keeps_entries (sp : Spec) (p : Program) (f : Facts) (s : State)
    (x : Captured) (hx : x ∈ s.captured) : x ∈ (prefillScreen sp p f s).captured := by
  unfold prefillScreen
  generalize p.compsOf s.screen = cs
  induction cs generalizing s with
  | nil => exact hx
  | cons c cs ih => exact ih _ (prefill_keeps_entries sp f s c x hx)

theorem back_keeps_entries (sp : Spec) (p : Program) (f : Facts) : BackKeepsEntries sp p f := by
  intro s x hx
  unfold goBack
  split
  · exact hx
  · exact prefill_screen_keeps_entries sp p f _ x hx

theorem back_keeps_commits (sp : Spec) (p : Program) (f : Facts) (s : State) :
    (goBack sp p f s).1.commits = s.commits := (goBack_safe sp p f s).commits

/-- Executable edge predicate used with CompletionModel.edgesHold. -/
def interruptiveRule (sp : Spec) (f : Facts) (s : State) (_ : Event) (t : State) : Bool :=
  t.commits.all fun c => s.commits.contains c || alertsAcked sp f s c

/-- Check capture retention on actual navigation-button clicks. -/
def navigationRule (sp : Spec) (p : Program) (f : Facts) (s : State) (e : Event) (t : State) : Bool :=
  match e with
  | .click id => match shownComp? sp p f s id with
    | some comp => match comp.kind with
      | .button .back | .button (.goto _) => s.captured.all (t.captured.contains ·) && s.commits == t.commits
      | _ => true
    | none => true
  | _ => true

#print axioms interruptive_before_commit
#print axioms back_keeps_entries
#print axioms back_keeps_commits
end Ehr.Check.InteractionRules
