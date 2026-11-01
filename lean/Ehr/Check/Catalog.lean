import Ehr.Check.Check
import Ehr.Examples.Tiny

namespace Ehr.Check
open Ehr Ehr.Props

/-- The checker uses the interpreter's catalog, including the prior-auth action. -/
theorem inCatalog_iff (spec : Spec) (prog : Program) :
    prog.inCatalog spec = true ↔ CatalogOnly spec prog := by
  simp only [Program.inCatalog, Program.catalogTags, CatalogOnly, allComps, kindName,
    List.all_eq_true, List.mem_flatMap, List.mem_map, List.contains_iff_mem]
  constructor
  · intro h sc hsc
    obtain ⟨scr, hs, comp, hc, rfl⟩ := hsc
    exact h comp.kind.catalogTag ⟨scr, hs, comp, hc, rfl⟩
  · intro h tag ht
    obtain ⟨scr, hs, comp, hc, rfl⟩ := ht
    exact h (scr, comp) ⟨scr, hs, comp, hc, rfl⟩

-- Both the new panel and the request action need the v1.1 catalog tag.
#guard !(Examples.Tiny.programV1_1.inCatalog Examples.Tiny.spec)
#guard Examples.Tiny.programV1_1.inCatalog Examples.Tiny.specV1_1
#print axioms inCatalog_iff
end Ehr.Check
