import Ehr.Specs.V1
import Ehr.Specs.Extends
namespace Ehr.Specs.V1_1
open V1

/-- Optional human prior-auth request; no entry or review requirement uses it.
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

/-- Optional imaging/procedure classification. This creates a service slot,
not a medication line; the core keeps its codes out of drug alerts. -/
def orderKind : ElementSpec where
  id := "orderKind"
  label := "Service order kind (imaging / procedure)"
  kind := .coded "order-kind"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.category"

/-- Optional service code for imaging/procedures covered by the final payer
prior-auth rule. No prescription requirement is attached to this element. -/
def orderCode : ElementSpec where
  id := "orderCode"
  label := "Imaging / procedure code"
  kind := .coded "service-code"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "ServiceRequest.code"

/-- v1.1 adds only optional content and its catalog tag; old requirements stay exact. -/
def specV1_1 : Spec :=
  { specV1 with
    version := "v1.1"
    elements := specV1.elements ++ [priorAuthRequest, orderKind, orderCode]
    infos := specV1.infos ++ [priorAuthStatus]
    design := { specV1.design with catalog := specV1.design.catalog ++ ["priorAuth"] } }

-- This finite prefix check traverses the full hospital declaration list.
set_option maxRecDepth 2048 in
/-- Every v1 rule is preserved by the optional-feature release. -/
theorem specV1_1_extends_specV1 : specV1_1.Extends specV1 := by decide
#print axioms specV1_1_extends_specV1

-- Concrete, satisfiable extension, with no added signing or review obligations.
example : specV1_1.Extends specV1 := specV1_1_extends_specV1
#guard specV1_1.entries == specV1.entries && specV1_1.reviews == specV1.reviews
#guard allDistinct (specV1_1.elements.map (·.id))
#guard allDistinct (specV1_1.infos.map (·.id))
end Ehr.Specs.V1_1
