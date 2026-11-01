import Lean.Data.Json
import Ehr.Core.Json
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

deriving instance Lean.ToJson, Lean.FromJson for Tag, PageAttr, PageNode, UiNode, UiScreen

deriving instance Lean.ToJson, Lean.FromJson for
  BannerInfo, AllergyRow, MedRow, VitalRow, TrendPoint, LabRow, ProblemRow, ImmRow,
  EncRow, ProcRow, GrowthPoint, Display

deriving instance Lean.ToJson, Lean.FromJson for RenderInput, FactsContext, FactsOutput

end Ehr.Render
