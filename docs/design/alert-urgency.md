# Alert urgency and physical interaction policy

**Status: APPROVED by the owner on 2026-11-02.** Source review
2026-11-02. These are hospital attention defaults, not clinical advice or
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

Each row is **APPROVED by the owner on 2026-11-02**, with decision authority **hospital policy
(not law)**. Sources in this table refer to the concrete linked provisions above.
No row claims that regulation decides the continuous-visibility tier.

| Alert kind / ID | Approved urgency | Concrete basis and local rationale |
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
| `minorInteractionPopup` | advisory | [SAFER 2.1][safer]: spec describes minor information already handled by prescriber. The successor spec uses `.minorInteraction`: explicit minor evidence is required, and severe source evidence or a formulary hazard excludes this advisory path. |
| `pediatricGrowthCurveOutlier` | urgent | [ISMP BP 3(e), p. 5][ismp]: weight/growth consistency CDS. Full catalog only; continuous exposure is approved local policy. |
| `criticalResult` | urgent | [NPG.01.02.01 EPs 1–2][critical], [CLIA 493.1291(g)][clia]: timely reporting, named recipients, escalation and assessment; the continuous strip is hospital policy. |
| `significantWeightChange` | urgent | [ISMP BP 3(e), p. 5][ismp]: comparison with prior encounter weight. Full catalog only; continuous exposure is approved local policy. |

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

Thus **78 IDs, 18 kinds** are classified. The exact expanded list with source
labels is [alert-urgency.json](alert-urgency.json), generated from
[Specs/AlertUrgency.lean](../../lean/Ehr/Specs/AlertUrgency.lean). Kernel coverage
checks include the complete catalog and each released spec, with no catch-all
classification for unknown IDs. Successor core release JSON contains 16 base alerts. The approved export uses `approvedAssignments`; the original 77-row Lean proposal is retained unchanged as historical evidence because protected specs are additive only.

## Critical results and California scope

`Specs/CriticalResults.lean` adds the urgent `criticalResult` kind and successor
V1–V3 specs, preserving all original spec definitions. Critical-result reporting
is a separate workflow from `ackResult` and ordinary alert acknowledgment.
[Joint Commission hospital NPG.01.02.01, EPs 1–2, p. 1][critical] requires a
procedure defining critical results, reporting participants and acceptable time,
and assessment of reporting timeliness. It succeeded NPSG.02.03.01 in January
2026. [CLIA 42 CFR 493.1291(g)][clia] requires immediate laboratory notification
for life-threatening/panic results. A strip alone cannot fulfill these duties.

`Multi/Critical.lean` models immediate service delivery, receipt, UI
acknowledgment, covering-clinician escalation and a clinician's documented
clinical action. Resolution requires a notified responsible/covering identity,
receipt and nonblank action documentation. Receipt, acknowledgment and timeout
never create resolution. The model records who acted and when; it trusts the
clinician's assertion that the documented clinical action occurred.

The simulated reporting bound is **30 model minutes**, a local scenario policy,
not a duration specified by either authority. `FairService` requires a delivery
and timeout service at each minute after finite actor interleavings. With fixed
result identity, `eventually_resolved_or_escalated` proves resolution or escalation
by the original deadline. `bounded_follow_through` strengthens this to recorded event timestamps in an executable fair schedule with arbitrary finite actor interleavings. No response from a clinician is assumed. The result is
not a theorem about real-time network delivery, an unattended browser, or durable
production dispatch; a production timer, authenticated routing, shared store and
timeliness monitoring must refine this executable model.

