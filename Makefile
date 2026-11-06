# Top-level targets. Lanes fill these in as they land.
.PHONY: install run run-live check verify lean app infra-up infra-down infra-wait infra-reset setup load seed synthea fixtures wasm wasm-check

COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
export TMPDIR := /home/saithat/Projects/run-tmp
export CI := true
# Bound fresh Lean builds on shared development/judging machines.
export LEAN_NUM_THREADS ?= 4
APP_PORT ?= 5173
LIVE_WORLD ?= runs/world/2
LIVE_DAYS ?= 10
LIVE_ARGS ?=
SYNTHETIC_HOSPITAL ?= 1
SEED_ARGS ?=

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
	if [ -n "$${ANTHROPIC_API_KEY:-}" ]; then backend=claude; \
	elif command -v codex >/dev/null 2>&1; then backend=codex; \
	else echo 'run-live needs ANTHROPIC_API_KEY or an authenticated codex CLI.' >&2; exit 1; fi; \
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

# Opt-in historical charts, independent of simulation worlds; committed default cohort = 150.
.PHONY: load-synthetic-hospital synthetic-hospital test-synthetic-hospital
load-synthetic-hospital:
	node infra/scripts/load-synthetic-hospital.mjs

synthetic-hospital:
	node scripts/synthetic-hospital/fetch.mjs
	node scripts/synthetic-hospital/convert.mjs

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

.PHONY: rebind
rebind:
	pnpm --filter agent rebind --run $(RUN)

# Exploration is offline research; never deploys. ML packages live outside the repo.
.PHONY: decision-server explore-test
decision-server:
	sh explore/decision-server.sh $(DECISION_ARGS)

# Disk-backed scratch for exploration tools; override with SCRATCH=/path.
SCRATCH ?= $(HOME)/run-tmp
explore-test:
	mkdir -p $(SCRATCH)
	TMPDIR=$(SCRATCH) pnpm --filter agent exec tsc -p ../explore/tsconfig.json --noEmit
	TMPDIR=$(SCRATCH) node --import ./agent/node_modules/tsx/dist/loader.mjs --test explore/*.test.ts
