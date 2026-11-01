import Ehr.Props.Properties
import Ehr.Specs.Extends

/-!
Rules retained from an older hospital release while the installed release runs.
These requirements preserve old safety duties without restricting new catalog items.
-/

namespace Ehr.Props
open Ehr

/-- The older release's human-entry, unit and alert rules on the given program. -/
def OldStaticObligations (old : Spec) (p : Program) : Prop :=
  NoAutomationAttempts old p ∧ QuantityPrefillsKeepUnits old p ∧
  NoAlertSuppression p ∧ NoInterruptivePopupRequests old p ∧
  PopupRequestedOnce old p ∧ NoPassivePopupRequests old p

/-- The five additional contract families of the older hospital, evaluated on
installed-release executions. Old element declarations, commit declarations and
display requirements are retained exactly by `Extends`. Display visibility uses
the installed interpreter, just as old entry and review obligations do. -/
def OldCommitContracts (old : Spec) (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∃ cs, old.commit? c = some cs ∧
      (∀ rq ∈ cs.temporal?.getD [], temporalStatus ep.facts s rq = .met) ∧
      (∀ el ∈ old.elements, ∀ x ∈ s.captured,
        x.element != el.id || elementValueValid ep.facts s el x.slot x.value = true) ∧
      defaultsOk old ep.prog = true ∧
      (∀ rq ∈ cs.expiry?.getD [], expiryStatus ep.facts s rq = .met) ∧
      (∀ rq ∈ old.displays?.getD [],
        !displayActive ep.facts s (some c) rq || displayReqMet ep.spec ep.prog ep.facts s rq = true) ∧
      actionLabelOk ep.spec ep.prog ep.facts s c = true

/-- The older hospital's entry, review, human-action, unit, alert and extra rules
must still hold while the installed release runs. Extends preserves the old
rules exactly. This does not require the program to use only the old catalog
or satisfy every part of the older Satisfies statement. -/
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
  AlertsOnlyWhenTrue ep ∧ InterruptsOnce ep ∧ PassiveNeverPopsUp ep ∧
  OldCommitContracts old ep

end Ehr.Props
