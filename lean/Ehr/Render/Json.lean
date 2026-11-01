import Lean.Data.Json
import Ehr.JsonCompat
import Ehr.Render.Types

/-!
# JSON for the page tree and the display

Derived `ToJson`/`FromJson` (same conventions as `Ehr.Core.Json`):
- a constructor without arguments is a string (`"div"`);
- `PageNode.text s` is `{"text": {"s": s}}`; `PageNode.node` is
  `{"node": {"tag", "attrs", "children"}}`;
- an attribute is `{"name": …, "value": …}`;
- an `Option` field named `foo?` is written as `foo` and left out when `none`.

The typed tree (`Html`, `Attr`, `Cls`) is not sent; it is converted to the
wire form (`Html.toPage`) first.
-/

namespace Ehr.Render

deriving instance Lean.ToJson, Lean.FromJson for Tag, PageAttr, PageNode,
  UiPresentationKind, UiCodeChoice, UiChartReference, UiNode, UiScreen

deriving instance Lean.ToJson, Lean.FromJson for
  BannerInfo, AllergyRow, MedRow, VitalRow, TrendPoint, LabRow, LabResultRow, ProblemRow, ImmRow,
  EncRow, ProcRow, GrowthPoint, NoteRow, HistoryRow, ScheduleRow, BoardRow,
  MarOrderRow, AdministrationRow, ObservationRow

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
