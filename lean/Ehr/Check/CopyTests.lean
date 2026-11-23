import Ehr.Check.CopySound
import Ehr.Canonical.Personas
import Ehr.Core.Json
import Ehr.Props.Examples

/-! R3 (copy budget) regressions. New specification for owner review. -/
namespace Ehr.Check.CopyTests
open Ehr Ehr.Check Ehr.Props Ehr.Examples.Tiny Ehr.Props.Examples

def propertyOf : Verdict → Option String
  | .ok => none
  | .violation property _ _ _ => some property

/-- A shortcut copy of the order screen's "Review and sign" button. -/
def signCopy (id : CompId) (tag : String := id) : Component :=
  { id, kind := .button (.goto "sign"), label := "Review and sign", tag, copyOf? := some "toSign" }

def withCopies (p : Program) (copies : List (ScreenId × Component)) : Program :=
  { p with screens := p.screens.map fun s =>
      { s with components := s.components ++ (copies.filter (·.1 == s.id)).map (·.2) } }

/-- One copy on each of two screens: within the default budget of 2. -/
def twoCopies : Program := withCopies goodProgram [("rooming", signCopy "copyA"), ("sign", signCopy "copyB")]
/-- Three copies of one tag across three screens. -/
def sprayed : Program := withCopies twoCopies [("order", signCopy "copyC")]
/-- Two copies of one tag on the same screen. -/
def doubled : Program := withCopies goodProgram [("rooming", signCopy "copyA"), ("rooming", signCopy "copyB")]
/-- Renaming the copies' own tags does not open a new budget. -/
def renamed : Program := withCopies goodProgram
  [("rooming", signCopy "copyA" "shortcut1"), ("order", signCopy "copyB" "shortcut2"), ("sign", signCopy "copyC" "shortcut3")]

#guard copyTag goodProgram (signCopy "x" "anything") == some "toSign"
#guard copyTag goodProgram { signCopy "x" with copyOf? := some "missing" } == some "missing"
#guard copyTag goodProgram (goodProgram.screens.head!.components.head!) == none
#guard programCopies sprayed "toSign" == 3
#guard decide (CopyBudgetChecked spec twoCopies)
#guard !decide (CopyBudgetChecked spec sprayed)
#guard !decide (CopyBudgetChecked spec doubled)
#guard !decide (CopyBudgetChecked spec renamed)
#guard decide (CopyBudgetChecked { spec with design := { spec.design with copyBudget := 3 } } sprayed)
#guard propertyOf (check spec none goodProgram twoCopies) == none
#guard propertyOf (check spec none goodProgram sprayed) == some "copyBudget"
#guard propertyOf (check spec none goodProgram doubled) == some "copyBudget"
#guard propertyOf (check spec none goodProgram renamed) == some "copyBudget"

-- Movement is unrestricted, including added copies with a previous program.
#guard propertyOf (check { spec with design := { spec.design with stabilityBudget := 0 } }
  (some goodProgram) goodProgram twoCopies) == none

/-- An expanded container changes every retained control's parent without
changing required visibility, workflow routes or copy counts. -/
def regrouped : Program :=
  { goodProgram with screens := goodProgram.screens.map fun scr =>
      { scr with components :=
          { id := scr.id ++ ".controls", kind := .group false false, label := "Controls" } ::
          scr.components.map (fun c => { c with parent? := some (scr.id ++ ".controls") }) } }
#guard propertyOf (check { spec with design := { spec.design with stabilityBudget := 0 } }
  (some goodProgram) goodProgram regrouped) == none

-- Spec JSON keeps legacy bytes at the defaults and round-trips other values.
#guard (Lean.toJson spec.design).getObjVal? "copyBudget" |>.toOption |>.isNone
#guard (Lean.toJson spec.design).getObjVal? "maxTargetsPerViewport" |>.toOption |>.isNone
def configured : DesignRules := { spec.design with copyBudget := 4, maxTargetsPerViewport := 20 }
#guard ((Lean.fromJson? (Lean.toJson configured) : Except String DesignRules).toOption.map (·.copyBudget)) == some 4
#guard ((Lean.fromJson? (Lean.toJson configured) : Except String DesignRules).toOption.map (·.maxTargetsPerViewport)) == some 20
#guard (Lean.fromJson? ((Lean.toJson configured).setObjVal! "copyBudget" (.str "invalid")) : Except String DesignRules).isOk == false
#guard spec.design.copyBudget == 2 && spec.design.maxTargetsPerViewport == 15

/-- The canonical copy spray (bad-program suite entry 41) fails R3. -/
def canonicalSpray : Program :=
  let base := Canonical.forPersona Specs.V1.specV1 Canonical.canonicalV1 "P1" .physician
  withCopies base ((["w1Rooming", "w1MedRec", "w1Hpi"]).map fun s =>
    (s, { id := s ++ ".sprayToSign", kind := .button (.goto "w1Verify"), label := "Review and sign",
          tag := s ++ ".sprayToSign", copyOf? := some "w1Orders.toSign" }))
#guard propertyOf (check Specs.V1.specV1 none Canonical.canonicalV1 canonicalSpray) == some "copyBudget"

end Ehr.Check.CopyTests
