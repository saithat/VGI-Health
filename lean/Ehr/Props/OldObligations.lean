import Ehr.Props.Properties
import Ehr.Specs.Extends

namespace Ehr.Props
open Ehr

/-- The older release's structural human-entry, unit and alert policies.
These are the actual old-spec predicates, not their new-spec substitutes. -/
def OldStaticObligations (old : Spec) (p : Program) : Prop :=
  NoAutomationAttempts old p ∧ QuantityPrefillsKeepUnits old p ∧
  NoAlertSuppression p ∧ NoInterruptivePopupRequests old p ∧
  PopupRequestedOnce old p ∧ NoPassivePopupRequests old p

/-- The older hospital's obligations, projected onto executions of the installed
release. The interpreter remains the installed release's interpreter: upgrading
does not run the old interpreter, discard new guards, or require old catalog
membership. `Extends` preserves old declarations exactly, including human-entry
policies and units. Entry/review/alert quantifiers below range over OLD rules.
Human actions and alert truth/acknowledgment invariants retain their full strength.
This is the owner-approved T8 projection, not full `Satisfies` for the old catalog. -/
def OldObligations (old : Spec) (ep : Episode) : Prop :=
  ep.spec.Extends old ∧ OldStaticObligations old ep.prog ∧
  (EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ old.entries, rq.commit = c → EntryMetIn ep s rq) ∧
  (EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ old.reviews, rq.commit = c → ReviewMetIn ep s rq) ∧
  (Always ep fun s => ∀ c, CommitButtonShown ep s c →
    ∀ rq ∈ old.reviews, rq.commit = c → rq.waivedBy? = none → ReviewMetIn ep s rq) ∧
  HumanStepsByHuman ep ∧ OnlyHumanCommitsAndAcks ep ∧ CosignIsSecondUser ep ∧
  (EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ old.entries, rq.commit = c → ∀ el u, ep.spec.element? rq.element = some el →
      el.kind = .quantity u → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧ ∃ t, x.value = .qty t u) ∧
  (EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ al ∈ old.alerts, al.commit = c → al.tier = .interruptive →
      ∀ k ∈ alertKeys ep.facts s al.cond, (al.id, k) ∈ s.acked) ∧
  (Always ep fun s => ∀ al ∈ old.alerts, al.tier = .passive →
    (ep.prog.screen? s.screen).any al.targetsScreen = true →
    alertHolds ep.spec ep.facts s al.id = true → AlertShownInline ep s al.id) ∧
  AlertsOnlyWhenTrue ep ∧ InterruptsOnce ep ∧ PassiveNeverPopsUp ep

end Ehr.Props
