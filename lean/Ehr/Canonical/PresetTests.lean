import Ehr.Canonical.Personas
import Ehr.Render.Ui

namespace Ehr.Canonical
/-- Clinical categories stay internal; visible text uses activity/navigator names. -/
def presetLabelValid (label : String) : Bool :=
  !["Clinic visit", "Outpatient visit", "Inpatient MAR", "Pediatric visit",
    "Surgical day", "Surgery:", "Workflows"].any (fun name => (label.splitOn name).length > 1) &&
    label != "Emergency"

def presetLabelsValid (p : Program) : Bool :=
  p.screens.all (fun s => presetLabelValid s.title && s.components.all (fun c => presetLabelValid c.label)) &&
    p.macros.all (fun m => presetLabelValid m.label) &&
    (Render.uiOverviewNav p).all (fun g => presetLabelValid g.1 && g.2.all (fun e => presetLabelValid e.2))

#guard [(Specs.V1.specV1, canonicalV1), (Specs.V2.specV2, canonicalV2),
  (Specs.V3.specV3, canonicalV3)].all fun (sp, vendorReference) => personaRoles.all fun (id, role) =>
    let p := forPersona sp vendorReference id role
    presetLabelsValid p && p.screens.all (presetScreen id) && p.screens.length < vendorReference.screens.length &&
      (presetLandings id).all (fun (target, label) => (p.screen? "home").any (fun home =>
        home.components.any (fun c => c.kind == .button (.goto target) &&
          c.label == presetLandingControlLabel id target label)))
#guard (personaRoles.map fun (id,role) => (forPersona Specs.V1.specV1 canonicalV1 id role).screens.length) == [18,10,8,16,26]

#guard (personaRoles.map fun (id,role) => (forPersona Specs.V1.specV1 canonicalV1 id role).start) ==
  ["home", "w3TrackBoard", "w4Worklist", "home", "home"]
#guard presetStart "P2" "customStart" == "customStart"

end Ehr.Canonical
