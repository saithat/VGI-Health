import Ehr.Core.Types

/-!
Role presets choose workflow access, landing screens and public labels.
Shared patient search and chart review remain available in every preset.
-/

namespace Ehr

/-- The pre-set view for each persona. Unknown owners retain the vendor reference. -/
def presetWorkflows : String → List String
  | "P1" => ["W1", "W2", "W7"]
  | "P2" => ["W3"]
  | "P3" => ["W4"]
  | "P4" => ["W5", "W2", "W7"]
  | "P5" => ["W6", "W1", "W2"]
  | _ => ["W1", "W2", "W3", "W4", "W5", "W6", "W7"]

/-- Agent forks keep the stable persona ID while their owner may be a user UUID. -/
def Program.presetOwner (p : Program) : String :=
  if ["P1", "P2", "P3", "P4", "P5"].contains p.id then p.id else p.owner

/-- Shared patient selection, search and chart review stay in every pre-set view. -/
def presetScreen (owner : String) (screen : Screen) : Bool :=
  !["P1", "P2", "P3", "P4", "P5"].contains owner ||
    ["shell", "chart"].contains screen.workflow || (presetWorkflows owner).contains screen.workflow

/-- Public activity and workflow names. Internal task categories never label the UI. -/
def workflowNames (s : Screen) : String × String :=
  let stepName := match s.id with
    | "w1Hpi" => "History / ROS" | "w1Exam" => "Exam / Assessment & Plan" | "w1Close" | "w5Close" => "Sign Visit"
    | "w3TrackBoard" => "ED Track Board" | "w4Worklist" => "Unit Census & MAR"
    | "w5Rooming" => "Rooming" | "w6Consults" => "Consults"
    | "w6Consult" => "Consult note" | "w6ConsultClose" => "Sign Consult"
    | _ => s.title
  let activity := match s.workflow with
    | "W1" => "Schedule" | "W2" => "Inbox: Results" | "W3" => "ED Track Board"
    | "W4" => "Unit Census & MAR" | "W5" => "Schedule"
    | "W6" => if ["w6Consults", "w6Consult", "w6ConsultClose"].contains s.id then "Consults" else "OR Schedule"
    | "W7" => "Inbox: Rx Requests" | _ => "Chart History"
  (activity, stepName)

/-- Each activity opens its encounter workflow through an ordinary goto. -/
def presetLandings : String → List (ScreenId × String)
  | "P1" => [("w1Rooming", "Schedule"), ("w2Inbox", "Inbox: Results"), ("w7Queue", "Inbox: Rx Requests")]
  | "P2" => [("w3TrackBoard", "ED Track Board")]
  | "P3" => [("w4Worklist", "Unit Census & MAR")]
  | "P4" => [("w5Rooming", "Schedule"), ("w2Inbox", "Inbox: Results"), ("w7Queue", "Inbox: Rx Requests")]
  | "P5" => [("w6Schedule", "OR Schedule"), ("w6Consults", "Consults"),
             ("w1Rooming", "Clinic Schedule"), ("w2Inbox", "Inbox: Results")]
  | _ => []

/-- ED and ward clinicians sign in to their department activity. Existing
custom start screens and the other role presets keep their declared start. -/
def presetStart (owner : String) (fallback : ScreenId) : ScreenId :=
  if fallback != "home" then fallback else match owner with
  | "P2" => "w3TrackBoard"
  | "P3" => "w4Worklist"
  | _ => fallback

/-- A schedule row opens its encounter; Schedule remains the activity's name. -/
def presetLandingControlLabel (owner target activity : String) : String :=
  if ["P1", "P4"].contains owner && ["w1Rooming", "w5Rooming"].contains target
  then "Open encounter" else activity


end Ehr
