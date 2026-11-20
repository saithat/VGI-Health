import Ehr.Check.ContextRules

namespace Ehr.Check
open Ehr Ehr.Props

/-- New specification for owner review. Either service discriminator exposes
part of the imaging/procedure composer. Medication-only composers do not. -/
def serviceOrderScreen (scr : Screen) : Bool :=
  scr.components.any fun c => (fieldOf? c.kind).any fun f => f.1 == "orderKind" || f.1 == "orderCode"

/-- New specification for owner review. The looked-up workflow screen has
the specified control, revealable for every patient through groups and tabs. -/
def priorAuthDestination (p : Program) (workflow : String) (kind : Kind) (z : ScreenId) : Bool :=
  (p.screen? z).any fun scr => scr.workflow == workflow && scr.components.any fun c =>
    c.kind == kind &&
      contextShownAux scr.components (contextLayout scr.components c) (scr.components.length + 1) c

/-- New specification for owner review. From a service composer there must
be a route to the request button, then to its human input on the current line.
Either leg can be empty. Use the existing workflow context navigation bound. -/
def priorAuthAvailable (sp : Spec) (p : Program) (scr : Screen) : Bool :=
  (sp.element? priorAuthElement).isNone || !serviceOrderScreen scr ||
    (contextDestinations sp p scr.id).any fun buttonScreen =>
      priorAuthDestination p scr.workflow (.button .requestPriorAuth) buttonScreen &&
      (contextDestinations sp p buttonScreen).any
        (priorAuthDestination p scr.workflow (.field priorAuthElement .current .none))

end Ehr.Check
