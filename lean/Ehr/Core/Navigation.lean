import Ehr.Core.Types

namespace Ehr

/-- The pre-set view for each persona. Unknown owners retain the vendor master. -/
def presetWorkflows : String → List String
  | "P1" => ["W1", "W2", "W7"]
  | "P2" => ["W3"]
  | "P3" => ["W4"]
  | "P4" => ["W5", "W2", "W7"]
  | "P5" => ["W1", "W2", "W6"]
  | _ => ["W1", "W2", "W3", "W4", "W5", "W6", "W7"]

/-- Shared patient selection, search and chart review stay in every pre-set view. -/
def presetScreen (owner : String) (screen : Screen) : Bool :=
  !["P1", "P2", "P3", "P4", "P5"].contains owner ||
    ["shell", "chart"].contains screen.workflow || (presetWorkflows owner).contains screen.workflow

/-- Public activity and navigator names. Internal task categories never label the UI. -/
def navigatorNames (s : Screen) : String × String :=
  let stepName := match s.id with
    | "w1Hpi" => "History" | "w1Exam" => "Exam" | "w1Close" | "w5Close" => "Sign Visit"
    | "w3TrackBoard" => "ED Track Board" | "w4Worklist" => "Unit Census & MAR"
    | "w5Rooming" => "Rooming" | "w6Consult" => "Consults" | "w6ConsultClose" => "Sign Consult"
    | _ => s.title
  let activity := match s.workflow with
    | "W1" => "Schedule" | "W2" => "In Basket: Results" | "W3" => "ED Track Board"
    | "W4" => "Unit Census & MAR" | "W5" => "Child Health"
    | "W6" => if ["w6Consult", "w6ConsultClose"].contains s.id then "Consults" else "OR Schedule"
    | "W7" => "In Basket: Rx Requests" | _ => "Chart Review"
  (activity, stepName)

/-- Each activity opens its encounter navigator through an ordinary goto. -/
def presetLandings : String → List (ScreenId × String)
  | "P1" => [("w1Rooming", "Schedule"), ("w2Inbasket", "In Basket: Results"), ("w7Queue", "In Basket: Rx Requests")]
  | "P2" => [("w3TrackBoard", "ED Track Board")]
  | "P3" => [("w4Worklist", "Unit Census & MAR")]
  | "P4" => [("w5Rooming", "Schedule"), ("w2Inbasket", "In Basket: Results"), ("w7Queue", "In Basket: Rx Requests")]
  | "P5" => [("w6PreOp", "OR Schedule"), ("w1Rooming", "Consults"), ("w2Inbasket", "In Basket: Results")]
  | _ => []

end Ehr
