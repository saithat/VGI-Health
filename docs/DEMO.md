# Judge demo · 3 minutes 55 seconds

“Every night, AI redesigns your doctor's screen to reduce clicks, scrolling and mouse travel. The hospital writes
the rules; Lean rejects shortcuts that remove required safety steps.”

## Before the clock starts

Run `make install && make run`. Use **one browser**, one tab, at
**http://localhost:5173/?inspect=1**. All people and patients are synthetic. No model key
is needed for this script: the overnight segment plays a committed **real Codex
run**, `run1-P3`, not a new model call. The live segment writes to local Medplum.

Rehearse the note below on an available P1 clinic patient from the department workspace. Keep the
actual selected patient and encounter visible; don't promise that a completed
shared work item will still be waiting on the next rehearsal. The UI browser exposes version history and readable diffs.

## 0:00–1:30 · This is a working EHR

**Say:** “This is Maya, a primary care doctor. The screen has the chart, the
history, and all the paperwork. Let's actually save a visit.”

1. At **http://localhost:5173/** click **P1 · Primary care**. The local persona
   button logs in; no password needs to appear on the projector.
2. Keep `?inspect=1` in the URL. The current department workspace starts on a patient list. Choose an available clinic row using **Open chart:**; keep the actual patient and encounter visible and avoid reusing a completed shared visit.
3. Complete the displayed rooming fields and required reviews. Use **Review medications**, then **History / ROS**, then **Exam / Assessment & Plan**. Enter the required medication decisions and clinical narrative on the displayed screens.
4. Enter **Encounter diagnosis (ICD-10-CM)** `I10`. Open **Sign Visit**. Set **E/M service level** `99213`, **Return in** `4 weeks`, and **After-visit instructions** `Check home BP daily.` Complete any displayed required review or acknowledgement before signing. Never narrate a disabled button as a saved note.
5. Keep **?inspect=1** in the live URL for the presenter resource view. After **Sign Visit**, point to the notification titled **Medplum** and click **View saved record 1** (or another returned record). To show the persistent receipt, click **Live encounter** and find **Saved resources** with the returned DocumentReference, Observation, Condition and ChargeItem links. Only describe resource types actually returned.

**Say:** “Some friction can go. Reviewing the right patient's information and
making a human decision still matter.” Filing the note first also persists the
weight before a later prescription; this short demo stops at the saved note.

## 1:30–2:15 · Overnight, the screen learns Rosa's routine

Navigate to
**http://localhost:5173/dashboard?run=run1-P3&view=Evolution&persona=P3**.

1. Point to **P3**, Rosa the inpatient nurse, and the recorded real-run label.
   In **Measure**, use **Exact expert minimum (min-clicks)**; choose **Clicks**
   in **Complexity metric**. The fixed W4 case goes **25 → 23 clicks** from v0
   to v1. Describe only metrics visible in the selected view.
2. Click **rev 1 · Night 2** in **Revisions and decisions**. Show the evidence,
   hypothesis, candidates and choice. Click **Before / after on screen** and
   **Next task event** to compare the real EHR screens. Close **Close EHR
   replay**, then **Close decision record**.

**Say:** “We removed travel through the interface, not the second nurse or the
patient scan. Every change has a receipt: what the agent tried, why it chose it,
and what happened.” These are exact minima **within the recorded search
space**, for a fixed representative task—not measured doctor time, a global
optimum, or a claim of equal savings on every shift. Source:
[`runs/run1-P3/complexity.json`](../runs/run1-P3/complexity.json).

## 2:15–2:55 · Try a dangerous shortcut

Open
**http://localhost:5173/dashboard?run=run1-P3&view=Try+to+break+it&persona=P3**.

1. Under **Recorded proposal**, select the **Night 2** proposal beginning
   **“Pre-fill patient-ID re-entry…”**. Click **Show recorded verdict**.
2. Point to **Rejected · humanOnlyKept** and read the reason:
   **“field w1Sign.patientIdReentry on screen w1Sign prefills patientIdReentry,
   which a human must enter every time.”**
3. Click **Replay counterexample**. Step the recorded event path to its screen
   with **Next event**, then close **Close EHR replay** and
   **Close decision record**.

