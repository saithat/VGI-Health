import Ehr.Sim.Goals

/-!
Trace-derived activation counts and KLM time. A hotkey is one activation
(`clicks`), charged as K rather than P+C; it saves time, not activations.
K/P/C/H/M are Card, Moran & Newell (1980), in milliseconds. Scan, interruption
wait and scroll are explicitly labeled modeling assumptions. Homing is inferred
between mouse operators and keys, across event boundaries as well as within one.
-/
namespace Ehr.Sim
open Ehr

/-- K, P, C, H, M and the three modeling assumptions, all in milliseconds. -/
def keyMs := 200
def pointMs := 1100
def clickMs := 100
def homeMs := 400
def mentalMs := 1350
def scanMs := 1500
def waitMs := 60000
def scrollMs := 1100

def opMs : Op → Nat
  | .key => keyMs | .point => pointMs | .click => clickMs
  | .think => mentalMs | .scan => scanMs | .wait => waitMs | .scroll => scrollMs

def device : Op → Option Bool
  | .key => some true
  | .point | .click | .scroll => some false
  | _ => none

/-- Returns time and last hand position. Neutral operators preserve position. -/
def klmFold (last : Option Bool) (ops : List Op) : Nat × Option Bool :=
  ops.foldl (fun (ms, prev) op =>
    let next := device op
    let home := match prev, next with
      | some a, some b => if a != b then homeMs else 0
      | _, _ => 0
    (ms + opMs op + home, next.or prev)) (0, last)

def klmMs (ops : List Op) : Nat := (klmFold none ops).1

/-- Characters actually typed (coded values use a four-character type-ahead
plus acceptance key; scans and flag choices type no characters). -/
def typedLen : Value → Nat
  | .qty t _ => (tenthsText t).length
  | .code c => min c.length 4 + 1
  | .text s | .user s => s.length
  | .flag _ => 0

def activation (e : Event) (ops : List Op := []) : Nat :=
  match e with
  | .scroll _ => 0
  | .enter _ _ => if ops.contains .scan then 0 else
      max 1 ((ops.filter (· == .click)).length +
        if (ops.find? (fun op => (device op).isSome)) == some .key then 1 else 0)
  | _ => 1

def typedKeys (e : Event) (ops : List Op := []) : Nat :=
  match e with
  | .enter _ v => if ops.contains .scan then 0 else if ops.isEmpty then typedLen v else
      (ops.filter (· == .key)).length -
        (if (ops.find? (fun op => (device op).isSome)) == some .key then 1 else 0)
  | .search q => q.length
  | _ => 0

def emptyMetrics (task : String) : TaskMetrics :=
  { task, clicks := 0, keystrokes := 0, scrolls := 0, popups := 0,
    overrides := 0, searches := 0, backtracks := 0, klmDeciSec := 0, completed := false }

def addMetrics (a b : TaskMetrics) : TaskMetrics :=
  { a with
    clicks := a.clicks + b.clicks, keystrokes := a.keystrokes + b.keystrokes,
    scrolls := a.scrolls + b.scrolls, popups := a.popups + b.popups,
    overrides := a.overrides + b.overrides, searches := a.searches + b.searches,
    backtracks := a.backtracks + b.backtracks, klmDeciSec := a.klmDeciSec + b.klmDeciSec,
    completed := a.completed && b.completed }

/-- Screen reversals count only arrivals, not repeated actions on one screen. -/
def countBacktracks (trace : List TraceEvent) : Nat :=
  let arrivals := trace.foldl (fun (xs : List String) t =>
    if xs.head? == some t.screen then xs else t.screen :: xs) []
  let (_, _, n) := arrivals.foldl (fun (a, b, n) c =>
    (b, some c, n + if a == some c then 1 else 0))
    ((none, none, 0) : Option String × Option String × Nat)
  n

/-- Every effort metric is computed from the trace; completion is supplied by
checking final goals against the actual interpreter state. -/
def metrics (task : String) (trace : List TraceEvent) (completed : Bool) : TaskMetrics := Id.run do
  let ts := trace.filter (·.task == task)
  let mut m := emptyMetrics task
  for t in ts do
    m := { m with
      clicks := m.clicks + activation t.event t.ops,
      keystrokes := m.keystrokes + typedKeys t.event t.ops,
      scrolls := m.scrolls + (match t.event with | .scroll _ => 1 | _ => 0),
      popups := m.popups + (match t.event with | .ack _ => 1 | _ => 0),
      overrides := m.overrides + (match t.event with
        | .ack _ => if t.ops.contains .think then 0 else 1 | _ => 0),
      searches := m.searches + (match t.event with | .search _ | .enter "workspace.search" _ => 1 | _ => 0) }
  return { m with
    backtracks := countBacktracks ts,
    klmDeciSec := klmMs (ts.flatMap (·.ops)) / 100, completed }

/-- Ideal interface: no travel; permitted prefills are available, human-only
and never fields are typed. Showing reviews on the commit screen costs zero.
Exemption entry, if chosen, remains an ordinary value goal. -/
def floorMetrics (task : String) (sp : Spec) (facts : Facts) (user : User) (g : Goals) : TaskMetrics := Id.run do
  let mut m := emptyMetrics task
  let mut ms := 0
  for v in g.values do
    if let some el := sp.element? v.element then
      let scan := match el.kind with | .scan _ => true | _ => false
      let linked := el.prefill == .autoLinked && !needsHuman el
      let keys := if !scan && (needsHuman el || el.prefill == .never)
        then typedLen (goalValue sp facts user v) else 0
      m := { m with
        clicks := m.clicks + (if scan || linked then 0 else 1),
        keystrokes := m.keystrokes + keys }
      ms := ms + if linked then 0 else mentalMs +
        (if scan then scanMs else keyMs + keys * keyMs) +
        (match el.kind with | .cosign => waitMs | _ => 0)
  ms := ms + g.commits.length * (mentalMs + keyMs) +
    g.expectedAcks.length * (mentalMs + pointMs + clickMs)
  return { m with
    clicks := m.clicks + g.commits.length + g.expectedAcks.length,
    popups := g.expectedAcks.length, klmDeciSec := ms / 100, completed := true }

def below (a b : TaskMetrics) : Bool :=
  a.clicks ≤ b.clicks && a.keystrokes ≤ b.keystrokes && a.scrolls ≤ b.scrolls &&
  a.popups ≤ b.popups && a.overrides ≤ b.overrides && a.searches ≤ b.searches &&
  a.backtracks ≤ b.backtracks && a.klmDeciSec ≤ b.klmDeciSec

#guard typedLen (.qty 725 .kg) == 4
#guard klmMs [.point, .click, .think, .key] == 3150
#guard activation (.enter "scan" (.code "p")) [.scan] == 0
end Ehr.Sim
