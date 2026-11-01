# VGI clinical visual style

Design specification, 2026-10-31, for the semantic React/Mantine painter. This is an original muted clinical theme inspired by the information density and conventions in the [research](ehr-ui-research.md), not any vendor's exact screen. The [blueprint](canonical-blueprint.md) owns screen content. The Lean tree owns visibility, values, alert tiers, enabled state, provenance, and human requirements. React maps node kinds to presentation; it must not derive clinical status from a color or duplicate workflow logic.

## Palette

Use white work surfaces, cool gray framing, dark text, and a restrained blue for navigation/commit actions. Color is a secondary cue beside text. These are VGI tokens, not vendor color samples.

| Token / use | Value | Pairing |
| --- | --- | --- |
| Canvas | `#F3F5F7` | Behind workspace / rail |
| Surface | `#FFFFFF` | Fields, sections, tables |
| Banner / table heading | `#E8EEF2` | Dark ink, no saturated full-width header |
| Subtle row / hover | `#F6F8FA` | Ink; hover never implies selection |
| Selected row / active tab | `#E6EFF7` | Ink, blue left/bottom marker and explicit selected state |
| Ink | `#243341` | Default clinical text |
| Secondary ink | `#526171` | Dates, source text, unit labels; fully legible |
| Divider | `#CBD5DF` | Decorative separators only |
| Control border | `#718096` | Input/control outline, not faint divider |
| Primary / link / focus | `#245A81` | White on filled button; blue on white for links |
| Primary hover | `#1C4868` | White text |
| Danger ink / tint | `#9C2833` / `#FCECEE` | Severe warning, critical result, overdue |
| Warning ink / tint | `#825300` / `#FFF3D6` | Caution, unresolved review, held dose |
| Success ink / tint | `#256348` / `#EAF5EE` | Recorded success, given dose, completed step |
| Information ink / tint | `#245A81` / `#E8F1F8` | Passive information, due medication |
| Violet ink / tint | `#65448B` / `#F1ECF7` | Refused dose, explicitly labeled |
| Neutral ink / tint | `#526171` / `#EDF0F3` | Future, stopped, unavailable, unknown state with text |

Calculated sRGB contrast for the specified ink/tint pairs is 5.55:1–6.64:1; primary white-on-blue is 7.36:1 and secondary ink on the banner is 5.43:1. The control border against white is 4.02:1. These checks cover these exact pairs only; implementation still needs to check actual rendered states and neighboring colors.

