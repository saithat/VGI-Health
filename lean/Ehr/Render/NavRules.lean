import Ehr.Render.Ui
import Ehr.Core.Json

namespace Ehr.Render

/-- D5 is a checker obligation: navigation has unique group and within-group
labels, at most twelve groups and twelve entries per group, and no orphan screen.
The predicate checks the activity/workflow overview, without renaming duplicates.
Interactive shell nav now uses actual goto comp IDs; this overview diagnostic
is not a certificate for that projection. Owning checker/content integration remains open.
The spec argument keeps the checker's uniform spec/program interface. -/
def NavSane (_spec : Spec) (prog : Program) : Prop :=
  let nav := uiOverviewNav prog
  (nav.map (·.1)).Nodup ∧ nav.length ≤ 12 ∧
    (∀ g ∈ nav, (g.2.map (·.2)).Nodup ∧ g.2.length ≤ 12) ∧
    (∀ sc ∈ prog.screens, ∃ g ∈ nav, ∃ e ∈ g.2, e.1 = sc.id)

instance (spec : Spec) (prog : Program) : Decidable (NavSane spec prog) :=
  inferInstanceAs (Decidable (let nav := uiOverviewNav prog
    (nav.map (·.1)).Nodup ∧ nav.length ≤ 12 ∧
      (∀ g ∈ nav, (g.2.map (·.2)).Nodup ∧ g.2.length ≤ 12) ∧
      (∀ sc ∈ prog.screens, ∃ g ∈ nav, ∃ e ∈ g.2, e.1 = sc.id)))

/-- Read the committed release artifacts, rather than a duplicate Lean fixture. -/
def reportReleaseNav : IO Unit := do
  let p ← IO.FS.readFile "../releases/v1/personas/P1.json"
  let s ← IO.FS.readFile "../releases/v1/spec.json"
  let parsed := do
    let prog ← Lean.fromJson? (α := Program) (← Lean.Json.parse p)
    let spec ← Lean.fromJson? (α := Spec) (← Lean.Json.parse s)
    pure (spec, prog)
  match parsed with
  | .error e => throw (IO.userError e)
  | .ok (spec, prog) =>
    IO.println s!"D5 NavSane releases/v1/personas/P1.json: {decide (NavSane spec prog)}"
    for (label, entries) in uiOverviewNav prog do
      IO.println s!"  {label}: {entries.length} screens, unique labels = {(entries.map (·.2)).eraseDups.length == entries.length}"

-- Canonical.NavExports runs the file-backed report outside kernel builds.
end Ehr.Render
