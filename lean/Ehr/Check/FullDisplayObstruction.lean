import Ehr.Check.DisplayObstruction

namespace Ehr.Check
open Ehr Ehr.Props

/-- The release requires decision-support sources when phase is unknown. The
current completion domain permits such a record with no trusted payload at all.
Thus any nonempty required task family is impossible in that domain, even if
every field and review is perfectly placed. This applies to all persona roles. -/
theorem release_payload_domain_obstruction (sp : Spec) (can p : Program)
    (displays : sp.displays? = Specs.V1.specV1.displays?)
    (tasks : ∃ c, c ∈ requiredCommits sp can p) :
    ¬ Completable sp can p := by
  obtain ⟨c, required⟩ := tasks
  let facts : Facts := { replayFacts with medToGive? := some "acetaminophen" }
  let user : User := { id := "payload-domain-witness", role := p.role }
  apply missing_payload_not_completable sp can p facts user rfl (fun _ => rfl) c required
    Specs.Rules.Features.display002
  · rw [displays]
    decide +kernel
  · rfl
  · intro s c
    rfl

/-- No UI redesign can certify a nonempty task family against v1 in the
current evidence domain; trusted payloads are not fabricated by UI inputs. -/
theorem v1_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V1.specV1 can p) :
    ¬ Satisfies Specs.V1.specV1 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

/-- The same inherited display contract blocks v2 in the same record domain. -/
theorem v2_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V2.specV2 can p) :
    ¬ Satisfies Specs.V2.specV2 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

/-- The v3 entry extension retains this obstruction, for every persona role. -/
theorem v3_payload_domain_not_satisfies (can p : Program)
    (tasks : ∃ c, c ∈ requiredCommits Specs.V3.specV3 can p) :
    ¬ Satisfies Specs.V3.specV3 none can p :=
  fun h => release_payload_domain_obstruction _ can p rfl tasks h.2.2.2.2.2.1

#print axioms release_payload_domain_obstruction
#print axioms v1_payload_domain_not_satisfies
#print axioms v2_payload_domain_not_satisfies
#print axioms v3_payload_domain_not_satisfies
end Ehr.Check
