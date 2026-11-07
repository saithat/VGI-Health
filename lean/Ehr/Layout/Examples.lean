import Ehr.Layout.Family
namespace Ehr.Layout
open Ehr.Render

/-- A closed, non-vacuous semantic family: arbitrary patient-banner fields and
an arbitrarily long review table, plus an enabled or blocked current-task Sign.
This fixture is not a claim that the deployed EHR renderer always has this shape. -/
def reviewScreen (banner : List (String × String)) (rows : List (List (String × String)))
    (enabled : Bool) (reason : Option String) : UiScreen :=
  { banner, nav := [], title := "Review orders", side := [], modal := none,
    workspace := [.info "review" "Required review" "orders" "table" rows,
      .button "sign" "Sign" "primary" enabled reason none] }

def reviewShape : ScreenShape := screenShape (reviewScreen [] [] false none)

def reviewCandidate : Candidate := ⟨reviewShape,fun v => compileShape v reviewShape⟩
def reviewFamily : Family := [reviewCandidate]

theorem review_shape_payload_independent (banner rows enabled reason) :
    screenShape (reviewScreen banner rows enabled reason) = reviewShape := by
  simp [reviewShape, screenShape, reviewScreen, screenNodes, prefixChildren, semanticNodes, semanticTarget, semanticCommit]

set_option maxRecDepth 100000 in
set_option maxHeartbeats 4000000 in
set_option cbv.maxSteps 1000000 in
theorem reviewFamily_accepted : acceptFamily reviewFamily = true := by decide_cbv

/-- No source bound, font-coverage assumption, structural-coverage premise or
per-screen acceptance premise. All supported viewports and all payloads of this
concrete semantic family; G1-G9, original text and lossless vertical wrapping. -/
theorem layoutAccepted_reviewAllPayloads
    (banner : List (String × String)) (rows : List (List (String × String)))
    (enabled : Bool) (reason : Option String) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, familyPaint reviewFamily (reviewScreen banner rows enabled reason) v = some painted ∧
      Realizes (reviewScreen banner rows enabled reason) v painted := by
  apply layoutAccepted_allScreens reviewFamily reviewFamily_accepted _ _ v hv
  exact ⟨reviewCandidate,by simp [reviewFamily],(review_shape_payload_independent banner rows enabled reason).symm⟩

#print axioms review_shape_payload_independent
#print axioms reviewFamily_accepted
#print axioms layoutAccepted_reviewAllPayloads
end Ehr.Layout
