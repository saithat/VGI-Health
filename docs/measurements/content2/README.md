# Content realism measurements

`complexity-before.json` and `complexity-after.json` use the existing benchmark suite, the actual interpreter and its certified minimum search. The before input is the vendor reference at the lane's starting revision; the after input is regenerated from this lane's Lean source. These files do not replace the frozen historical benchmark or any recorded run.

Reproduce the after measurement:

    LEAN_NUM_THREADS=8 pnpm complexity --release-root releases --out docs/measurements/content2/complexity-after.json

The command also records the native `ehr min-clicks` result and replayable click/keystroke paths. Bounds and search-space qualifications remain the ones reported by the existing measurement tool.

Baseline revision: `edd40f9aaff3e282f719aeed248edd985e04a6d0`.
Across the existing seven-workflow suite, the before/after totals are identical:
v1/v2: 239 clicks, 973 keystrokes, 873.1 KLM seconds; v3: 241 clicks,
983 keystrokes, 881.8 KLM seconds. The new source rows and read-only context
introduce no additional task steps in that suite.

The final control receipt in `buttons/` covers the live canonical EHR for all five personas, with an explicit eight-observed-state limit per persona. Remaining checkpoints are reported by the harness; this is a sampled control audit, not exhaustive state search. `buttons-app-before-main.json` retains the completed 452-control app-shell sample from source revision `775312e` before the later presentation merge. It is kept separate from the final painter's control counts.


The in-UI selection follow-up is recorded separately in
`patient-selection-validation.json`. Each fresh task starts without a patient,
selects a source row or uses name/MRN lookup, and pays the selection interaction
cost before clinical work. `patient-selection-world2.json` records all 1,284
completed tasks. `patient-selection-cost.json` compares the exact selection
prefix for the real RN baseline and archived agent layouts on days 1, 5 and 10.
`patient-selection-geometry.json` measures those prefixes in Chromium for all
five roles and the later RN days; its common pointer entry and sample bounds are
explicit in the receipt.

`patient-selection-buttons-final/` is the final live canonical sample, limited
to three observed states per persona. It includes the unselected landing state
and the bound chart. The earlier `buttons/` receipt remains the first milestone's
sample. Interrupted development samples are not final evidence.

Saved `run1-P3` trajectories retain their recorded semantics and verify without
modification. Interactive historical layouts verify their original source and
certificate, then use the same fixed selection wrapper as the current programs.
The wrapper never supplies patient identity re-entry or wristband captures.

The button sample resolves restored controls by their certified component/event
identity. Its response timer starts after positioning the target in view;
Playwright's automatic scroll/layout wait is setup. The approximately 2-second
response limit is unchanged. Development samples flagged one lookup row at about
4.5 seconds; focused live tests opened that patient and all 19 matching rows
successfully. A prior Saved notification covered that row in the combined
audit; restoration now dismisses prior notifications through their real close
controls. The final receipt records the complete semantic sample. Selection
interaction/scroll costs remain in the simulator and Chromium geometry receipts.

Live chart opening paints a loading status before dispatching the potentially
large projection. Selection still passes through the same Lean action and exact
source identity binding; clinical controls stay inert until loading completes.
