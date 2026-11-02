# Alert urgency and physical interaction policy

**Status: pending owner review — the entire classification below.** Source review
2026-11-02. These are proposed hospital attention defaults, not clinical advice or
a legal certification. Severity (`interruptive`, `passive`, `removable`) remains
unchanged. Urgency does not authorize a popup, acknowledgment, override or write.

An **urgent** condition must remain perceivable at every reachable view moment
while clinically active, including scroll, focus, zoom and unrelated modals.
Acknowledging a warning does not resolve its clinical condition. **Workflow**
information must be available in its relevant workflow; it need not stay pinned.
**Advisory** notices add no continuous-visibility obligation; existing rules still
control whether they may be removed. None of the reviewed authorities specifies
an all-moments viewport invariant. Every tier decision here is **hospital policy
(not law)**, informed by the concrete authorities cited in its row.

## Authority and applicability

- **[ONC](https://www.ecfr.gov/current/title-45/section-170.315#p-170.315(a)(4))**:
  45 CFR 170.315(a)(4)(i) requires certified technology to indicate drug–drug and
  drug–allergy contraindications before CPOE order completion/action. This is a
  technology criterion, not a universal mandate for a modal or persistent banner.
  It informs prescribing/refill decisions; extension to non-CPOE authorizations
  is local policy. Former (a)(9) CDS expired for certification on 2025-01-01;
  its historical wording must not be represented as a current certification duty.
- **[CMS nursing](https://www.ecfr.gov/current/title-42/section-482.23#p-482.23(c)(1))**
  and **[pharmacy](https://www.ecfr.gov/current/title-42/section-482.25#p-482.25(b))**:
  42 CFR 482.23(c)(1) and 482.25(b) govern medication administration and policies
  minimizing medication errors. They do not designate these alert IDs or pixels.
  [482.24(b), (c)(1)](https://www.ecfr.gov/current/title-42/section-482.24)
  governs accessible, complete, legible medical records; record legibility is not
  itself a continuous-alert requirement.
- **[SAFER](https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf)**:
  ASTP/ONC CPOE guide, recommended practice 2.1, p. 13: contextual, actionable,
  severity-tiered alerts and limited interruption. Guidance, not law; it supports
  distinguishing low-value duplicates from important clinical warnings.
- **[ISMP](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf)**:
  2026–2027 hospital best practices, BP 3, pp. 5–6, supports metric weight and
  weight-related CDS; BP 19, p. 18, supports layered high-alert medication safety
  strategies. Guidance, not law; neither prescribes these continuous tiers.

## Complete classification

Each row is **pending owner review**, with decision authority **hospital policy
(not law)**. Sources in this table refer to the concrete linked provisions above.
No row claims that regulation decides the continuous-visibility tier.

| Alert kind / ID | Proposed urgency | Concrete basis and local rationale |
|---|---|---|
| `drugAllergyOrder` | urgent | [ONC (a)(4)(i)][onc], [SAFER 2.1][safer]: contraindication before prescribing; retain warning while the match remains active. |
| `drugAllergyAdmin` | urgent | [CMS 482.23(c)(1)][cms], [SAFER 2.1][safer]: administration safety context; ONC CPOE criterion is not an administration mandate. |
| `interactionOrder` | urgent | [ONC (a)(4)(i)][onc], [SAFER 2.1][safer]: severe interaction before order action; persistent exposure is local policy. |
| `interactionRefill` | urgent | [ONC (a)(4)(i)][onc], [SAFER 2.1][safer]: medication-order refill safety; applicability assumes a CPOE order. |
| `doseRangeOrder` | urgent | [ISMP BP 3][ismp], [SAFER 2.1][safer]: dosing support before dispensing; no statute fixes this tier. |
| `weightInLb` | urgent | [ISMP BP 3][ismp]: metric weight for dosing; preserve the unit warning while pounds remain captured. |
| `highAlertAdmin` | urgent | [CMS 482.23(c)(1)][cms], [ISMP BP 19][ismp]: high-alert administration safety; the exact distinct-human cosign remains local policy. |
| `careGapsInline` | workflow | [SAFER 2.1][safer]: contextual preventive reminders; no reviewed regulation requires continuous exposure. |
| `duplicateTherapyInline` | workflow | [SAFER 2.1][safer]: this spec labels the condition low severity; retain access without promoting it to a severe interaction. |
| `immunizationsDueInline` | workflow | [SAFER 2.1][safer]: preventive-care reminder; vaccine documentation duties do not prescribe persistent reminders. |
| `healthMaintenancePopup` | advisory | [SAFER 2.1][safer]: redundant reminder for already available care gaps; no legal urgency requirement found. |
| `highAlertOrderNotice` | advisory | [ISMP BP 19][ismp], [SAFER 2.1][safer]: generic policy notice, distinct from an actual dose/allergy warning; no legal urgency tier found. |
| `activeRxPopup` | advisory | [SAFER 2.1][safer]: expected active prescription during refill; no legal urgency tier found. |
| `refillCareGapPopup` | advisory | [SAFER 2.1][safer]: care-gap duplicate outside the preventive workflow; no legal urgency tier found. |
| `minorInteractionPopup` | advisory | [SAFER 2.1][safer]: spec describes minor information already handled by prescriber. Its coarse `.interaction` trigger does not itself prove clinical severity; owner must review this mismatch. |
| `pediatricGrowthCurveOutlier` | urgent | [ISMP BP 3(e), p. 5][ismp]: weight/growth consistency CDS. Full catalog only; continuous exposure is proposed local policy. |
| `significantWeightChange` | urgent | [ISMP BP 3(e), p. 5][ismp]: comparison with prior encounter weight. Full catalog only; continuous exposure is proposed local policy. |

`Rules/Cms`, `Title22`, `CaStatutes`, `Federal`, and `Entrenched` declare empty
alert lists. `Rules/Features` adds the last two rows. V2/V3 preserve V1 alerts.
Full-profile `V1.inheritedAlerts` adds **60 exact IDs**, each inheriting its base
row's sources and urgency: the six signing kinds `drugAllergyOrder`,
`interactionOrder`, `doseRangeOrder`, `weightInLb`, `duplicateTherapyInline`,
`highAlertOrderNotice`, each suffixed with `.` and each of:

`signScheduleIISeries`, `signEmergencyRxFollowup`, `authorizeDirectDispensing`,
`authorizeSelfAdministration`, `authorizeBedsideMedication`,
`authorizePatientOwnedMedication`, `authorizeOudDirectDispensing`,
`signOralLiquidPrescription`, `signFormattedPrescription`, `signOralMethotrexate`.

Thus **77 IDs, 17 kinds** are classified. The exact expanded list with source
labels is [alert-urgency.json](alert-urgency.json), generated from
[Specs/AlertUrgency.lean](../../lean/Ehr/Specs/AlertUrgency.lean). Kernel coverage
checks include the complete catalog and each released spec, with no catch-all
classification for unknown IDs. Core release JSON contains 15 base alerts.

## Critical results and California scope

There is **no critical-result AlertSpec** in these lists. `ackResult`,
`resultDetail`, `resultTrend` and `resultAbnormalFlags` are actions/reviews, not
alert kinds. This classification must not imply critical-result delivery exists.
[Joint Commission hospital NPG.01.02.01, EPs 1–2, p. 1](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9)
requires timely critical-result reporting, defined recipients/time limits and
assessment of timeliness. This is accreditation, not law; it succeeded hospital
NPSG.02.03.01 in January 2026. A future critical-result alert should be proposed
urgent, with delivery/escalation and resolution distinct from a UI acknowledgment.
CLIA's [42 CFR 493.1291(g)](https://www.ecfr.gov/current/title-42/section-493.1291#p-493.1291(g))
imposes immediate laboratory notification for life-threatening/panic results;
that laboratory duty is not fulfilled by a pinned EHR widget alone.

California [H&S Code 1339.63(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1339.63)
requires medication-error reduction planning. The repository's California review
([regulations](../regulations.md), §3.3) also identifies 22 CCR 70750
medication-administration rules as relevant general duties. No reviewed
California statute chooses these per-alert urgency tiers or requires perpetual
on-screen display. This is a bounded source review, not a claim that all
California obligations have been exhausted. No FDA mandate is inferred from
barcoding requirements for drug labels. ISMP and SAFER are labeled guidance.

## Lean contract and limits

[Sem/Urgency.lean](../../lean/Ehr/Sem/Urgency.lean) defines `AlertActive` from
clinical `alertKeys`, independently of whether the renderer emits the warning.
`ContinuousUrgency` quantifies every reachable interpreter state, every finite
view path (including zero steps), and each still-active urgent rule. Modal
meaning requires its labeled attention boundary **and** enabled acknowledgment;
inline meaning retains the rule's severity. Acknowledgment does not by itself
remove the activity requirement.

`render_modal_continuous` and `render_inline_continuous` prove the current
presentations under explicit `Pinned` layout evidence at every reached moment.
`render_continuous_urgency` assembles the full property when every active urgent
rule has one of those presentations in every reachable state. Structural
membership comes from existing D4 render theorems; the model assumes actual
viewport intersection, legibility, lack of occlusion and stable presentation
through view steps. It does not derive these from tree presence.

**Open:** today's programs do not establish that model for all active urgent
conditions before a popup, after acknowledgment, behind another modal or on
hidden tabs/screens. Urgent interruptive inline presentation is not covered by
the passive-inline lemma. Navigation to a different presentation needs new
coverage/layout evidence. Browser scroll/focus samples cannot prove all possible
moments, transitions, arbitrary user zoom or continuous time. Existing clinical
properties, specs, statements and comparator obligations remain intact.

## Physical policy and measured scope

The owner selects [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) as **hospital policy
(not law)**. [Specs/PhysicalBounds.lean](../../lean/Ehr/Specs/PhysicalBounds.lean)
exports SC-labelled constants to the same JSON used by the screen gate:

| SC | Policy bound | Measurement |
|---|---|---|
| 2.5.8 | 24×24 CSS px minimum | Enabled pointer controls, including labeled checkbox target area; no spacing/equivalent/inline exceptions in this stricter hospital baseline. |
| 1.4.3 | 4.5:1 | Computed DOM/SVG text, value and placeholder colors over composited solid surfaces; includes large and disabled text as a stricter local baseline. |
| 1.4.11 | 3:1 | Authored input boundaries, visible selected/checked/focus indicators, meaningful SVG shape paint including curves, rectangles and opacity. Text-labelled buttons use their text for identification; decorative icons and separators are excluded. |
| 1.4.4 | 200% | Text-only resize stress at 1280 and 768 CSS px; computed fonts doubled. This does not emulate browser chrome zoom. |
| 1.4.10 | 320 CSS px | Reflow equivalent to 1280 at 400%; also 640px equivalent to 200%. Contained two-dimensional tables may scroll; surrounding text/controls must reflow. |

Each supplied clinical export is measured at **768, 1280, 1440, 1600 and 1920px**
(height 900px), plus the reflow/resize probes above. Endpoints and intermediate
samples do not prove the continuum of desktop widths. Modal and forced
modal-free background probes are reported separately; the latter is not asserted
to be a reachable acknowledgment state. An active phase means the tree as
exported, not an independent proof that an event trace reaches that popup. The old desktop/narrow fidelity checks
remain independent. Synthetic `*-geometry.json` probes remain measurement-only.

Reports identify the file, viewport, resize/phase, SC, semantic element ID and
DOM path, actual dimensions/contrast, counts and every finding. Unsupported
images, group opacity, filters or blend modes fail for pixel review; no inferred
contrast pass. Native control internal painting, complex graphics, hover/open
menus, every keyboard-focus state and complete clipping/occlusion coverage require further browser
or manual review; these checks are not a complete WCAG audit. The gate reports
violations without modifying the canonical painter or weakening thresholds.

Large supplied-state lists run in sequential batches of 64 (bounded to at most
128 through `EHR_SCREEN_BATCH_SIZE`), avoiding controller/report heap growth.
The CLI collects structured physical findings and fails the gate on any finding;
Playwright collection success is not a physical-policy pass. Direct Playwright
runs retain per-state physical assertions. Missing physical attachments are
infrastructure errors, never passing coverage. `EHR_PHYSICAL_SAMPLE_CACHE` may
retain exact measurements under a painter/assertion/policy/browser/configuration
context; failed measurements can be reused without creating passing whole-version
receipts.

The default urgent IDs come from the reviewed-source proposal. Operator
`EHR_URGENT_ALERT_IDS` adds IDs and cannot subtract the baseline. Policy content
and gate sources enter the cache context. The urgency samples check emitted
alerts and acknowledgments initially, after scroll start/mid/end and each
enabled focus target; absent active conditions cannot be recovered from exported
UiScreen JSON and remain the stronger Lean contract's coverage gap.

Regenerate policy after a Lean policy edit:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
(cd lean && lake build)
(cd lean && lake env lean --run Ehr/Sem/ExportPolicy.lean) > docs/design/alert-urgency.json
```

Run the whole supplied-state gate with durable findings:

```sh
EHR_SCREEN_WORKERS=4 EHR_SCREEN_CACHE=0 \
EHR_PHYSICAL_REPORT="$TMPDIR/physical-policy.json" \
EHR_SCREEN_RESULT="$TMPDIR/screen-policy.json" \
pnpm --filter app screen-check --ui /absolute/path/to/exported-state.json
```

`node scripts/audit-alert-policy.mjs "$TMPDIR/policy-personas" --personas`
checks P1–P5 for all three releases with their declared roles and a representative
fixture (P4 pediatric, other personas adult allergic). Add `--export-only` to
prepare the native state manifest without starting another browser batch.

Canonical release findings and exact verification commands are recorded in
[alert-urgency-findings.md](alert-urgency-findings.md).

[onc]: https://www.ecfr.gov/current/title-45/section-170.315#p-170.315(a)(4)
[cms]: https://www.ecfr.gov/current/title-42/section-482.23#p-482.23(c)(1)
[safer]: https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf
[ismp]: https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf
