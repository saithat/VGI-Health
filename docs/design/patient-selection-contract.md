# In-UI patient selection (CONTENT lane)

Active persona programs opt in with `patientSelection: true`; archived programs omit it and keep the previous interpreter behavior. The public API dispatches the opt-in workspace around the unchanged clinical interpreter.

`State.patientContext` contains optional `patient`, `bound`, `target`, plus `activity` and `query`. Initial `patient`/`bound` are absent. `Facts.patientDirectory` contains source patient identities and source-bounded landing rows; `Facts.sourcePatientId` binds the selected clinical facts to the exact FHIR Patient.id. Changing patients resets captures, receipts, acknowledgments and commits before loading. A stale or foreign projection cannot render or execute clinical work.

All controls are supplied by Lean. The existing event seam remains `click {comp}` / `search {query}`. Workspace controls use `workspace.*` component IDs and typed `Ehr.Workspace.Action.openPatient` / `showList` actions. Row labels include `Open chart: <name> (MRN <mrn>)`. `workspace.lookup` opens Patient Lookup; `workspace.return` returns to the role's landing activity. Application navigation is the semantic `Application activities` group; chart navigation retains the program's existing role-specific navigator.

Shell coordination: remove external patient pickers for opted-in programs. Show no patient banner/storyboard/chart panels while `state.patientContext.patient` is absent or not bound. The semantic workspace already supplies that empty banner/side tree. Render its supplied application activities as the outer toolbar and its clinical nav as chart tabs when a chart is open. Do not synthesize controls or choose a patient in React. Selection requests are detected from Lean state, and the host loads that exact patient's offline bundle or Medplum chart, then invokes the Lean hydration binding.

CONTENT owns interpreter, directory projection, replay loader and simulator selection costs. Existing clinical D1–D6 statements stay unchanged; new workspace statements distinguish an unselected list from a bound clinical chart and prove reset/isolation. No clinical safety rule changes.
