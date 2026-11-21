import Ehr.Check.ContextRules
import Ehr.Specs.V2
import Ehr.Core.Workspace

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

/-- New specification for owner review. Screen-entry prefills process hidden fields too. -/
def drugNeutral (c : Component) : Bool :=
  match c.kind with
  | .field e _ pf => e != drugElement || pf == .none
  | _ => true

/-- New specification for owner review. On a service route, entering any destination
must preserve a drug-free line. Explicit human medication selection remains available. -/
def clinicalEdges (p : Program) (service : Bool) (a : ScreenId) : List Hop :=
  (contextEdges p a).filter fun hop => !service || (p.compsOf hop.2).all drugNeutral

/-- New specification for owner review. Match the clinical binding, allowing
a permitted field prefill or a different widget for the same status information. -/
def controlFits (want actual : Kind) : Bool :=
  match want, actual with
  | .field e slot _, .field other binding _ => e == other && slot == binding
  | .priorAuth i, k => showsInfo i k
  | k, other => k == other

/-- New specification for owner review. Retain the actual kind for the native
reveal proof, even if its permitted prefill differs from the reference field. -/
def workflowDestination (p : Program) (wf : String) (k : Kind) (z : ScreenId) : Bool :=
  (p.screen? z).any fun scr => scr.workflow == wf && scr.components.any fun c =>
    controlFits k c.kind && contextShownAux scr.components (contextLayout scr.components c)
      (scr.components.length + 1) c

/-- New specification for owner review. Ordered, same-workflow endpoints, each
within the release navigation bound of the preceding control. -/
def workflowPath (sp : Spec) (p : Program) (wf : String) (service : Bool)
    (start : ScreenId) : List Kind → Bool
  | [] => true
  | k :: ks =>
    ((bfs p (clinicalEdges p service) start).any fun row =>
      decide (row.2.length ≤ sp.design.maxDepth) && workflowDestination p wf k row.1 &&
      workflowPath sp p wf service row.1 ks)

/-- New specification for owner review. Use the release's declared ServiceRequest
elements (including optional priority); the request button precedes human authorization. -/
def serviceControls (sp : Spec) : List Kind :=
  ((Specs.V2.serviceElements.filter fun el => (sp.element? el.id).isSome && el.id != priorAuthElement).map fun el => .field el.id .current .none) ++
    [.button .requestPriorAuth, .field priorAuthElement .current .none] ++
    (if (sp.info? Specs.V2.priorAuthStatus.id).isSome then [.priorAuth Specs.V2.priorAuthStatus.id] else [])

/-- New specification for owner review. A partial service or authorization surface
opts into the service bundle when the release declares its two discriminators. -/
def serviceOptIn (sp : Spec) (scr : Screen) : Bool :=
  (sp.element? "orderKind").isSome && (sp.element? "orderCode").isSome &&
  (sp.element? priorAuthElement).isSome && (serviceOrderScreen scr || scr.components.any fun c =>
    c.kind == .button .requestPriorAuth || (fieldOf? c.kind).any (fun f => f.1 == priorAuthElement))

/-- New specification for owner review. Hydration prefers chartSummary. Without
it a selected directory row opens its clinical target; the preselected runtime starts at home. -/
def chartEntries (p : Program) : List ScreenId :=
  if p.patientSelection? != some true then [p.start]
  else if (p.screen? "chartSummary").isSome then ["chartSummary"]
  else (["edTrackBoard", "shiftWorklist", "orSchedule", "consultList", "inboxResults",
    "inboxRxRequests", "scheduleTasks"].filterMap (Workspace.target p)).eraseDups

/-- New specification for owner review. Check the surface itself and the initial
approach, including both screens prefilled during chart hydration. -/
def serviceBundle (sp : Spec) (p : Program) (scr : Screen) : Bool :=
  !serviceOptIn sp scr || (scr.id :: p.start :: chartEntries p).eraseDups.all
      fun a => (p.compsOf a).all drugNeutral && workflowPath sp p scr.workflow true a (serviceControls sp)

/-- New specification for owner review. At a selectable chart's medication commit
the allergy list is pinned and the workflow has a human identity or scan field. -/
def identityReview (sp : Spec) (p : Program) (scr : Screen) : Bool :=
  p.patientSelection? != some true || [("signOrders", "patientIdReentry"), ("administerMed", "wristbandScan")].all fun (cm, e) =>
    let slots := ((allComps p).filterMap fun (_, c) => do
      let (id, slot, _) ← fieldOf? c.kind
      if id == e then some slot else none).eraseDups
    !scr.components.any (fun c => commitOf? c.kind == some cm) ||
      (scr.components.any (fun c => showsInfo "allergyList" c.kind && fixedShown scr.components c) &&
        slots.any fun slot =>
          workflowPath sp p scr.workflow false scr.id [.field e slot .none] &&
          (chartEntries p).all fun a => workflowPath sp p scr.workflow false a
            [.field e slot .none, .button (.commit cm)])

/-- New specification for owner review. The interpreter's linked fallback may
read another slot. A line dose must never be supplied by that fallback. -/
def independentDose (c : Component) : Bool :=
  match c.kind with
  | .field e _ (.linked _) => e != doseElement
  | _ => true

/-- New specification for owner review. A medication-dose workflow supports a
new current line, its own drug selection and correction of its own dose. -/
def medicationLines (sp : Spec) (p : Program) (scr : Screen) : Bool :=
  !(sp.element? doseElement).any (fun e => e.kind == .medicationDose) ||
    (scr.components.all independentDose &&
    (!scr.components.any (fun c => commitOf? c.kind == some "signOrders") ||
    workflowPath sp p scr.workflow false scr.id
      [.field drugElement .current .none, .field doseElement .current .none,
       .button .newOrderLine, .field drugElement .current .none, .field doseElement .current .none]))

/-- New specification for owner review. Each clinical critical-result display
leads back to its release-defined result action in that workflow. The urgent
strip separately supplies ticket-specific receipt and follow-up controls. -/
def criticalFollowThrough (sp : Spec) (p : Program) (scr : Screen) : Bool :=
  sp.alerts.all fun a => a.cond != .criticalResult ||
    !scr.components.any (fun c => (alertOf? c.kind).any fun pair => pair.1 == a.id) ||
    workflowPath sp p scr.workflow false scr.id [.button (.commit a.commit)]

end Ehr.Check
