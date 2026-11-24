import Audit.SpecSurface

namespace VerificationAudit.Tests
open Lean Elab Command

def Payload := Nat
structure Box where
  value : Payload

def box : Box := ⟨(1 : Nat)⟩
def claim : Prop := box.value = (1 : Nat)
theorem proofOnly : claim := rfl
theorem headline : claim := proofOnly

-- Regression: roots include themselves, explicit definition roots follow their
-- bodies, structure fields are traversed, theorem proofs are never traversed.
run_cmd do
  let env ← getEnv
  let surface := specSurface env ``headline
  for n in [``headline, ``claim, ``box, ``Box, ``Payload] do
    unless surface.contains n do throwError "Missing statement dependency: {n}"
  if surface.contains ``proofOnly then throwError "Traversed a theorem proof"
  unless (specSurface env ``Box).contains ``Payload do
    throwError "Skipped the constructor field type"
  unless (specSurface env ``claim).contains ``box do
    throwError "Skipped the definition root's body"

#print axioms proofOnly
#print axioms headline

end VerificationAudit.Tests
