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

/-- The shape of the review screen with an empty table and a blocked Sign:
the banner, the title, the navigation wrapper, the table caption with its
"no records" part, and Sign with its blocked reason. -/
def reviewShape : ScreenShape := screenShape (reviewScreen [] [] false none)

def reviewCandidate : Candidate := ⟨reviewShape,fun v => compileShape v reviewShape⟩
def reviewFamily : Family := [reviewCandidate]

/-- New specification for owner review (changed statement). The shape does not
depend on the banner fields or on the blocked reason: the banner is one part
whatever it lists, and a blocked Sign always has a reason part.

It was stated for every table and for an enabled Sign as well. Table cells
and the blocked reason are now occurrences of their own, so a table with rows
and an enabled Sign have other shapes; `Parts.layoutAccepted_reviewAllPayloads_shell`
covers every payload through the fixed shell. -/
theorem review_shape_payload_independent (banner reason) :
    screenShape (reviewScreen banner [] false reason) = reviewShape := by
  simp [reviewShape, screenShape, reviewScreen, screenNodes, chromeEntries, screenRoots, navNode, prefixChildren,
    partEntries, semanticNodes, leafParts, infoParts, buttonParts, optionList, ownPart, bannerPart, Part.lines]

set_option maxRecDepth 100000 in
set_option maxHeartbeats 4000000 in
set_option cbv.maxSteps 1000000 in
theorem reviewFamily_accepted : acceptFamily reviewFamily = true := by decide_cbv

/-- New specification for owner review (changed statement). No source bound,
font-coverage assumption, structural-coverage premise or per-screen acceptance
premise. All supported viewports, all banner fields and every blocked reason
of this concrete semantic family; G1-G9, original text and lossless vertical
wrapping.

It was stated for every table and for an enabled Sign as well. A finite
family paints a fixed number of boxes and rule G7 wants one box per
occurrence, so it cannot cover tables of every size now that each cell is an
occurrence. `Parts.layoutAccepted_reviewAllPayloads_shell` proves the same
conclusion for every payload with the fixed shell as the painter. -/
theorem layoutAccepted_reviewAllPayloads
    (banner : List (String × String)) (reason : Option String) (v : Size) (hv : v ∈ viewports) :
    ∃ painted, familyPaint reviewFamily (reviewScreen banner [] false reason) v = some painted ∧
      Realizes (reviewScreen banner [] false reason) v painted := by
  apply layoutAccepted_allScreens reviewFamily reviewFamily_accepted _ _ v hv
  exact ⟨reviewCandidate,by simp [reviewFamily],(review_shape_payload_independent banner reason).symm⟩

#print axioms review_shape_payload_independent
#print axioms reviewFamily_accepted
#print axioms layoutAccepted_reviewAllPayloads
end Ehr.Layout
