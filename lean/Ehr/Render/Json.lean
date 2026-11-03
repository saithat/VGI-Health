import Lean.Data.Json
import Ehr.JsonCompat
import Ehr.Render.Types

/-!
JSON readers and writers for display data and the page tree.
Typed internal nodes become PageNode values before they are sent to the app.
Optional fields follow the same naming rules as Ehr.Core.Json.
-/

namespace Ehr.Render

/-- Bounded nanoseconds retain the numeric wire format; invalid JSON is rejected. -/
instance {n : Nat} : Lean.ToJson (Fin n) where
  toJson value := Lean.toJson value.val

instance {n : Nat} : Lean.FromJson (Fin n) where
  fromJson? json := do
    let value : Nat ← Lean.fromJson? json
    if h : value < n then pure ⟨value, h⟩ else throw "finite number out of bounds"

deriving instance Lean.ToJson, Lean.FromJson for Tag, PageAttr, PageNode,
  UiPresentationKind, UiCodeChoice, UiChartReference, UiSourceDate, UiDateBacking, UiDatedItem, UiBoardDemand, UiCodeChoices, UiPaneMetadata, UiNode, UiScreen

deriving instance Lean.ToJson, Lean.FromJson for
  BannerInfo, AllergyRow, MedRow, VitalRow, TrendPoint, LabRow, LabResultRow, ProblemRow, ImmRow,
  EncRow, ProcRow, GrowthPoint, NoteRow, HistoryRow, ScheduleRow, BoardRow,
  MarOrderRow, AdministrationRow, ObservationRow, ClinicianRow

private def readObservationRow : Lean.Json → Except String ObservationRow := Lean.fromJson?

/-- Older observation rows have no source category; malformed supplied categories still fail. -/
instance (priority := 1100) : Lean.FromJson ObservationRow where
  fromJson? j := readObservationRow (match j.getObjVal? "categories" with
    | .ok _ => j
    | .error _ => match j with
      | .obj _ => j.setObjVal! "categories" (.arr #[])
      | _ => j)

deriving instance Lean.ToJson, Lean.FromJson for Display

/-- Older render fixtures predate the additional display lists; only absent lists default to empty. -/
private def readDisplay : Lean.Json → Except String Display := Lean.fromJson?

instance (priority := 1100) : Lean.FromJson Display where
  fromJson? j := do
    let j := ["notes", "history", "schedule", "board", "marOrders", "administrations",
      "observations", "labFlags", "labResults"].foldl (fun j key =>
      match j.getObjVal? key with
      | .ok _ => j
      | .error _ => match j with
        | .obj _ => j.setObjVal! key (.arr #[])
        | _ => j) j
    readDisplay j

deriving instance Lean.ToJson, Lean.FromJson for RenderInput, FactsContext, FactsOutput

end Ehr.Render
