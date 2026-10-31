# Certified Adaptive Clinical Interfaces

Every night an AI agent redesigns each clinician's EHR screens to save them clicks. A Lean checker, proven correct, certifies every version before anyone logs in. The app's screen logic is the verified Lean code itself, compiled to WebAssembly.

- Project spec: [`BRIEF.md`](BRIEF.md)
- Core data formats and interpreter semantics: [`docs/design/core-model.md`](docs/design/core-model.md)
- Lean practices: [`CLAUDE.md`](CLAUDE.md) · Proof status: [`TODO_PROOFS.md`](TODO_PROOFS.md)

## Quick start
```
make install   # needs Docker, Node 22, pnpm, elan
make run
```

## Owner review checklist
1. Do the seeded bad programs still fail, with readable counterexamples replayed on real screens?
2. Do spec, property, or statements-file diffs exist? If so, approve each one explicitly.
3. Are `lake check`, Comparator, and the axiom audit clean?
4. Do decision records include alternatives, plus predicted versus measured savings?
5. Does the rendered commit screen show the banner, allergies, and dose check (fidelity test)?

## Status
Under construction (hackathon build, deadline Sun Nov 1, 4:30 PM PDT).