Body-sized text must meet at least 4.5:1 against its actual background; do not treat 14–16 px headings as “large text” to relax this. Check every token pair including hover, badges, disabled explanations and modal text. Meaningful control boundaries/focus should achieve 3:1 against adjacent colors. Never use the decorative divider as the only visible boundary of a field. [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Do not encode drug class by arbitrary color. Use generic names, with standardized Tall Man differentiation only for the recognized look-alike pairs, e.g. `hydrOXYzine` / `hydrALAZINE`; preserve actual name/strength/form in text. Do not apply random capitals or uppercase whole drug names. This follows [ISMP electronic medication communication guidance](https://www.ismp.org/system/files/resources/2019-03/Electronic-Guidelines-2019.pdf).

## Typography and clinical notation

System sans-serif stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Avoid a downloaded branding font; the offline demo must render consistently. Default weight 400, labels/section headers 600, clinical emphasis 600–700. Do not make every table cell semibold.

| Element | Size / line-height | Use |
| --- | --- | --- |
| Patient name | 18 / 24 px, 600 | One identity anchor |
| Screen title | 18 / 24 px, 600 | One per workspace |
| Section title | 14 / 20 px, 600 | Clinical grouping |
| Body / field value / button | **13 / 18 px** | Default |
| Table / nav / labels / badges | **12 / 16 px** | Dense structured content |
| Narrative note | 13 / 19 px | Full-width readable paragraphs |
| Provenance / units / timestamps | 12 / 16 px | No tiny low-contrast footnotes |

Minimum clinical text is 12 px at default zoom. “Compact” reduces whitespace, not font size. Use tabular numerals for vitals, doses, times, quantities and results; reserve monospace for a literal identifier/barcode if needed. Numeric columns right-align with their unit visible. Keep number and unit together: `18.4 kg`, `250 mg`, `2.5 mL`. Use a leading zero below one and avoid unnecessary trailing zeros. Show `mg/kg/dose` or `mg/kg/day` explicitly. Do not calculate, convert, or normalize clinical values in the painter; display the supplied value/unit and semantic validation result.

Dates: `31 Oct 2026 09:14` with local timezone when needed; show the date alongside a time on multi-day grids. DOB uses a full year. Avoid ambiguous `03/04/26`. Clinical ordering of events uses semantic timestamps, not text sorting. Relative text like `2 h ago` supplements an absolute timestamp. Missing and unknown are distinct from zero/normal/negative.

## Layout and spacing

Use a 4 px spacing grid: 4 between label/value or related inline items, 8 within a field group, 12 section padding and column gutter, 16 between major sections. A 1 px border and 3–4 px radius is enough. Avoid nested elevated cards, large shadows, oversized rounded pills, gradients, and decorative empty space.

Reference viewport: **1440×900 at 100% zoom**. Banner roughly 88–104 px with two information rows, growing naturally if text wraps. Chart activity row 32–36 px; task stepper 32–40 px. Clinical rail 224–248 px. Optional task TOC 160–184 px when there is room; otherwise put it below the activity row. Workspace takes the remaining width, with 12 px padding. The `side` payload is the left clinical rail in this theme; do not add a second mirrored patient summary on the right. Inside a workspace `columns`, use equal flexible columns for paired forms; prefer a wider narrative area when one child is long text. DOM reading order stays the same as visual reading order.

At 1280×800 reduce gaps/rail width modestly, wrap secondary banner content and compound table cells, and stack columns as necessary. At 200% zoom or a narrow viewport, flow into one column while keeping all required records/actions available. Do not solve density with `overflow:hidden`, a clipped safety panel, CSS reordering, or a fixed-height scroll trap. Long forms may scroll normally. Banner may be sticky if its measured height is reserved; use scroll offsets so focus/headers are not covered. Commit controls remain in normal document flow, below their evidence, so they cannot overlay the last table rows.

The target is roughly 18–22 ordinary table rows or 12–15 wrapped medication rows in a 600 px table region, not a quota. Typical shell: 6–10 visible chart activities and 4–8 clinical summary sections. Source screenshots establish dense multi-panel conventions; the exact numbers above are our targets, not measured EHR norms. A genuine long history is more important than fitting a single screen.

## Tables and forms

| Element | Density specification |
| --- | --- |
| Ordinary table heading | 30 px minimum, 6 px horizontal cell padding, 12 px semibold |
| Ordinary data row | 28 px minimum, about 5–6 px vertical padding |
| Medication / wrapped row | 40–48 px minimum; grow for complete sig/product text |
| MAR medication row | 48–64 px minimum; grow for infusion/complex sig |
| Input / select / search / button | 30–32 px desktop minimum; larger in scanner/touch contexts |
| Touch/scanner primary control | 40–44 px with adequate separation |
| Section header | 28–32 px minimum with status text adjacent |
| Badge | 20–24 px high, 4–6 px horizontal padding, radius 3 px |

Use light horizontal rules; optional very subtle alternating rows only for long grids. Keep headers sticky only when they do not obscure content. Sort controls have an accessible name/direction. Tables have captions/section labels, column headers and, for time grids, row headers. Empty tables explain `No ... on file` or `No ... in this period`; a failed data load says unavailable, not an empty clinical history. Do not virtualize away required review rows or place them in closed pagination at a commit.

Result rows: analyte, value/unit, `H`/`L`/`Critical`, reference range, collected, status; emphasize the value/flag rather than painting a whole ordinary abnormal panel red. An incomplete or corrected result is labeled. Trends retain units, date ticks, reference source, and an accessible point table; clinical dots do not rely on hover. Growth curves use neutral reference lines and a stronger patient trace, with curve labels and named age/reference basis.

Field labels are persistent, never placeholder-only. Put units next to input and in accessible labeling; do not rely on the clinician remembering which weight is kg. A required marker is paired with a form-level explanation. `Human entry` is a compact text badge on human-only identity/scan/cosign/consent/signature fields. Prefills show `From triage · 31 Oct 09:14` or `Default · daily`; pending confirmation adds amber outline/tint and a **Confirm** control. Confirmed provenance stays visible in secondary ink. Validation text sits beneath its field and next to the blocked commit; it does not erase the entered value.

## Badges and review state

Badges are rectangular labels, not independent navigation unless the semantic tree supplies an action. Pair each with specific text:

- `Allergies: penicillin +2` muted red; `Allergies not reviewed` amber; explicit NKDA neutral; missing data `No allergy records on file` neutral/amber as appropriate. The full allergy table remains at a required commit.
- `Code: Full`, `Code: DNR`, or `Code: Not documented` uses neutral styling with readable text. Do not label DNR as an error or failure.
- `Isolation: Contact` amber plus generic precaution icon; no isolation status is inferred from the badge's absence.
- `Reviewed 09:14` green text + check; `Needs review` amber text + circle; `In progress` blue text. Completion is derived from actual interpreter state, not from visiting the screen or client-side checkbox styling.
- `Unsigned`, `Missing details`, `Needs confirmation`, `Signed 09:32` are explicit order states. Preselected set rows still say `Needs confirmation` where applicable.

No state is communicated by red/green alone. A care-gap count does not become a critical alarm badge. Numeric counts distinguish selected/total or unread/total in the label.

## Alert presentation and color code

Interruption **tier** and clinical **severity** are independent. The painter must not infer either from color or placement. The current wire's `severity` field carries a legacy tier string on some alerts. Per the owner's shared-shell brief, explicit `interruptive` is framed red, `removable` amber and `passive` blue. That framing does not rename the alert as clinically severe or change acknowledgment, modality or enabled state. Explicit clinical severity strings use the table below. A legacy modal without an alert node uses a red blocking frame; this does not add a severity label.

| Severity / condition | Treatment | Original VGI labeling pattern |
| --- | --- | --- |
| Severe / critical risk | Danger ink/tint, warning icon, clear affected order/evidence | `Severe interaction` then implicated drugs and consequence |
| Caution / needs correction | Warning ink/tint, warning triangle | `Weight must be in kg` then correction |
| Informational / care gap | Information ink/tint, info circle; inline only when passive | `Care gaps due` with actionable context |
| Successful action | Success ink/tint, check; ordinary status, not a new popup | `Orders signed 09:32` |

**Passive:** inline full-width alert in its relevant section; no backdrop, acknowledgment demand, or toast substituting for required content. **Interruptive:** one modal, about 560–720 px wide, natural vertical growth, limited to viewport with scrollable body and visible heading/actions. Body order: concise problem → affected order/patient evidence → risk/consequence → proposed correction or permitted override reason/comment → actions. Required review panels remain in the underlying workspace and relevant evidence is repeated in the modal when needed. A backdrop must not be so dark that patient context becomes illegible.

Use dialog/alertdialog semantics as appropriate, labeled heading and description, focus inside on open, a contained Tab sequence, and return focus to the triggering action after close. Standard Escape behavior can dismiss/cancel an attempted action **only if the interpreter exposes that event**; it never acknowledges or completes a commit. Until an explicit dismiss event exists, no X/Escape handler may bypass the open modal state. Do not focus an override/commit button by default or let Enter confirm a reason automatically. [W3C modal interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Keep the baseline's removable popups conditional and distinct from severe warnings. Do not upgrade care gaps to “critical” just to justify interruption. Hard-stop disabled actions have readable text such as `Enter patient ID to sign` or `Scan medication`; no tooltip-only explanation.

## MAR statuses and scanning

Our status mapping intentionally uses a modest tint in the time cell with dark text, not saturated full medication rows. The reference installation's [MAR](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_%28MAR%29_Overview.htm) illustrates blue scheduled tasks, gray future tasks and red overdue tasks; the complete mapping below is VGI's choice, not a universal EHR standard.

| Status | Ink / background | Visible cell text / detail |
| --- | --- | --- |
| Future | `#526171` / `#EDF0F3` | `Scheduled 12:00` |
| Due | `#245A81` / `#E8F1F8` | `Due 09:00` |
| Overdue | `#9C2833` / `#FCECEE` | `Overdue 09:00` + elapsed time if supplied |
| Given | `#256348` / `#EAF5EE` | `Given 09:12` + actual dose/route, clinician detail |
| Held | `#825300` / `#FFF3D6` | `Held` + reason/time |
| Refused | `#65448B` / `#F1ECF7` | `Refused` + reason/time |
| Stopped / not due | `#526171` / `#EDF0F3` | `Stopped` with order end time; no enabled Give |
| Not documented / missing | Neutral on white | `Not charted`; never a green empty cell |

Due/overdue timing comes from the scenario/spec, not a CSS timer. Time headers show date and scheduled time; highlight current time with a border/text marker. Use left-to-right chronological order for VGI and label it; reference systems differ in time direction. Medication names/ordered dose/route/frequency remain in the left column. Do not imply an overdue scheduled dose was given merely because a later one is charted.

Scanning view has two large labeled fields in order: **Scan wristband** then **Scan medication**, each with `Waiting`, `Matched`, or a specific mismatch reason. Display matched patient/product text and capture time, then dose/lab/allergy evidence. A visual/audible scanner success supplements, never replaces, text. Scanner Enter submits that field only. High-alert **Second nurse check** follows with a different authenticated user as required. PRN pain and later reassessment remain separate captures. Focus recovery after an interruption must not reuse an old scan or record a dose twice.

## Generic icons and keyboard use

Use one generic open icon family, preferably **Tabler Icons (MIT)**, retaining its license notice when assets are introduced. No vendor screenshots, logos, asset tracing, icon extraction, branded alert symbols, or borrowed product palettes. [Tabler's source/license offering](https://tabler.io/icons).

Icons: user/avatar placeholder, search, chevron, check, circle-info, warning triangle, clock, barcode, pill, trend, message, lock/human marker. Use 16 px for dense rows and 18–20 px for larger actions, consistent stroke and no decorative illustrations. D1 identifiers, alert names, field labels and commit text remain visible; never make a pill icon the only label for MAR. Decorative icons are hidden from assistive tech, icon-only permitted secondary controls have an accessible name and tooltip, and clinical statuses always include text. No new `icon` node is needed: generic icons decorate the stable semantic component kind; they cannot invent meaning absent from its supplied text/state.

Use visible 2 px blue focus outlines with offset, not only background tint. Tab/Shift+Tab follows DOM reading order; arrows operate selection widgets; Enter accepts a focused search result; Space toggles a focused choice. No global single-key shortcuts inside text inputs. Display declared shortcuts beside actions. Avoid browser-reserved combinations. A commit shortcut invokes the same interpreter action/guard and cannot fill identity, scans, consent, cosign, or alert acknowledgments. Never let a note textarea's Enter invoke Sign.

## Mantine mapping and acceptance

The checked-in app declares Mantine 8.x; this document prescribes component roles rather than version-specific API syntax. Map `UiScreen` to shell/header/nav/workspace/side/modal; `section` to a semantic titled group with a restrained border; `columns` to responsive layout; `tabs` to labeled tabs; `stepper` to task navigation; `field` to the typed labeled input; `info` to list/table/trend/summary; `alert` to inline alert; `button` to its declared role. Buttons marked nav/secondary/macro do not inherit filled primary styling. Prefer a single shared theme/token definition over per-workflow palettes. Mantine primitives provide presentation/accessibility mechanics, while Lean remains the authority for UI state and events.

Check desktop 1440×900 and 1280×800, 200% zoom, narrow single-column layout, keyboard-only, scanner Enter, long translated labels, long names, 20+ allergies/meds/orders, multiline sigs, unknown status, stale weight and missing lab values. Match the accessibility tree to the semantic tree; inspect banner count, all required workspace rows, blocked reasons, focus/modal behavior, color contrast and no covered controls. A compact mockup with missing history does not pass. This docs-only deliverable changes no theme or painter code; these checks are implementation acceptance criteria.

## Shared shell color system — 1 Nov 2026

This update supersedes the earlier muted application framing. Clinical information still uses the ink/tint pairs above; application chrome now uses deep indigo `#243E73` with white text, activity strips `#DCE6F6`, patient banner `#E5F0FA`, navigator/storyboard `#EBF0FA`, and section headings `#EDF3FB`. The active destination has a blue edge and a text/selected-state cue. Sign/Accept actions use the existing green pair. All source colors are original VGI choices.

The source of truth is `app/src/ehr/ui/theme.ts`: `clinicalTokens`, `clinicalCssVariables`, and `clinicalTheme`. CSS consumers use `--clinical-appbar`, `--clinical-appbar-hover`, `--clinical-activity`, `--clinical-sidebar`, `--clinical-section`, the existing `--clinical-{blue,green,yellow,red,violet,gray}-{ink,tint}` pairs, and `--clinical-persona-p1` through `--clinical-persona-p5`. `main.tsx` publishes them on the document root; standalone semantic screen previews receive them on the screen container. The presentation lane can consume these without owning a parallel palette.

Research: [CST Provider View overview](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Workflow_Pages/Provider_View/Overview_of_Provider_View.htm) shows distinct toolbar, patient banner, activity tabs and left chart menu; [SIU Epic training](https://www.siumed.edu/sites/default/files/2021-08/EPIC%20Info-Inpatient%20Student%20Training%20Exercise%20Booklet.pdf) documents activity tabs and a navigator table of contents. Adopt the hierarchy and density, not a vendor's exact composition. No vendor assets are shipped. Detailed observations and self-review are in [our shared-shell research section](ehr-ui-research.md#shared-shell-visual-system-and-ui-browser).
