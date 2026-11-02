import Ehr.Check.Check
import Ehr.Canonical.Personas

namespace Ehr.Check.Tests
open Ehr Ehr.Canonical Ehr.Props

/-- All fifteen release/persona baselines use the renderer's actual navigation
predicate. These are compiled checks, not kernel decisions on whole programs. -/
def personaNavigationPasses : Bool :=
  [(Specs.V1.specV1, canonicalV1), (Specs.V2.specV2, canonicalV2),
    (Specs.V3.specV3, canonicalV3)].all fun (sp, can) =>
      personaRoles.all fun (owner, role) =>
        decide (NavigationSane (forPersona sp can owner role))

#guard personaNavigationPasses

/-- The content repairs now pin every inherited review on each baseline's
commit screens. Full certification still separately checks completability. -/
def personaReviewsPass : Bool :=
  [(Specs.V1.specV1, canonicalV1), (Specs.V2.specV2, canonicalV2),
    (Specs.V3.specV3, canonicalV3)].all fun (sp, can) =>
      personaRoles.all fun (owner, role) => reviewsPinned sp (forPersona sp can owner role)

#guard personaReviewsPass
end Ehr.Check.Tests