The canonical semantic renderer supplies receipt, escalation status, documented
action and resolution controls. The shared native/WASM `runStep` API routes these
to the multi-actor reducer independently of the certified commit interpreter.
Workflow state is episode state, not a server notification ledger. Exact source snapshot identity prevents a corrected observation from inheriting an earlier resolution. Clinical
commits and `ackResult` do not resolve it. A critical FHIR flag (`HH`, `LL`, `AA`)
creates a warning even without routing; absent recipients leave an explicit
manual-notification finding and cannot authorize resolution. The synthetic
`critical-result-route` extension supplies the model clock and clinician IDs.
The first P1 result task each simulated day gains a critical potassium result
(6.8 mmol/L), retaining original task choices, random draws and state history.
Historical W2 simulation goals still measure `ackResult`; they do not certify
critical-result follow-through. New model/API regressions exercise the latter. `Canonical/Urgency.lean` adds the required inline source component to W2 successor programs; all fifteen role baselines pass the unchanged checker.

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
The approved policy retains activity independently of acknowledgment and
navigation. `Render/UrgentStrip.lean` enumerates **all** active urgent rules from
the current facts snapshot, including rules whose commits are not offered.
`Core/CriticalRuntime.effectiveFacts` reconciles critical workflow state and
model time before rendering; a resolved critical result leaves the active list.

The original `render_modal_continuous`, `render_inline_continuous` and
`other_alert_blocked_by_modal` theorems remain unchanged. They describe the old
single-modal renderer and its obstruction. Production uses the additive
`withUrgentStrip` renderer and `Sem/UrgentStrip.lean` layered semantics: strip
facts remain active alongside unrelated modal content. An urgent popup's guarded
acknowledgment moves into the strip, preserving the interpreter's gate.

`active_urgent_in_strip` derives structural coverage from clinical activity,
without presentation assumptions. `strip_continuous_perceivability` proves every
simultaneously active urgent alert perceivable through arbitrary view paths;
`reachable_strip_continuous` lifts this over every reachable interpreter state.
The explicit `StripLayout` model retains the strip while allowing the workspace and dialog to change arbitrarily. It requires the complete finite strip to fit the
viewport, remain legible and occupy an unoccluded layer at every reached moment.
This closes the semantic modal-obstruction gap. It does not prove CSS geometry,
infinite capacity, arbitrary zoom, or continuity between browser samples. The
screen gate measures finite scroll/focus samples and rejects overflow/occlusion.

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

The default urgent IDs come from the owner-approved policy. Operator
`EHR_URGENT_ALERT_IDS` adds IDs and cannot subtract the baseline. Policy content
and gate sources enter the cache context. The urgency samples check emitted
alerts and acknowledgments initially, after scroll start/mid/end and each
enabled focus target. The adapter accepts any visible presentation of the same alert ID, including its pinned strip copy. Exports now carry all active urgent IDs in `urgent`, independent of hidden workflow components. Finite browser samples remain distinct from the universal Lean layout hypothesis.

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
[historical alert findings](https://github.com/saithat/VGI-Health/blob/b63095a7de4532aba59f998277d37b5ddef21167/docs/design/alert-urgency-findings.md).

[onc]: https://www.ecfr.gov/current/title-45/section-170.315#p-170.315(a)(4)
[cms]: https://www.ecfr.gov/current/title-42/section-482.23#p-482.23(c)(1)
[safer]: https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf
[ismp]: https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf

[critical]: https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9
[clia]: https://www.ecfr.gov/current/title-42/section-493.1291#p-493.1291(g)

`node scripts/audit-alert-policy.mjs "$TMPDIR/urgency-policy-audit" --urgency-only`
exports every canonical source variant, then measures each distinct
strip/modal/banner presentation using its largest body as scroll stress, plus
all critical workflow snapshots. `urgency-selection.json` records the full
membership and chosen cases. This focused audit measures urgency; it also
reports physical findings for those representatives. It is not whole-version
approval. Omit the flag for the full supplied-state physical matrix owned by the
physical-policy lane. The tracked [historical follow-through report](https://github.com/saithat/VGI-Health/blob/b63095a7de4532aba59f998277d37b5ddef21167/docs/design/urgency-follow-through.md)
records this lane's final scope and results.
