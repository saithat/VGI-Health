# Top-level targets. Lanes fill these in as they land.
.PHONY: start install run run-live check verify lean app infra-up infra-down infra-wait infra-reset setup load seed synthea fixtures wasm wasm-check

COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
export TMPDIR ?= $(CURDIR)/.cache/tmp
$(shell mkdir -p "$(TMPDIR)")
export CI := true
# Bound fresh Lean builds on shared development/judging machines.
export LEAN_NUM_THREADS ?= 4
APP_PORT ?= 5173
LIVE_WORLD ?= runs/world/2
LIVE_DAYS ?= 10
LIVE_ARGS ?=
SYNTHETIC_HOSPITAL ?= 1
SEED_ARGS ?=

start:
	@command -v pnpm >/dev/null || { echo "Install pnpm 11.8.0 with npm install -g pnpm@11.8.0"; exit 1; }
	@pnpm start

# Fresh setup imports immutable baselines before starting the online writer.
install:
	cd lean && lake build
	pnpm install --frozen-lockfile
	$(MAKE) wasm-check
	$(MAKE) setup
	$(MAKE) infra-up
	$(MAKE) load
	$(COMPOSE) --profile app up -d commit
	node infra/scripts/wait-healthy.mjs

run:
	$(MAKE) wasm-check
	pnpm --filter app build
	node scripts/demo-urls.mjs $(APP_PORT)
	pnpm --filter app exec vite preview --host 127.0.0.1 --port $(APP_PORT) --strictPort

# Run agent nights on the selected world; generate it only when absent.
run-live:
	@set -eu; \
	backend=codex; \
	$(MAKE) infra-up; \
	if [ ! -f "$(LIVE_WORLD)/world.json" ]; then \
	  pnpm --filter world gen --seed 7 --days $(LIVE_DAYS) --out $(LIVE_WORLD); \
	fi; \
	pnpm --filter agent run-days --backend "$$backend" --world $(LIVE_WORLD) --days $(LIVE_DAYS) $(LIVE_ARGS)

check:
	cd lean && lake build

# Build the proofs and run all three Comparator challenges (needs bubblewrap):
# interpreter theorems, checker soundness, and completion fragments.
.PHONY: verify
verify:
	cd lean && lake build
	cd lean && COMPARATOR_BWRAP="$$PWD/../scripts/lean-bwrap.py" lake comparator
	cd lean && COMPARATOR_BWRAP="$$PWD/../scripts/lean-bwrap.py" lake comparator --config Ehr/Check/comparator.json
	cd lean && COMPARATOR_BWRAP="$$PWD/../scripts/lean-bwrap.py" lake comparator --config Ehr/Check/completion-comparator.json

# Independent project; callers can set COMPOSE_PROJECT_NAME for an isolated stack.
infra-up:
	$(COMPOSE) up -d postgres keycloak

infra-wait:
	node infra/scripts/wait-healthy.mjs

infra-down:
	$(COMPOSE) --profile app down

infra-reset:
	$(COMPOSE) --profile app down -v

setup:
	node infra/scripts/setup.mjs

# Clinical realism and worklists are composed before the immutable import.
load:
	node infra/scripts/wait-healthy.mjs --identity
	node infra/keycloak/provision-adt.mjs
	node infra/scripts/load.mjs $(if $(filter 1,$(SYNTHETIC_HOSPITAL)),--hospital,) $(SEED_ARGS)

seed: load

# Synthetic Hospital (synthetic-benchmark): all 1,268 patients as historical charts, the
# local note-section fixture, and a check of the committed case-mix table against the pinned DB.
.PHONY: load-synthetic-hospital synthetic-hospital test-synthetic-hospital
load-synthetic-hospital:
	node infra/scripts/load-synthetic-hospital.mjs

synthetic-hospital:
	node scripts/synthetic-hospital/fetch.mjs
	node scripts/synthetic-hospital/convert.mjs
	node scripts/synthetic-hospital/mix.mjs --check

test-synthetic-hospital:
	node --test scripts/synthetic-hospital/*.test.mjs

# Regenerate the raw Synthea population (needs Java 17+, ~200 MB download, ~3 min) and re-trim it
# into the committed fixtures/synthea/. Not part of install.
synthea:
	infra/synthea/generate.sh
	node infra/synthea/trim.mjs

wasm:
	wasm/build-ehr.sh
	wasm/install-into-app.sh
	node scripts/wasm-assets.mjs --write

wasm-check:
	node scripts/wasm-assets.mjs
