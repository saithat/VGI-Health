import Ehr.Check.NavigationSound
import Ehr.Check.Sound

namespace Ehr.Check.Tests
open Ehr Ehr.Check Ehr.Props

/-- Unique screen IDs do not make repeated navigation labels safe. -/
def d5RepeatedLabels : Program :=
  { emptyProgram with screens := [
      { id := "home", title := "Review", workflow := "W1",
        components := [{ id := "banner", kind := .banner }] },
      { id := "other", title := "Review", workflow := "W1",
        components := [{ id := "banner", kind := .banner }] }] }

/-- Thirteen uniquely labeled screens still exceed the per-group limit. -/
def d5TooManyEntries : Program :=
  { emptyProgram with start := "0", screens := (List.range 13).map fun i =>
      { id := toString i, title := toString i, workflow := "W1",
        components := [{ id := "banner", kind := .banner }] } }

#guard !decide (NavigationSane d5RepeatedLabels)
#guard !decide (NavigationSane d5TooManyEntries)
#guard match check emptySpec none d5RepeatedLabels d5RepeatedLabels with
  | .violation property _ _ _ => property == "navigation"
  | _ => false
#guard match check emptySpec none d5TooManyEntries d5TooManyEntries with
  | .violation property _ _ _ => property == "navigation"
  | _ => false
end Ehr.Check.Tests
