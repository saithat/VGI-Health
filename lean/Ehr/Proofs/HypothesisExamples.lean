import Ehr.Proofs.T0
import Ehr.Proofs.T2
import Ehr.Proofs.Alerts
import Ehr.Proofs.CheckDeploy
import Ehr.Render.UiTests

/-! Concrete applications of every formerly partial/missing main-theorem
hypothesis witness in docs/VERIFICATION.md §4. Each application supplies all
premises; render-owned files are left to their owning lane. -/
namespace Ehr.Proofs.HypothesisExamples
open Ehr Ehr.Props Ehr.Check Ehr.Examples.Tiny Ehr.Examples.TinyTests Ehr.Render

/-- A real high-alert order with a second human signer, just before commit. -/
def signedWarfarin : State := run atSignWarfarin [.enter "cosignField" (.user "u2")]

/-- The tiny spec's applicable, whole-episode cosign requirement. -/
def cosignReq : EntryReq :=
  { commit := "signOrders", element := "cosigner", when := .highAlertMed }

/-- The cosigner declaration is taken from the canonical Tiny spec itself. -/
def cosignElement : ElementSpec := spec.elements[4]!

/-- All premises of T3 are met on a high-alert commit; the theorem supplies
its human-entered, distinct second user. -/
theorem cosign_distinct_instance :
    ∃ x ∈ signedWarfarin.captured, x.element = "cosigner" ∧ x.byHuman = true ∧
      ∃ u, x.value = .user u ∧ u ≠ user.id :=
  T3_cosign_distinct spec program facts user .human signedWarfarin (.click "signButton") "signOrders"
    (by decide) (by decide) cosignReq (by decide) rfl rfl (by decide)
    cosignElement (by decide) (by decide)

/-- Tiny's allergy review permits a timely receipt from a clinical role. -/
def allergyReview : ReviewReq :=
  { commit := "signOrders", info := "allergyList", mode := .shownOrReceipt 720 [.physician, .np, .rn] }

/-- A hidden allergy review at a real commit is covered by a current receipt;
all membership, applicability and commit-equality premises are supplied. -/
theorem receipt_sound_instance :
    ValidReceiptFor spec (factsWithReceipt 3) (atSignWith (factsWithReceipt 3)) allergyReview ∨
      HumanWaiverFor (atSignWith (factsWithReceipt 3)) allergyReview :=
  T2_receipts_sound spec program (factsWithReceipt 3) user .human (atSignWith (factsWithReceipt 3))
    (.click "signButton") "signOrders" (by decide) (by decide)
    allergyReview (by decide) rfl (by decide) (by decide)

/-- Tiny's dose-check review forbids a receipt or waiver. -/
def doseReview : ReviewReq :=
  { commit := "signOrders", info := "doseCheck", mode := .shownOnCommit }

/-- A committing state and an actual shown-only review meet every premise
of T2's no-receipt theorem. -/
theorem shown_review_instance : infoShown spec program facts atSignTab "doseCheck" = true :=
  T2_shownOnCommit_shown spec program facts user .human atSignTab (.click "signButton") "signOrders"
    (by decide) (by decide) doseReview (by decide) rfl (by decide) rfl rfl

/-- The actual care-gap item on Tiny's order screen. -/
def careGapItem : ItemView := itemView spec facts atOrder (program.compsOf atOrder.screen)
  { id := "careGapAlert", kind := .alert "careGap" false, label := "Care gap", tag := "careGap" }

/-- A shown alert's membership, visibility and exact kind all hold, so A2
proves that its condition holds. -/
theorem shown_alert_instance : alertHolds spec facts atOrder "careGap" = true :=
  A2_view_shown spec program facts user atOrder careGapItem (by decide) (by decide) "careGap" false rfl

/-- A4 applies to a real step that opens an interruptive allergy popup;
the preceding state has no popup and satisfies the invariant. -/
theorem popup_step_instance :
    PopupNotPassive spec (step spec program facts user .human atSignAmox (.click "signButton")).1 :=
  A4_step spec program facts user .human atSignAmox (.click "signButton") (by
    intro a k hp
    have clear : atSignAmox.popup? = none := by decide
    rw [clear] at hp
    cases hp)

