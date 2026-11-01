# VGI Health

An EHR whose screens adapt to each clinician's work. An overnight AI agent
proposes UI changes; the Lean checker blocks changes that violate the hospital
rules. The same Lean interpreter runs natively and in the browser as WebAssembly.

## Read the Lean

Start with these files, in order:

1. [Statements.lean](lean/Statements.lean): the main theorem statements and trusted definitions.
2. [Props/Properties.lean](lean/Ehr/Props/Properties.lean): the thirteen UI requirements.
3. [Specs/V1.lean](lean/Ehr/Specs/V1.lean): hospital rules, with law and policy labels.
4. [Core/Interp.lean](lean/Ehr/Core/Interp.lean): the interpreter the app runs.
5. [Check/Sound.lean](lean/Ehr/Check/Sound.lean): what checker acceptance proves.
6. [Render/UiProofs.lean](lean/Ehr/Render/UiProofs.lean): how the EHR tree preserves controls and information.

[VERIFICATION.md](docs/VERIFICATION.md) records the proof scope, trusted code and
open gaps. Checker implications cover 12 of 13 properties; general completion
still requires a separate proof. Current releases use the **core** rule profile.
Browser drawing, record adapters and clinical rule completeness are outside
these proofs. Allowed proof axioms are propext, Quot.sound and Classical.choice.

## Run it

Install Node 22.18+, pnpm 11.8.0, [elan](https://github.com/leanprover/elan),
a C toolchain, and Docker with Compose and a running daemon.

```sh
git clone https://github.com/saithat/VGI-Health.git
cd VGI-Health
make install && make run
```

Open **http://localhost:5173/**. Installation starts Medplum, loads synthetic
patients, seeds worklists and creates a private `.env`. If another checkout
already uses the named Medplum stack, copy its `.env` locally first to preserve
the shared credentials. No AI API key is needed for local work or replay.

The **Demo / replay** link opens the offline catalog. For that catalog alone,
use `pnpm install && make run`. The dashboard includes the recorded `run1-P3`
trajectory; its archived replay preserves the recorded clinical events.
Use `make run APP_PORT=5187` if the default port is occupied.

See [DEMO](docs/DEMO.md), [current status](docs/STATUS.md), and the
[clean-clone check](docs/CLEAN-CLONE.md). `make wasm-check` checks the committed
WASM source binding; `make wasm` rebuilds it using the local toolchain.

The trusted system includes the reviewed hospital spec, Lean and Emscripten,
FHIR adapters, Node/React/browser, Docker/Medplum and the synthetic source data.
These software proofs do not establish clinical correctness.

## Data sources and credits

CPT: the mapper includes a small set of code identifiers and original short
labels, without a full catalog or AMA descriptors. CPT is an AMA trademark;
see the [AMA licensing requirements](https://www.ama-assn.org/practice-management/cpt/cpt-licensing-faqs).

- **Synthea**: synthetic patients, conditions, medications, labs and encounters
  (fixtures/synthea), loaded into Medplum. Synthea is Apache-2.0 licensed: Walonoski J,
  et al. *Synthea: An approach, method, and software mechanism for generating
  synthetic patients and the synthetic electronic health care record.* JAMIA 2018;
  25(3):230–238. https://github.com/synthetichealth/synthea
- **Synthetic Hospital** (Park, Chen, Dettmers): we import its released synthetic
  longitudinal records for chart realism. These are patient profiles with allergies,
  home medications, history and social history, plus encounters with full clinical
  notes. Code is MIT licensed; the released data is "fully synthetic and
  redistributable". Cite: Park, Chen, Dettmers. *Synthetic Hospital: An Open,
  Verifiable, Physician-Validated Longitudinal EHR Benchmark.* Preprint, 2026.
  https://arxiv.org/abs/2609.30027 · https://github.com/sparkcpark/synthetic_hospital
  Pinned source: `911f34c4ac65a508543c4b3b90c373a0cd16534d`.
  We converted and loaded **150 patients, 637 encounters/notes, 4,383 resources**
  into local Medplum; primary persona selections are 30 each for P1–P5,
  including 34 pediatric patients. The committed FHIR cohort is 6.68 MB,
  uncompressed, with source tags and per-patient Provenance. Opt in with
  `make seed SYNTHETIC_HOSPITAL=1` (also supported by `make install`), or run
  `make load-synthetic-hospital`. Mapping, checksums and limitations:
  [import guide](scripts/synthetic-hospital/README.md). The upstream CITATION.cff
  supplies citation details. Its Epic-style simulator informed chart organization;
  no code or screens were copied.
- **Medplum** (Apache-2.0): FHIR R4 backend. https://github.com/medplum/medplum
- EHR screen patterns follow public documentation and screenshots of real EHRs
  (sources in docs/design/ehr-ui-research.md). No proprietary vendor screens
  were copied.

## Malleable software

[Ink & Switch's Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
describes software people can shape to their needs. Each clinician has a role
view that the agent can revise within the hospital rules. Readable diffs and
version history expose the changes; certification gates deployment.
