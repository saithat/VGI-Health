# Top-level targets. Lanes fill these in as they land.
.PHONY: install run run-live check lean app infra-up infra-down infra-wait infra-reset setup load synthea fixtures wasm wasm-check

COMPOSE := docker compose -f infra/docker-compose.yml
APP_PORT ?= 5173
LIVE_WORLD ?= runs/world/live
LIVE_DAYS ?= 10
LIVE_ARGS ?=

# Medplum part: start the stack and wait for its healthcheck (infra-up), then the idempotent
# setup (project, client, personas -> .env) and fixture load. Safe to re-run.
install:
	cd lean && lake build
	pnpm install
	$(MAKE) wasm-check
	$(MAKE) infra-up
	$(MAKE) setup
	$(MAKE) load

run:
	$(MAKE) infra-up
	$(MAKE) wasm-check
	pnpm --filter app build
	node scripts/demo-urls.mjs $(APP_PORT)
	pnpm --filter app exec vite preview --host 0.0.0.0 --port $(APP_PORT) --strictPort

# Generate a real local world, then run agent nights with an online LLM backend.
run-live:
	@set -eu; \
	if [ -n "$${ANTHROPIC_API_KEY:-}" ]; then backend=claude; \
	elif command -v codex >/dev/null 2>&1; then backend=codex; \
	else echo 'run-live needs ANTHROPIC_API_KEY or an authenticated codex CLI.' >&2; exit 1; fi; \
	$(MAKE) infra-up; \
	pnpm --filter world gen --seed 7 --days $(LIVE_DAYS) --out $(LIVE_WORLD); \
	pnpm --filter agent run-days --backend "$$backend" --world $(LIVE_WORLD) --days $(LIVE_DAYS) $(LIVE_ARGS)

check:
	cd lean && lake build

# Start the Medplum stack (server :8103, app :3000, Postgres, Redis) and block until healthy.
infra-up:
	$(COMPOSE) up -d
	node infra/scripts/wait-healthy.mjs

# Block until the Medplum server healthcheck (and the app) respond.
infra-wait:
	node infra/scripts/wait-healthy.mjs

# Stop the stack, keeping data volumes.
infra-down:
	$(COMPOSE) down

# Stop the stack AND delete all Medplum data (Postgres volume).
infra-reset:
	$(COMPOSE) down -v

# Idempotent first-boot setup: project, ClientApplication, persona Practitioners + users; writes .env.
setup:
	node infra/scripts/setup.mjs

# Upload fixtures/synthea/*.json into Medplum; each file at most once (atomic transaction + marker).
load:
	node infra/scripts/load.mjs

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
