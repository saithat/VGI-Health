# Lean page rendering

The renderer owns the whole page tree. The browser painter maps tags and
attributes to DOM nodes and turns event metadata into interpreter events.
The wire format is `{text:{s:...}}` or
`{node:{tag,attrs:[{name,value}],children:[...]}}` (Lean's derived JSON).
Classes, tags, attributes and input types are closed enums. There is no
`ehr-tiny`, hidden input, style, hidden, or aria-hidden attribute. A modal is
a div with role=dialog in document flow: native dialog without open is hidden.
Forms are omitted because implicit submission would reload the page.

`parseBundle context bundle` needs an explicit today date for recorded-today
weight and age calculations. It returns facts plus Display. Fixture resources
without resource.id use the complete entry.fullUrl (`urn:uuid:...`) as row id.
Patient identity is the Synthea identifier search token
`https://github.com/synthetichealth/synthea|<value>` when present, otherwise the
normalized source id. This survives Medplum assigning new server ids. Wristband
barcodes must encode that exact patient identity; scan fields emit Value.code
and the interpreter checks equality. The Synthea token can also locate the
Medplum Patient using an identifier search. It is not a REST resource id.

Allergy activity excludes inactive, resolved and entered-in-error records;
missing clinical status counts as active. Display also shows inactive allergies,
clearly labeled, but never those entered in error. Medication display includes
active and on-hold requests. The facts' current medication classes use active
requests only. No row limit is applied to safety panels. Empty allergies say
“No allergy records on file”.

Allergy and medication versions hash the sorted id@meta.versionId keys of all
resources of their type, including inactive resources. Medplum versions are
UUIDs, so summing numeric versions is impossible. FNV-1a is reduced to 52 bits
for exact JavaScript integer transport. Order independence is exact; freedom
from digest collisions is a trusted assumption. A String version is requested
in changes-requests.md for future exactness.

Info IDs: patientBanner, allergyList, currentMeds, vitals, resultTrend/labs,
problemList, immunizations, growthChart, encounters, procedures, doseCheck,
anticoagulants, careGaps, priorAuthStatus. Unknown IDs show the spec label and
an explicit empty notice. Clinical range and care-gap defaults are demo rules.

The page renders the interpreter's flat component-list order. Parent/group/tab
visibility is resolved by `view`; visible children follow their headers in the
same order, as sibling wrappers. This deliberately avoids a second ancestry
filter in the renderer (including on malformed graphs). A wrapper always
contains its literal component label. The central Part writer attaches ids,
events and disabled; shell, sidebar, table rows and popup acknowledgments do
not carry component ids.

`ehr render-screens --spec v1 --program canonical --fhir <fixture> --out <dir>`
also accepts spec/program JSON paths. Today comes from adjacent index.json or
`--today`; `--context` supplies medication, record, receipt and clock context.
A `--user` JSON file selects a role. Each screen emits the initial goTo state,
all groups expanded, each group opened individually, every combination of tab
indices (including nested tabs), and one variant per interruptive rule with
an actual nonempty interpreter alert key. Alert probes consider possible
formulary order lines and an out-of-range dose; these are presentation samples,
not simulated completed clinical workflows. JSON files are bare PageNode
values, accepted directly by `pnpm --filter app screen-check <dir>/*.json`.
HTML previews accompany them; the CLI copies ehr.css when invoked from the
repository root or lean directory. Use a fresh output directory for each run.

WASM rebuild with this checkout's shared read-only SDK required local `.tools`
symlinks and a copied writable Emscripten cache. The script has no tool-root
override (requested from wasm). Since its source step unsets EM_CACHE, the
successful equivalent build was:

```sh
source .tools/emsdk/emsdk_env.sh
export EM_CACHE="$PWD/.tools/emscripten-cache"
python3 wasm/build_ehr.py
wasm/install-into-app.sh
```

The original `wasm/build-ehr.sh` was also run; it failed solely attempting a
lock write in the shared SDK cache. Both commands use the same Python build
and exact pinned Lean/Emscripten inputs. Installed assets are gitignored.

The wasm32 string reconstruction uses `List.foldl String.push` in place of
String.ofList after String.toList. In the pinned Lean runtime, string-data's
nil is incorrectly constructed with lean_box_uint32(0), which is a heap object
on wasm32; string-mk expects scalar nil. The fold inspects the List constructor
tag, so it avoids that runtime mismatch. `Fhir.stringOfChars_eq` proves the
fold has exactly String.ofList semantics. Differential tests cover all 174
Synthea bundles and all 694 canonical page variants.

Proofs are in Render to respect lane ownership. `check-proofs.py` freezes the
15 main theorem signatures into a temporary Comparator challenge under the
ignored `.tools/render-proof-audit`, exports challenge and implementation,
and checks the solution using only propext, Quot.sound and Classical.choice.
The temporary challenge has Comparator's expected proof holes; committed
implementation and proof files contain none. Contracts.lean holds the shared
TreeSafe/Shown definitions so the challenge imports no solution proofs.
Each main theorem also has #print axioms and concrete Tiny examples. The
trusted surface includes the executable page/FHIR readers, the fixed CSS,
the painter, and the compiler/runtime. Browser screen-check tests validate
actual visibility and DOM order at desktop and 390px widths.

## Semantic boundary (section 10)

`renderUi` / `ehr_render_ui` / `ehr render-ui` take RenderInput and return a
UiScreen. The old PageNode API remains available for existing integrations.
`render-screens --ui` writes one semantic JSON screen for every existing variant.
Use `lean/generated/ehr-types.ts`; the JSON encoding is Lean's derived encoding.

UiScreen owns one banner landmark (name, DOB, MRN keys), grouped workflow nav,
a workspace beginning with a workflow stepper, a clinical side column, and an
optional modal. JSON key order has no layout meaning: the painter must place the
banner first. Missing identifiers remain empty; the renderer never invents them.

The interpreter resolves visibility, collapsed ancestors, selected tabs, flags,
and enabled actions. Rendering preserves every shown item and does not remove
duplicate semantic info or labels. A right fold nests children under earlier
containers. Malformed cycles, orphans, and out-of-order parents never lose an
item: unmatched branches stay at workspace level. The proof `uiComponents_mem`
covers arbitrary component lists, not just canonical programs.

D2 adds full-row read-only review info for applicable requirements not already
shown on a screen with the relevant commit button (including a disabled button).
It never changes interpreter state, guard outcomes, or original component IDs.
The supplement and sidebar use empty comp IDs and never dispatch events; hidden-id
T10 applies to nonempty component IDs. D3 covers workspace, side, and modal.
D4 filters passive/unknown modal IDs even in externally supplied malformed states.
D6 copies raw provenance/human-only/pending flags exactly; the painter may label
the provenance but must not infer or modify it. Pending fields get a confirm button.

Button roles `confirm` and `ack` select their named events. `toggle` uses the
existing Event.click for group headers; `primary`, `secondary`, `nav`, and `macro`
also use click. There is no Event.toggle. Tab labels are indexed by the actual
interpreter tab number. A tab body contains only shown items from selected tabs.
Clinical data are rows with clinical labels; alert keys, wristband transport
payloads, artifact IDs, and serialized payload/debug objects are not displayed.

`UiContracts.lean` defines tree observation; `UiProofs.lean` proves D1/D2/D3/D4/D6
and semantic T10/T11. `UiTests.lean` has satisfiable Tiny/FHIR instances, a missing
review program, round trips, and axiom reports. The proof comparator checks these
statements independently of the solution. D5 belongs to the checker: decidable
`NavSane spec prog` in NavRules checks real nav labels, group sizes, and orphans.
Its P1 report currently fails the 12-entry limit (14 W1, 17 W3, 18 W6); no entries
are truncated. The content/checker integration request is tracked separately.
