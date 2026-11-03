import Ehr.Multi.Critical
import Ehr.Core.CriticalRuntime
import Ehr.Render.Fhir
import Ehr.Specs.CriticalResults
import Ehr.Examples.Tiny

namespace Ehr.Multi.Critical.Tests

def t : Ticket := { result := ⟨"panic-1", "patient", "Potassium 6.8 mmol/L", "P1", "P2", 10, 30, none⟩ }
#guard (advance 9 t).deliveredAt == none
#guard (advance 10 t).deliveredAt == some 10
#guard (advance 39 t).escalatedAt == none
#guard (advance 40 t).escalatedAt == some 40
#guard (step 10 "P2" (advance 10 t) .receive).receivedBy == []
#guard (step 40 "P2" (advance 40 t) .receive).receivedBy == ["P2"]
#guard (step 10 "P1" (advance 10 t) .acknowledge).resolution == none
#guard (step 10 "P1" (advance 10 t) (.resolve "Called patient")).resolution == none
#guard (step 10 "P1" (step 10 "P1" (advance 10 t) .receive) (.resolve "  ")).resolution == none
#guard (step 10 "P1" (step 10 "P1" (advance 10 t) .receive) (.resolve "Called patient; arranged emergency evaluation")).resolution.isSome
#guard (step 40 "P2" (step 40 "P2" (advance 40 t) .receive) (.resolve "Emergency evaluation arranged")).resolution.isSome
#guard (advance 40 (step 10 "P1" (step 10 "P1" (advance 10 t) .receive) (.resolve "Acted"))).escalatedAt == none
end Ehr.Multi.Critical.Tests
