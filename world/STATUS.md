# World status

Full continuation details and exact remaining work: [HANDOFF-world.md](../HANDOFF-world.md).

The real 174-patient Synthea population is validated. All 25 formulary entries
match Lean. The committed ten-day seed-1 replay is 5.4 MB and loads through
the real agent world loader. It includes persona parameters, flat schedules,
agent-compatible nested schedules, states and manifests. World build/lint and
81 tests pass; Lean build and agent typecheck/lint/31 tests pass.

Remaining: merge lean-core's typed clinical-choice/order-kind additions when
published; migrate note metadata, emit P1/P5 imaging/procedure orders for
prior auth, then regenerate the committed replay and rerun checks. The latest
inspected core branch (52206f9) does not yet contain those fields. Integration
requests are recorded in [changes-requests.md](../docs/design/changes-requests.md).

Run `cd lean && lake build` before world tests. The world contract suite uses
one `lake env lean --run` process; do not run another lake process alongside it.
