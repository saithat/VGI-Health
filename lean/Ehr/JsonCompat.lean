import Ehr.Core.Json

/-! Backward-compatible JSON defaults for display-only history versions.
The derived readers do not apply Lean structure defaults. Keep the old readers
and supply only absent keys; malformed supplied values still fail decoding.
No historical program, facts file or certificate needs rewriting. -/
namespace Ehr
open Lean

private def defaultVersion (j : Json) (key : String) : Json :=
  match j.getObjVal? key with
  | .ok _ => j
  | .error _ => match j with
    | .obj _ => j.setObjVal! key (toJson (0 : Nat))
    | _ => j

def historyVersionDefaults (j : Json) : Json :=
  defaultVersion (defaultVersion j "notesVersion") "historyVersion"

private def envelopeDefaults (j : Json) : Json :=
  match j.getObjVal? "facts" with
  | .ok f => j.setObjVal! "facts" (historyVersionDefaults f)
  | .error _ => j

private def readFacts : Json → Except String Facts := fromJson?
private def readInit : Json → Except String InitInput := fromJson?
private def readStep : Json → Except String StepInput := fromJson?
private def readView : Json → Except String ViewInput := fromJson?
private def readBatch : Json → Except String BatchCase := fromJson?

instance (priority := 1100) : FromJson Facts where
  fromJson? j := readFacts (historyVersionDefaults j)
instance (priority := 1100) : FromJson InitInput where
  fromJson? j := readInit (envelopeDefaults j)
instance (priority := 1100) : FromJson StepInput where
  fromJson? j := readStep (envelopeDefaults j)
instance (priority := 1100) : FromJson ViewInput where
  fromJson? j := readView (envelopeDefaults j)
instance (priority := 1100) : FromJson BatchCase where
  fromJson? j := readBatch (envelopeDefaults j)

end Ehr
