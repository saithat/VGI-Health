import Ehr.Sim.Policy

/-!
Explicit assistance boundary, separate from the bounded clinician's knowledge.
A colleague/help index knows the deployed layout; the clinician receives one
route only after paying for a help request, never an initial program map.
The default provider reuses the expert's navigation solver. It supplies ordinary
UI events, not interpreter states, captures, commits, or permission to sign.
This help mechanism and its availability are simulation assumptions.
-/
namespace Ehr.Sim.Discovery
open Ehr

abbrev Guide := Context → State → Option (List Event)

def helpDesk : Guide := planNavigation

/-- Patience per goal: scent first, then equally many systematic steps before
asking. Logarithmic menu-depth proxy; simulation assumption, not fitted data. -/
def patience (prog : Program) : Nat := max 2 (Nat.log2 (prog.screens.length + 1))

/-- A separate hard safety bound scales with actual components and clinical
work, not only screen count. This is a simulation assumption, not a proof of
completion for arbitrary programs or timed obligations. -/
def fuel (ctx : Context) : Nat :=
  32 * (1 + (ctx.prog.screens.flatMap (·.components)).length) *
    (2 + ctx.goals.values.length + ctx.goals.commits.length)

end Ehr.Sim.Discovery
