import Ehr.Canonical.Program
namespace Ehr
/-- Replace one screen, keeping its siblings. -/
def Program.updateScreen (p : Program) (id : ScreenId) (f : Screen → Screen) : Program :=
  { p with screens := p.screens.map fun s => if s.id == id then f s else s }
/-- Replace one component, keeping its siblings. -/
def Screen.updateComp (s : Screen) (id : CompId) (f : Component → Component) : Screen :=
  { s with components := s.components.map fun c => if c.id == id then f c else c }
/-- Remove one component. -/
def Screen.dropComp (s : Screen) (id : CompId) : Screen :=
  { s with components := s.components.filter (·.id != id) }
/-- Insert components after a named sibling. -/
def Screen.insertAfter (s : Screen) (id : CompId) (cs : List Component) : Screen :=
  { s with components := s.components.flatMap fun c => if c.id == id then c :: cs else [c] }
/-- Append a macro to the program. -/
def Program.addMacro (p : Program) (m : Macro) : Program := { p with macros := p.macros ++ [m] }
end Ehr
