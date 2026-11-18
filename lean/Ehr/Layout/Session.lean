import Ehr.Layout.Semantic

/-! # Host session actions

New specifications for owner review. A signed-in clinical page offers the
clinician a way to end the identity session on its home/worklist screen. It is a painted target like any
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

/-- New specification for owner review: the screens that offer sign-out by
id — the home/worklist screen of every persona's Program (`home`) and the
patient board (`patient-board`). -/
def homeScreens : List String := ["home", "patient-board"]

/-- New specification for owner review: a screen counts as home when its id is
one of `homeScreens`, or it is the patient-selection landing — the
department worklist, schedule, inbox or patient lookup, `workspace:<activity>`
(`Render.patientLandingUi`) — other than its transient loading screen. Deep
clinical screens, and a screen without an id, are not home. -/
def isHome (screen : UiScreen) : Bool :=
  match screen.screen? with
  | some id => homeScreens.contains id ||
      (id.startsWith "workspace:" && !id.endsWith ":loading")
  | none => false

/-- New specification for owner review: a home screen gets the session group
after its own navigation; every other screen is returned unchanged. -/
def withSession (screen : UiScreen) : UiScreen :=
  if isHome screen then { screen with nav := screen.nav ++ [sessionGroup] } else screen

theorem withSession_home_nav (screen : UiScreen) (h : isHome screen = true) :
    (withSession screen).nav = screen.nav ++ [sessionGroup] := by
  simp [withSession, h]

/-- New specification for owner review: a screen that is not home is unchanged. -/
theorem withSession_not_home (screen : UiScreen) (h : isHome screen = false) :
    withSession screen = screen := by
  simp [withSession, h]

/-- New specification for owner review: the session group changes only the
navigation; banner, title, workspace, side nodes, modal, urgent strip and
screen id stay, on every screen. -/
theorem withSession_keeps (screen : UiScreen) :
    (withSession screen).banner = screen.banner ∧ (withSession screen).title = screen.title ∧
    (withSession screen).workspace = screen.workspace ∧ (withSession screen).side = screen.side ∧
    (withSession screen).modal = screen.modal ∧ (withSession screen).urgent? = screen.urgent? ∧
    (withSession screen).screen? = screen.screen? := by
  unfold withSession; split <;> exact ⟨rfl,rfl,rfl,rfl,rfl,rfl,rfl⟩

private def sessionExample (id : Option String) : UiScreen :=
  { banner := [("Patient","Ada")], nav := [], title := "Home", side := [], modal := none, workspace := [],
    screen? := id }

private def signOutTargets (screen : UiScreen) : Nat :=
  ((screenNodes (withSession screen)).filter fun (_,p) =>
    p.target && p.comp == signOutComp && p.text == "Sign out").length

-- Home and the patient board: exactly one sign-out target occurrence.
#guard signOutTargets (sessionExample (some "home")) == 1
#guard signOutTargets (sessionExample (some "patient-board")) == 1
#guard signOutTargets (sessionExample (some "workspace:scheduleTasks")) == 1
#guard signOutTargets (sessionExample (some "workspace:lookup")) == 1
#guard signOutTargets (sessionExample (some "workspace:scheduleTasks:loading")) == 0
-- A deep clinical screen, and a screen without an id: none, and unchanged.
#guard signOutTargets (sessionExample (some "w1Orders")) == 0
#guard signOutTargets (sessionExample none) == 0
#guard (withSession (sessionExample (some "w4Admin"))).nav == []

#print axioms withSession_home_nav
#print axioms withSession_not_home
#print axioms withSession_keeps
end Ehr.Layout
