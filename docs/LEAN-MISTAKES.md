# Funniest Lean mistakes: a small, kernel-checked shortlist

## 1. “The proof is safe. The computer is not.”

We tried reducing large canonical programs inside kernel proofs. The machine
became the counterexample. The orchestrator reported `MacroBadProofs.lean`
driving **one Lean process “past 20 GB”**, followed by the cgroup killing the
whole session, including the agent trying to fix it. Earlier instructions had
already escalated from heartbeats to 12.6 GB RSS to “Do NOT start with a full
`lake build`.” An unusually literal hard stop.

Evidence: `lane-logs/continue-check.log:40–46` (historical local log, not shipped)
(read-only local lane log; the quoted diagnosis is at line 46). The restart is
also recorded in commit [`f58a24e`](https://github.com/saithat/VGI-Health/commit/f58a24ea99107db4ede16fa76b5764ddbf47d1d1),
“WIP: save work interrupted by machine restart (out of memory).” Whole-program
kernel proofs were later parked in opt-in `EhrHeavy` by
[`4a281cb`](https://github.com/saithat/VGI-Health/commit/4a281cb069786f2b8f36c247f8873a78beec1386).
The log attributes this to large kernel evaluation; it is not a measured claim
that every `decide` consumes 20 GB. Please do not reenact this on the demo laptop.

## 2. “Every task finishes, provided there are no tasks.”

Our assembled `Satisfies` example passes. Its hospital has **zero required
commits**. Completion is discharged by simplifying the impossible membership
hypothesis. Throughput: all zero patients, in record time.

Evidence: commit [`37743f8`](https://github.com/saithat/VGI-Health/commit/37743f840b7eb0cec48d5934b3caf49d151c832c),
[verification review §4](VERIFICATION.md#4-can-the-hypotheses-actually-hold), and
[`Sound.lean`](../lean/Ehr/Check/Sound.lean) (`emptySpec`, `emptyProgram`, final
example). The review also appears in `lane-logs/verify.log:11383–11384` under
``. This is a valid, deliberately empty witness—not a false
Lean theorem. The mistake would be selling it as evidence that a clinician can
finish a real task. That missing general completion proof is disclosed.

## 3. “We proved the theorem. Unfortunately, it was the opposite theorem.”

The tempting release claim was: a program satisfying the new rules always
satisfies the old rules. But a release can add a new component kind: the new
screen is legal today and illegal under yesterday's catalog. Lean's response
was the beautifully named **`T8_unqualified_false`**. Congratulations on the
successful proof of the unsuccessful pitch.

Evidence: [`MonotonicityObstruction.lean`](../lean/Ehr/Check/MonotonicityObstruction.lean),
present in commit [`4816d53`](https://github.com/saithat/VGI-Health/commit/4816d53)
(`vocabulary_extends`, `vocabulary_satisfies`, `vocabulary_not_old_satisfies`).
Owner-approved corrected wording is recorded in [`516d272`](https://github.com/saithat/VGI-Health/commit/516d272):
old clinical obligations survive; the component catalog may grow.

**Prize nomination:** #1. A proof assistant that proves the need for more RAM
has excellent physical-world impact.
