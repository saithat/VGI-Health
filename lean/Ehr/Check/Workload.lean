import Ehr.Sim.TaskContext
import Ehr.Check.Graph


namespace Ehr.Check.Workload
open Ehr Ehr.Sim

/-- The scenario's typed surgical stage determines encounter-only entries.
All other conditions remain conservative (including missing clinical facts). -/
def entryPossible (t : Task) : When → Bool
  | .encounter kind => match t.choices.w6Step? with
    | some .preop => kind == "preop"
    | some .postop => kind == "postop"
    | some .consult => kind == "consult"
    | some .rounding => kind == "rounding"
    | some .discharge => kind == "discharge"
    | none => kind != "preop" && kind != "postop" && kind != "consult" && kind != "rounding" && kind != "discharge"
  | _ => true

/-- Conservative field dependencies of the declared workload, including entries
conditional on facts. Explicit service orders cannot vanish with optional UI. -/
def fields (sp : Spec) (tasks : List Task) : List ElementId :=
  (tasks.flatMap fun t =>
    let ch := taskChoices t
    let commits := (taskEpisodes default t).flatMap fun ep => taskCommits sp (episodeWorkflow t ep) ep.choices
    -- Advancing an order line also checks per-line requirements belonging
    -- to other signing artifacts (e.g. the Schedule II earliest-fill field).
    let entries := sp.entries.filter fun r =>
      let advances := commits.contains "signOrders" && ch.orders.length > 1 && r.perOrderLine &&
        (match r.when with
         | .orderClass cls | .drugClass cls => ch.orders.any (fun o => inClass o.drug cls)
         | _ => true)
      (commits.contains r.commit || advances) && entryPossible t r.when
    let reviews := sp.reviews.filter (fun r => commits.contains r.commit && entryPossible t r.when)
    let predicateInputs := (entries.flatMap (fun r => whenCaptures r.when)) ++
      (reviews.flatMap (fun r => whenCaptures r.when)) ++
      (commits.flatMap fun cm =>
        let temporal := ((sp.commit? cm).bind (·.temporal?) |>.getD []).flatMap
          (fun r => r.when?.toList.flatMap predicateCaptures)
        let expiry := ((sp.commit? cm).bind (·.expiry?) |>.getD []).flatMap
          (fun r => r.when?.toList.flatMap predicateCaptures)
        temporal ++ expiry)
    let explicitChoices :=
      (if t.workflow == .W7 && ch.refillReason?.isSome then
        if ch.refill? == some "deny" then ["refillDenyReason"] else ["refillNote"] else []) ++
      (if ch.painScore?.isSome && !(t.workflow == .W4 && ch.administer.isEmpty) then ["painScore"] else [])
    let waivers := if (taskCuresReason ch).isSome then reviews.filterMap (·.waivedBy?) else []
    entries.map (·.element) ++ predicateInputs.map (·.1) ++ explicitChoices ++ waivers ++
    (if ch.orders.any (fun o => o.kind?.getD .medication != .medication) then
      ["orderKind", "orderCode"] else [])).eraseDups

/-- Only reachable, revealable fields count. Orphans, cycles, tiny controls and
unreachable screens cannot satisfy a workload declaration. -/
def hasField (p : Program) (e : ElementId) : Bool :=
  let reachable := (bfs p (openGotoEdges p) p.start).map (·.1)
  p.screens.any fun s => reachable.contains s.id && s.components.any fun c =>
    revealable s.components c &&
    match c.kind with | .field el _ _ => el == e | _ => false

/-- Additive release capability specification, independent of optional-feature
acceptance. Structural availability is necessary, not a completion theorem. -/
def KeepsFields (required : List ElementId) (p : Program) : Prop :=
  ∀ e ∈ required, hasField p e = true

def missing (required : List ElementId) (p : Program) : List ElementId :=
  required.filter (fun e => !hasField p e)

def check (required : List ElementId) (p : Program) : Bool := required.all (hasField p)

theorem check_sound (required : List ElementId) (p : Program)
    (h : check required p = true) : KeepsFields required p := by
  intro e he
  exact List.all_eq_true.mp h e he

/-- The native publication gate uses `missing.isEmpty` directly. -/
theorem missing_empty_sound (required : List ElementId) (p : Program)
    (h : (missing required p).isEmpty = true) : KeepsFields required p := by
  intro e he
  have empty : missing required p = [] := List.isEmpty_iff.mp h
  have hm := List.filter_eq_nil_iff.mp empty e he
  simpa using hm

#print axioms missing_empty_sound
#print axioms check_sound
end Ehr.Check.Workload
