import Ehr.Props.OldObligations
import Ehr.Check.ContractSound
import Ehr.Check.NavigationSound
import Ehr.Check.ReleaseChecks
import Ehr.Check.MonotonicityObstruction
import Ehr.Specs.V2

namespace Ehr.Check
open Ehr Ehr.Props

/-- Every original review survives an additive hospital release. -/
theorem extends_reviews {new old : Spec} (h : new.Extends old) :
    old.reviews ⊆ new.reviews := by
  intro rq hrq
  exact List.mem_of_mem_take (h.2.2.2.2.1 ▸ hrq)

/-- T8: a program satisfying the installed release meets every inherited entry,
review, human-action, unit and alert obligation on every installed execution.
The only vocabulary tested is the installed release's catalog. -/
theorem T8_old_obligations {new old : Spec} {prev : Option Program}
    {canonical p : Program} (he : new.Extends old)
    (hs : Satisfies new prev canonical p) :
    ∀ facts user, user.role = p.role → OldObligations old ⟨new, p, facts, user⟩ := by
  intro facts user role
  have entry := (hs.2.1.2 facts user role).1
  obtain ⟨review, screen⟩ := hs.2.2.2.1 facts user role
  obtain ⟨human, clicks, cosign⟩ := hs.2.2.2.2.1.2 facts user role
  have units := hs.2.2.2.2.2.2.1.2 facts user role
  obtain ⟨interrupt, passive⟩ := hs.2.2.2.2.2.2.2.2.1.2 facts user role
  refine ⟨he, ?_, ?_, ?_, human, clicks, cosign, ?_, ?_, ?_,
    hs.2.2.2.2.2.2.2.2.2.1.2 facts user role,
    hs.2.2.2.2.2.2.2.2.2.2.1.2 facts user role,
    hs.2.2.2.2.2.2.2.2.2.2.2.2 facts user role⟩
  · intro s reach actor event c happened rq mem same
    exact entry s reach actor event c happened rq (extends_entries he mem) same
  · intro s reach actor event c happened rq mem same
    exact review s reach actor event c happened rq (extends_reviews he mem) same
  · intro s reach c shown rq mem same waiver
    exact screen s reach c shown rq (extends_reviews he mem) same waiver
  · intro s reach actor event c happened rq mem same
    exact units s reach actor event c happened rq (extends_entries he mem) same
  · intro s reach actor event c happened al mem same tier
    exact interrupt s reach actor event c happened al (he.2.2.2.2.2.1 ▸ mem) same tier
  · intro s reach al mem tier target fires
    exact passive s reach al (he.2.2.2.2.2.1 ▸ mem) tier target fires

/-- T8 directly from an actual checker certificate. Only the already proved
safety clauses are needed; this theorem does not assume general T1 or completion. -/
theorem T8_checked_old_obligations {new old : Spec} {prev : Option Program}
    {canonical p : Program} (he : new.Extends old)
    (h : check new prev canonical p = .ok) :
    ∀ facts user, user.role = p.role → OldObligations old ⟨new, p, facts, user⟩ := by
  intro facts user role
  have entry := ((accepted_capturesAllOnce new prev canonical p h).2 facts user role).1
  obtain ⟨review, screen⟩ := (accepted_reviewsBeforeCommit new prev canonical p h) facts user role
  obtain ⟨human, clicks, cosign⟩ := (accepted_humanOnlyKept new prev canonical p h).2 facts user role
  have units := (accepted_units new prev canonical p h).2 facts user role
  obtain ⟨interrupt, passive⟩ := (accepted_alertsFire new prev canonical p h).2 facts user role
  refine ⟨he, ?_, ?_, ?_, human, clicks, cosign, ?_, ?_, ?_,
    (accepted_noFalseAlarms new prev canonical p h).2 facts user role,
    (accepted_noRepeatInterruptions new prev canonical p h).2 facts user role,
    (accepted_severityTiers new prev canonical p h).2 facts user role⟩
  · intro s reach actor event c happened rq mem same
    exact entry s reach actor event c happened rq (extends_entries he mem) same
  · intro s reach actor event c happened rq mem same
    exact review s reach actor event c happened rq (extends_reviews he mem) same
  · intro s reach c shown rq mem same waiver
    exact screen s reach c shown rq (extends_reviews he mem) same waiver
  · intro s reach actor event c happened rq mem same
    exact units s reach actor event c happened rq (extends_entries he mem) same
  · intro s reach actor event c happened al mem same tier
    exact interrupt s reach actor event c happened al (he.2.2.2.2.2.1 ▸ mem) same tier
  · intro s reach al mem tier target fires
    exact passive s reach al (he.2.2.2.2.2.1 ▸ mem) tier target fires

/-- v1.1 certification preserves the v1 hospital's obligations. -/
theorem T8_v1_to_v1_1 {prev : Option Program} {canonical p : Program}
    (hs : check Specs.V1_1.specV1_1 prev canonical p = .ok) :
    ∀ facts user, user.role = p.role →
      OldObligations Specs.V1.specV1 ⟨Specs.V1_1.specV1_1, p, facts, user⟩ :=
  T8_checked_old_obligations Specs.V1_1.specV1_1_extends_specV1 hs

/-- v2 certification preserves the v1.1 hospital's obligations. -/
theorem T8_v1_1_to_v2 {prev : Option Program} {canonical p : Program}
    (hs : check Specs.V2.specV2 prev canonical p = .ok) :
    ∀ facts user, user.role = p.role →
      OldObligations Specs.V1_1.specV1_1 ⟨Specs.V2.specV2, p, facts, user⟩ :=
  T8_checked_old_obligations Specs.V2.specV2_extends_specV1_1 hs

-- A satisfiable hypothesis, using the fully proved vocabulary-extension example.
example : ∀ facts user, user.role = vocabularyProgram.role →
    OldObligations emptySpec
      ⟨vocabularyRelease, vocabularyProgram, facts, user⟩ :=
  T8_old_obligations vocabulary_extends vocabulary_satisfies

example : ∀ facts user, user.role = vocabularyProgram.role →
    OldObligations emptySpec ⟨vocabularyRelease, vocabularyProgram, facts, user⟩ :=
  T8_checked_old_obligations vocabulary_extends
    (show check vocabularyRelease none emptyProgram vocabularyProgram = .ok from by decide)

#print axioms T8_checked_old_obligations
#print axioms T8_old_obligations
#print axioms T8_v1_to_v1_1
#print axioms T8_v1_1_to_v2
end Ehr.Check
