import Ehr.Render.UiTests
import Ehr.Render.FhirTests

namespace Ehr.Render.GrowthReadingsTests
open Lean Fhir

/-- A gram measurement remains available on the kilogram growth axis. -/
def gramWeight := Tests.json r#"{"resourceType":"Observation","status":"final","code":{"coding":[{"code":"29463-7"}]},"effectiveDateTime":"2026-11-01T08:00:00","valueQuantity":{"value":3200,"unit":"g","code":"g"}}"#
def gramGrowthExample := growthPoints "2026-11-01" [gramWeight]
#guard gramGrowthExample.length == 1
#guard (gramGrowthExample.head?).bind (·.weightTenths?) == some 32

/-- The latest clinical time wins when a FHIR bundle is not chronologically ordered. -/
def earlierWeight := gramWeight.setObjVal! "effectiveDateTime" (.str "2026-11-01T08:00:00")
  |>.setObjVal! "valueQuantity" (Tests.json r#"{"value":28,"unit":"kg","code":"kg"}"#)
def laterWeight := earlierWeight.setObjVal! "effectiveDateTime" (.str "2026-11-01T10:00:00")
  |>.setObjVal! "valueQuantity" (Tests.json r#"{"value":30,"unit":"kg","code":"kg"}"#)
def unorderedGrowthExample := growthPoints "2018-11-01" [laterWeight, earlierWeight]
#guard (unorderedGrowthExample.head?).bind (·.weightTenths?) == some 300
#guard unorderedGrowthExample == growthPoints "2018-11-01" [earlierWeight, laterWeight]

/-- Height uses the shared ambulatory reader, with no assumption about missing units. -/
def meterHeightExample := Tests.json r#"{"value":1.232,"code":"m"}"#
def inchHeightExample := Tests.json r#"{"value":70,"code":"[in_i]"}"#
def unknownHeightExample := Tests.json r#"{"value":123.2}"#
#guard heightCmTenths meterHeightExample == some 1232
#guard heightCmTenths inchHeightExample == some 1778
#guard heightCmTenths unknownHeightExample == none

/-- A missing or invalid age keeps the source measurement without inventing age zero. -/
def ageContext (birth recorded : String) : Ctx :=
  { uiRoomCtx with disp := { uiRoomCtx.disp with
    banner := { uiRoomCtx.disp.banner with dob := birth }
    growth := [{ date := recorded, ageMonths := 0, weightTenths? := some 32, heightTenths? := none }] } }
def missingBirthExample := uiRows (ageContext "" "2026-11-01") "growthChart"
def invalidBirthExample := uiRows (ageContext "2026-02-30" "2026-11-01") "growthChart"
def missingDateExample := uiRows (ageContext "2026-11-01" "") "growthChart"
def beforeBirthExample := uiRows (ageContext "2026-11-02" "2026-11-01") "growthChart"
def newbornAgeExample := uiRows (ageContext "2026-11-01" "2026-11-01") "growthChart"
#guard [missingBirthExample, invalidBirthExample, missingDateExample, beforeBirthExample].all fun rows =>
  rows.any (fun row => row.contains ("Age (months)", "Not recorded") && row.contains ("Weight (kg)", "3.2"))
#guard newbornAgeExample.any (fun row => row.contains ("Age (months)", "0"))

end Ehr.Render.GrowthReadingsTests