/-- The popup step is nonvacuous: its post-state actually has a popup. -/
theorem popup_step_opens :
    (step spec program facts user .human atSignAmox (.click "signButton")).1.popup? =
      some ("drugAllergy", "amoxicillin@3") := by decide

/-- D3's screen-presence premise holds for one concrete primary Sign button. -/
theorem sign_button_present :
    UiPresent (renderUi uiSignCtx.sp uiSignCtx.prog uiSignCtx.facts uiSignCtx.disp uiSignCtx.user uiSignCtx.s)
      (uiButton uiSignCtx uiSignItem "primary") := by
  apply T10_ui_shown uiSignCtx uiSignItem (by decide) (by decide)
  have kind : uiSignItem.comp.kind = .button (.commit "signOrders") := rfl
  simp [uiItem, kind, actionRole, uiButton, uiAtoms]

/-- D3 is applied to the concrete primary button with its presence discharged. -/
theorem sign_button_honest_instance : UiActionHonest uiSignCtx (uiButton uiSignCtx uiSignItem "primary") :=
  D3_honest_actions uiSignCtx _ sign_button_present

/-- The all-buttons form of D3 also has every premise discharged on Sign. -/
theorem all_buttons_instance : UiActionHonest uiSignCtx (uiButton uiSignCtx uiSignItem "primary") :=
  D3_all_buttons uiSignCtx _ (Or.inl sign_button_present)

/-- A real pending weight field supplies the field-presence premise of D6. -/
theorem weight_field_present : UiPresent uiScreenTest
    (.field "weightField" "Weight" "qty" (some "20.0") (some "kg")
      (some "record:weightToday") true false true) :=
  (D6_clear_fields uiRoomCtx uiWeightItem "weight" (.fixed 0) (.fromRecord "weightToday")
    (by decide) (by decide) rfl).1

/-- D6 directly proves a present clinical field has a nonempty label. -/
theorem weight_label_instance : ("Weight" : String) ≠ "" :=
  D6_field_labels uiRoomCtx "weightField" "Weight" "qty" (some "20.0") (some "kg")
    (some "record:weightToday") true false true weight_field_present

/-- The actual current-certificate write for the accepted canonical Tiny program. -/
def currentCertificate : FileWrite :=
  { target := .currentCert, content := (Lean.toJson (certificate spec Props.Examples.goodProgram .ok "t")).pretty }

/-- Acceptance really places that concrete certificate in the write plan. -/
theorem current_certificate_planned : currentCertificate ∈
    (deployPlan spec none Props.Examples.goodProgram Props.Examples.goodProgram "t").2 := by
  have accepted : check spec none Props.Examples.goodProgram Props.Examples.goodProgram = .ok := by decide
  simp [deployPlan, accepted, currentCertificate]

/-- The T4 publish theorem applies to an actual current-certificate write. -/
theorem publish_ok_instance : check spec none Props.Examples.goodProgram Props.Examples.goodProgram = .ok :=
  T4_publish_only_if_ok spec none Props.Examples.goodProgram Props.Examples.goodProgram "t"
    currentCertificate current_certificate_planned rfl

/-- T4 binds a real published certificate to the precise spec, program and verdict;
both the write-membership and currentCert premises are discharged. -/
theorem published_certificate_instance : currentCertificate.content =
    (Lean.toJson (certificate spec Props.Examples.goodProgram .ok "t")).pretty :=
  T4_published_certificate spec none Props.Examples.goodProgram Props.Examples.goodProgram "t"
    currentCertificate current_certificate_planned rfl

/-- A rejected Tiny proposal still records its version, without publishing it. -/
def rejectedVersion : FileWrite :=
  { target := .version program.version, content := (Lean.toJson program).pretty }

/-- All premises of T4's rejection form hold on a concrete recorded version. -/
theorem rejected_not_published_instance : rejectedVersion.target.publishes = false := by
  have rejected : check spec none Props.Examples.goodProgram program ≠ .ok := by decide
  apply T4_rejected_not_published spec none Props.Examples.goodProgram program "t" rejected rejectedVersion
  simp [deployPlan, rejected, rejectedVersion, beq_iff_eq]

end Ehr.Proofs.HypothesisExamples
