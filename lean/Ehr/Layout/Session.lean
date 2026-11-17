import Ehr.Layout.Semantic

/-! # Host session actions

New specifications for owner review. A signed-in clinical page offers the
clinician a way to end the identity session. It is a painted target like any
other, so it is a Lean occurrence: one navigation link in its own group, placed
by the fixed shell and the dense reference like every navigation link, sized
and separated by the layout rules and counted by the density rule G10. Signing
out is not a clinical event: the host handles the link's click itself and the
interpreter never receives it. The clinical screen, its journal and its
fingerprints are the screen without the group (`withSession` is applied only
for layout and painting). -/
namespace Ehr.Layout
open Ehr.Render

/-- New specification for owner review: the component of the sign-out link. -/
def signOutComp : String := "session.signOut"

/-- New specification for owner review: the session navigation group. -/
def sessionGroup : String × List (String × String) := ("Session", [(signOutComp, "Sign out")])

/-- New specification for owner review: a screen with the session group after
its own navigation. Nothing else changes. -/
def withSession (screen : UiScreen) : UiScreen :=
  { screen with nav := screen.nav ++ [sessionGroup] }

theorem withSession_nav (screen : UiScreen) :
    (withSession screen).nav = screen.nav ++ [sessionGroup] := rfl

/-- New specification for owner review: the session group changes only the
navigation; banner, title, workspace, side nodes, modal and urgent strip stay. -/
theorem withSession_keeps (screen : UiScreen) :
    (withSession screen).banner = screen.banner ∧ (withSession screen).title = screen.title ∧
    (withSession screen).workspace = screen.workspace ∧ (withSession screen).side = screen.side ∧
    (withSession screen).modal = screen.modal ∧ (withSession screen).urgent? = screen.urgent? :=
  ⟨rfl,rfl,rfl,rfl,rfl,rfl⟩

private def sessionExample : UiScreen :=
  { banner := [("Patient","Ada")], nav := [], title := "Home", side := [], modal := none, workspace := [] }

-- The sign-out link is exactly one target occurrence of the screen's inventory.
#guard ((screenNodes (withSession sessionExample)).filter fun (_,p) =>
    p.target && p.comp == signOutComp && p.text == "Sign out").length == 1

#print axioms withSession_nav
#print axioms withSession_keeps
end Ehr.Layout
