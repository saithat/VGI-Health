import Ehr.Specs.V1
import Ehr.Specs.Extends
/-!
Release v2 adds optional prior-authorization and service-order fields.
It preserves the v1 entry and review requirements.
-/

namespace Ehr.Specs.V2
open V1

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Optional human prior-auth request; no entry or review requirement uses it.
CMS-0057-F (89 FR 8758) covers payer APIs for medical items/services from 2027,
not drugs. Medication prior auth anticipates proposed CMS-0062-P. The UI and
request representation are our design; see docs/regulations.md §5.2. -/
def priorAuthRequest : ElementSpec where
  id := "priorAuthRequest"
  label := "Request prior authorization"
  kind := .flag
  enteredBy := prescribers
  prefill := .never
  friction := .compliance
  fhirTarget := "ServiceRequest.extension.priorAuthRequest"

/-- Optional status display. The actual payer API is outside this demo.
45 CFR 170.315(g)(31)–(33) are matching EHR certification criteria, not a law
requiring this panel to be shown (docs/regulations.md §5.2). -/
def priorAuthStatus : InfoSpec :=
  { id := "priorAuthStatus", label := "Prior authorization status", version := "" }

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Optional imaging/procedure classification. This creates a service slot,
not a medication line; the core keeps its codes out of drug alerts. -/
def orderKind : ElementSpec where
  id := "orderKind"
  label := "Service order kind (imaging / procedure)"
  kind := .coded "order-kind"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.category"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Optional service code for imaging/procedures covered by the final payer
prior-auth rule. No prescription requirement is attached to this element. -/
def orderCode : ElementSpec where
  id := "orderCode"
  label := "Imaging / procedure code"
  kind := .coded "service-code"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.code"

/-- Hospital policy (not law): local clinical documentation and record-completeness checklist.
Optional requested priority of an imaging order (routine, urgent, ASAP, stat).
No entry or review requirement uses it. -/
def imagingPriority : ElementSpec where
  id := "imagingPriority"
  label := "Imaging priority"
  kind := .coded "request-priority"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.priority"

/-- v2 adds only optional content and its catalog tag; old requirements stay exact. -/
def specV2 : Spec :=
  { specV1 with
    version := "v2"
    elements := specV1.elements ++ [priorAuthRequest, orderKind, orderCode, imagingPriority]
    infos := specV1.infos ++ [priorAuthStatus]
    design := { specV1.design with catalog := specV1.design.catalog ++ ["priorAuth"] } }

-- This finite prefix check traverses the full hospital declaration list.
-- The complete catalog adds inherited artifact contracts to this finite check.
set_option maxRecDepth 16384 in
set_option maxHeartbeats 2000000 in
/-- Every v1 rule is preserved by the optional-feature release. -/
theorem specV2_extends_specV1 : specV2.Extends specV1 := by decide
#print axioms specV2_extends_specV1

-- Concrete, satisfiable extension, with no added signing or review obligations.
example : specV2.Extends specV1 := specV2_extends_specV1
#guard specV2.entries == specV1.entries && specV2.reviews == specV1.reviews
#guard allDistinct (specV2.elements.map (·.id))
#guard allDistinct (specV2.infos.map (·.id))
end Ehr.Specs.V2
