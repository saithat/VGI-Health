import Ehr.Commit.Mar

namespace Ehr.Commit.Mar.Tests
open Lean Render.Fhir

def dose : Multi.DoseKey := { patient := 1, order := 9, occurrence := 600 }
def otherDose : Multi.DoseKey := { patient := 1, order := 9, occurrence := 960 }
def history : List Event :=
  [.barcodeScanned dose "nurse-a" "patient" "pt-1",
   .barcodeScanned dose "nurse-a" "medication" "amoxicillin",
   .held dose "nurse-a" "NPO", .refused dose "nurse-b" "patient refused",
   .doubleCheckCosign dose "nurse-a" "nurse-b", .administered dose 1 "nurse-a",
   .administered dose 2 "nurse-b", .administered otherDose 2 "nurse-b"]

#guard (reduce {} history).shared.administrations == [(otherDose, 2), (dose, 1)]
#guard (reduce {} history).events == history
#guard (reduce {} [.held dose "nurse-a" "NPO"]).shared == ({} : Multi.State)
#guard (reduce {} [.refused dose "nurse-b" "refused"]).shared == ({} : Multi.State)

/-- Distinct actors cannot add a second administration of one occurrence. -/
example : Invariant (reduce {} history) := reduce_invariant _ _ Multi.initial_invariant

end Ehr.Commit.Mar.Tests
