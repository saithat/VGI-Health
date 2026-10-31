import Ehr.Check.Rules

namespace Ehr.Check
open Ehr Ehr.Props

/-- Until CR-6 is resolved, an active request action cannot certify: it can
replace an existing confirmed capture on a non-entry event. Status panels
remain catalog-gated and do not mutate state. This is a conservative rule,
not a relaxation of `EnteredOnce` or `HumanStepsByHuman`. -/
def requestsPreserveCaptures (sp : Spec) (p : Program) : Bool :=
  (allComps p).all fun sc =>
    sc.2.kind != .button .requestPriorAuth ||
      (sp.element? priorAuthElement).all (fun el => !el.enteredBy.contains p.role)

end Ehr.Check
