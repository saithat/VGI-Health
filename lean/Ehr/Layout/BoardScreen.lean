import Ehr.Layout.Semantic

namespace Ehr.Layout
open Lean Ehr.Render

/-- New specification for owner review: a host-owned live session and its
ordinary Lean screen. The host dispatches only through this patient's session. -/
structure PatientScreen where
  patient : String
  screen : UiScreen
  deriving FromJson

/-- New specification for owner review: combine ordinary live screens without
changing their controls, labels or patient binding. The urgent rail and pane
metadata retain all of the original urgent strip. -/
def boardScreen (panes : List PatientScreen) : UiScreen :=
  {banner := panes.map (fun p => ("Patient", (p.screen.banner.lookup "Patient").getD p.patient ++
      (match p.screen.banner.lookup "MRN" with | some mrn => " · MRN " ++ mrn | none => ""))),
   viewer? := (panes.head?).bind (·.screen.viewer?),
   title := "Patient board", nav := [], side := [], modal := none,
   screen? := some "patient-board", workspace := [.board
     (panes.flatMap fun p => (p.screen.urgent?.getD []).filterMap fun n => match n with
       | .alert _ id label severity => some ⟨p.patient,p.screen.banner,id,label,severity⟩
       | _ => none)
     (panes.map fun p => .patientPane p.patient p.screen.banner
       {fieldChoices := p.screen.fieldChoices?.getD [],fieldSources := p.screen.fieldSources?.getD [],
        sourceLabels := p.screen.sourceLabels?.getD [],entryHints := p.screen.entryHints?.getD [],
        urgent? := p.screen.urgent?.map (fun ns => ns.filterMap stripAtom?)}
       (p.screen.workspace ++ p.screen.side ++ [navNode p.screen.nav]) p.screen.modal.toList)]}
end Ehr.Layout
