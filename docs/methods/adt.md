# Administrative ADT extension

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`AdtModel` separates the complete sorted board read set from changed patient/bed
streams. It executes admit, assign, transfer, swap, cancelAdmit, cancelTransfer,
cancelDischarge, release, discharge, clean and ready through the native reducer.
Transfer and cancelTransfer publish patient + source bed + target bed atomically;
swap publishes both patients and both occupied beds in one transaction. Private UPDATE and event INSERT are separate steps, so
crashes before/after each stream write, before outcome staging, and after COMMIT
are explicit. Rollback discards all provisional writes; a lost COMMIT reply
preserves the complete durable outcome. Version counts include only changed
streams. Provisioned boards, including admitted unplaced patients, are explicit
baselines rather than empty-state assumptions.

| ADT statement (`Ehr.Commit.Protocol.AdtModel`) | Evidence |
|---|---|
| Same bed ID cannot have two patients; a patient cannot occupy two bed IDs | Unbounded `bed_exclusivity`, `patient_one_bed` for every `Reachable` interleaving from a valid baseline |
| Board equals native reducer fold of accepted transaction events | Unbounded `projections_equal_fold` |
| One multi-stream effect per actor/request ID; durable retries return the identical answer | Unbounded `no_duplicate_accepted`, `retry_stable`, `receipt_persistent`, `changed_payload_no_effect` |
| Events and accepted receipts correspond both ways | Unbounded `no_lost_accepted`, `no_phantom_effect` |
| Exact changed-stream set and guard at replaced versions | Unbounded `guards_and_writes_on_replaced_versions` |
| Every individual provisional event INSERT leaves durable state unchanged | Unbounded `partial_write_private`; all other steps covered by `advance_publication`, `machine_invariant` |
| No finite circular wait under strict ordered acquisition prefixes | Unbounded `LockOrder.no_wait_cycle`, conditional on the lock-plan correspondence |
| Actual machine locks follow sorted prefixes, remain exclusive and have no wait cycles | Bounded `AdtCheck`; host lock sequences checked in traces |

The lock hierarchy is request reservation → optional clinical session → sorted
streams; administrative commands take no session lock. Each transaction acquires
one request and at most one session. No writer holding streams acquires a later
request/session. Provisioning and offline import are excluded online writers.
The theorem does not prove Postgres internals, lock timing, absence of every SQL
error, starvation freedom or eventual response. A deliberately reversed stream
order is a detected circular-wait control.

**Administrative policy.** These are
local simulation policies, not additional clinical regulations. A17-style `swap`
requires two different admitted, placed patients, distinct beds and current
ownership of both occupied beds. Both beds must have `active = true`; provisioning
takes this fixed availability flag from the configured closed board (default true).
Admission, assignment,
transfer destinations and cancellation destinations also require active beds.
There is no online activation/deactivation command and no additional unit/service
compatibility restriction in the existing reducer. The signed actor must have the whole board's unit/patient scope. Swap
records completed placement atomically; physical transport is separate. Two
opposite transfers into occupied beds remain refused.

Every patient ADT transition advances `revision`, a patient-scoped event ordinal.
`encounter` is the admission ordinal (zero for imported encounters). Existing
boards missing these fields are read with zero/null/active defaults, without
default-only writes or version resets; pre-extension movements are not cancellable.
The immutable
accepted event log records each transition; `patient:revision` identifies its
original event. `last` retains only the latest cancellable movement. Clinical
chart edits do not advance this ADT ordinal. Assign, release, swap and cancellation
clear `last`; later admission/transfer/discharge replaces it. Thus **all three
cancellations require the original to be the patient's latest ADT event**, of the
matching kind, with a positive exact ordinal supplied in the event field:

- A11 `cancelAdmit`: patient still admitted in that admission's bed. End placement,
  mark the bed dirty and mark that encounter `entered-in-error`.
- A12 `cancelTransfer`: patient still owns the recorded destination; the recorded
  origin must be empty **and ready after cleaning**. Move back atomically and
  mark the destination dirty. No implicit hygiene override.
- A13 `cancelDischarge`: patient remains discharged/unplaced; caller explicitly
  chooses an empty ready bed, which may differ from the original. Reopen the
  same encounter and remove its end time; never create a replacement encounter.

Only charge nurses and bed managers can swap/cancel; admitting clerks retain
admit/assign permissions. Cancellations compensate **current** state, never load
an old chart/board snapshot. Clinical documentation, orders, administrations and
their original encounter links remain intact, including records from the
cancelled interval. Cancellation does not retract clinical work. A cancellation adds FHIR Provenance targeting the
encounter and referencing the original patient ADT ordinal. Encounter sequence
extensions prevent reopening another completed episode; ambiguous/missing
encounters refuse. Encounter location history is retained. The board exposes
latest-event identity, separate swap/cancel controls and specific refusal reasons.
Full sorted-board locks plus exact read vectors serialize bed reuse, transfer,
discharge, swap and cancellation; a stale command must be resubmitted with a new
request ID after review. Identical-ID retries retain the exact durable outcome.