**Say:** “Saving six keystrokes sounded great. It also removed an intentional
human check. The checker said no.” This particular tempting proposal was
**seeded**, not an independent discovery by Codex. It was checked by the real
checker. **Show recorded verdict** replays that result; it does not submit a
fresh audience request. The source is
[`night-02/P3.json`](../runs/run1-P3/decisions/night-02/P3.json).

For a genuinely new check, the presenter can run the native checker on a supplied
bad program, without an LLM or internet:

```sh
lean/.lake/build/bin/ehr check --spec releases/v1/spec.json \
  --program programs/bad/02-prefilled-identity.json \
  --canonical releases/v1/canonical.json
```

Exit **1** with a violation is the expected success of this rejection demo.
The UI recorded path above is the timed presentation route.

## 2:55–3:25 · One hospital, five branching histories

Open **http://localhost:5173/browse**. The branching persona timeline is implemented. Select the recorded run and persona using the visible selectors, then select a revision node to inspect its details and open that exact EHR. Rejected branches show the recorded reason; vendor release markers show rechecks. Name `mock (illustrative)` as an authored illustration whenever used.

**Say:** “The hospital has one set of rules. The nurse and the surgeon can have different screens, and you can inspect every fork.”

## 3:25–3:55 · Why the verification matters

**Say:** “The rules run in Lean, and that same screen logic runs here in the
browser. We proved that a commit needs its guard, that a reused review matches
the record's version and age, and that a macro cannot impersonate the human.
The checker has proofs for twelve of thirteen properties. The remaining general
completion proof—can you always finish?—is still open. We test the browser and
the database adapter. We do not prove that treatment is medically correct, or
that the hospital remembered every rule.”

Open [**docs/VERIFICATION.md**](VERIFICATION.md) in the repository, starting with
its first two paragraphs, then its proof table and trusted-code section. The
current release is the **core** rule profile; do not imply the entire regulation
catalog is active. Every proof claim and remaining gap is linked there.

## 30-second elevator version

“Doctors and nurses waste clicks because one screen tries to serve everyone.
Our AI redesigns each person's interface overnight. But it can't just remove
annoying safety steps: a Lean checker rejects those changes. The same Lean
interpreter actually runs the screens in your browser. Here is a real saved
visit, a nurse's recorded screen going from 25 to 23 clicks, and a shortcut
rejected because it tried to fill in a human identity check. Faster screens,
with an inspectable reason for every change.”

## The “ooh” moments

- **A real save:** the signed note has actual FHIR resource links.
- **The app runs the proof's interpreter:** every EHR click goes through Lean WASM.
- **Less travel, same obligations:** 25 → 23 clicks; the required fields remain.
- **The optimizer gets told no:** a readable explanation and a replayable path.
- **Personal histories:** accepted versions, rejected branches and release changes.
- **No demo-time API dependency:** the recorded overnight run plays locally.

## Curated integrated-build captures

Captured from the served build at `http://127.0.0.1:5180` in replay mode. These supersede earlier screenshots.

| Persona | Landing | Chart |
|---|---|---|
| P1 | [Landing](../app/shots/final/P1-landing.png) | [Chart](../app/shots/final/P1-chart.png) |
| P2 | [Landing](../app/shots/final/P2-landing.png) | [Chart](../app/shots/final/P2-chart.png) |
| P3 | [Landing](../app/shots/final/P3-landing.png) | [Chart](../app/shots/final/P3-chart.png) |
| P4 | [Landing](../app/shots/final/P4-landing.png) | [Chart](../app/shots/final/P4-chart.png) |
| P5 | [Landing](../app/shots/final/P5-landing.png) | [Chart](../app/shots/final/P5-chart.png) |

[UI browser timeline](../app/shots/final/ui-browser-timeline.png) · [Dashboard](../app/shots/final/dashboard.png) · [Capture hashes](../app/shots/final/manifest.json).

Old-UI MP4s were removed. [Integrated-build replay walkthrough](recordings/integrated-replay-walkthrough.mp4) replaces them; the later full-run recording remains pending until that run finishes.
