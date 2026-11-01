import Ehr.Check.Check

namespace Ehr.Check
open Ehr Ehr.Props

/-- A sequence of human events, each accepted by the real interpreter. -/
inductive OkRun (sp : Spec) (p : Program) (f : Facts) (u : User) :
    State → List Event → State → Prop
  | nil (s) : OkRun sp p f u s [] s
  | cons {s t z e es} : step sp p f u .human s e = (t, .ok) →
      OkRun sp p f u t es z → OkRun sp p f u s (e :: es) z

/-- All events before an optional final click were accepted. The final click
is evaluated by `step` too; it may intentionally show a blocked commit. -/
def ValidCounterexample (sp : Spec) (p : Program) (es : List Event) : Prop :=
  ∃ pre s tail, es = pre ++ tail ∧
    OkRun sp p replayFacts (replayUser p) (init sp p replayFacts (replayUser p)) pre s ∧
    (tail = [] ∨ ∃ cid, tail = [.click cid])

end Ehr.Check