The world CLI now exports `adt.json` (`adt-realism-v1`) alongside its clinical
schedules by default; `--adt off` selects historical generation without that
sidecar. `world/src/adt.ts` consumes the same initial census and timed admission/
discharge records, then executes every administrative transition through one
native `ehr serve` child. It adds same-unit transfers (0.03 per placed patient-day),
one possible same-unit swap (0.05 per board-day), erroneous admissions (0.01 per
admission), erroneous transfers (0.02 per transfer) and erroneous discharges
(0.002 per placed patient-day), followed by linked compensating corrections.
These low-frequency rates and 30-minute cleaning / 5–20-minute transport delays
are **provisional simulation assumptions**, not measured incidence estimates.
[HL7 v2 chapter 3](https://hl7.eu/HL7v2x/v29/std29/ch03.html) defines the A11–A13/A17
movement/correction categories; [FHIR R4 Encounter](https://hl7.org/fhir/R4/encounter.html)
distinguishes encounter lifecycle and location history. Neither source calibrates
these frequencies or approves this local cancellation policy.

The sidecar starts with 12 beds per service. When an admission has no ready
bed but the service has an empty dirty bed, an explicit native clean/ready
sequence precedes reuse, retaining the 30-minute cleaning delay. An actually
occupied service still refuses capacity exhaustion. Turnover can delay the
administrative event clock; clinical schedules are unchanged. The regression
fills a service, replaces a discharged patient after cleaning and separately
checks refusal when every bed remains occupied.

Administrative operator events and separate delayed transport completion/
supersession records are seed-deterministic; transports are not placement
authority. The sidecar does not change frozen clinical random streams, tasks,
rooms, schedules or chart documentation. Thus it exercises administrative
workload and occupancy, not clinical task effort for an ADT operator, nor a shared
physical-location model driving bedside MAR. Reservations and bed holds remain
out of scope. Forced-rate regression exercises swap, all three cancellations,
admission, transfer, discharge, cleaning and ready transitions against native
Lean, including stale transport supersession. The board controls change the certified app hash. Source-bound WASM/assets,
app bindings and recording certification/replay evidence must match the combined build.

The generic unbounded protocol invariants quantify over the expanded command
type, so their fold, exclusivity, request-uniqueness and atomic-publication claims
include swap and all three cancellations. `swap_atomic` specifies the complete
exchange successor; `cancellation_references_latest` binds every accepted
cancellation to the patient's latest ADT event, of the matching kind;
`cancellation_preserves_encounters`
preserves the complete patient-ID/encounter-identity projection under all three
compensations. `swap_active` requires both beds active at acceptance. Lock-order
exclusion remains the conditional unbounded `LockOrder.no_wait_cycle`; executable machine/host lock
correspondence remains bounded/tested. The expanded checker covers both inactive
bed refusals and the new movement races; its finite bounds are distinct from these
universally quantified safety statements.

Clinical placement's non-ADT guard and session checks remain explicit abstract
inputs; administrative guard decisions execute the native reducer without an
oracle. FHIR projection functions, initial provisioning and TypeScript/SQL
refinement remain tested rather than proved. See the
[prior ADT verification record](../audits/adt-model-20261107.md) for the earlier
bounds and historical audit receipts. The swap/cancellation checker exhausts
**33,467 transaction states / 244,133 transitions across 27 scenarios** (maximum
shortest-path depth 56), plus **1,257 reducer boards / 11,728 accepted edges** with
two patients, two beds, all three roles and up to three patient ADT events per
board (accepted boundary successors are also validated). Transaction graphs use
fixed request contents/IDs and include arbitrary repeated crashes, retries and
timeouts at every modeled phase, including each provisional UPDATE/INSERT pair.
No counterexample occurred; all six unsafe controls were detected. The original
protocol checker separately exhausts 21,393 transaction states and 81 cache states.

The regression suite uses an isolated Postgres primary and two actual hosts.
It tests legacy-board defaults without phantom writes; opposite-transfer refusal;
four-stream atomic swap; all cancellation eligibility/refusal paths; stale event
references; cancellation racing origin/destination reuse, transfer, discharge and
swap; late INSERT rollback; and lost COMMIT reply recovery for swap and all three
cancellations. Patient-scoped histories expose the action name and this patient's
successor only, so swap operands cannot disclose another patient. A mixed clinical
regression found an ED-disposition projection defect during implementation: using
the finished ED source encounter could create a second inpatient episode. The
fix selects the newly projected inpatient child and cancellation reopens that
same child. Clinical resources and encounter references survive unchanged.

The service integration suite requires a fresh PostgreSQL instance and the generated
native fixture. Its ADT and mixed clinical traces cover four-stream publication,
latest-event compensation, encounter retention, rollback and uncertain COMMIT.
Use the [protocol reproduction commands](commit-protocol.md#reproduction);
retained traces are scratch artifacts.
