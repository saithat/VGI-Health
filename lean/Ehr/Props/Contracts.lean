import Ehr.Props.Properties

namespace Ehr.Props
open Ehr

/-- Every actual commit satisfies the installed release's additional contracts:
all temporal evidence is timely, every capture satisfies its lexical/relational
validator, required defaults match the program, durable order clocks are live,
and structured payloads and exact action labels are present. These obligations
are independent of receipts and cannot be discharged by ordinary typed values. -/
def CommitContracts (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∃ cs, ep.spec.commit? c = some cs ∧
      (∀ rq ∈ cs.temporal?.getD [], temporalStatus ep.facts s rq = .met) ∧
      validationsOk ep.spec ep.facts s = true ∧ defaultsOk ep.spec ep.prog = true ∧
      (∀ rq ∈ cs.expiry?.getD [], expiryStatus ep.facts s rq = .met) ∧
      displaysOk ep.spec ep.prog ep.facts s c = true
end Ehr.Props
