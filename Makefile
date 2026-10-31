# Top-level targets. Lanes fill these in as they land.
.PHONY: install run check lean app infra-up infra-down infra-wait infra-reset setup load synthea fixtures wasm

COMPOSE := docker compose -f infra/docker-compose.yml

# Medplum part: start the stack and wait for its healthcheck (infra-up), then the idempotent
# setup (project, client, personas -> .env) and fixture load. Safe to re-run.
install:
	cd lean && lake build
	pnpm install
	$(MAKE) infra-up
	$(MAKE) setup
	$(MAKE) load

run:
	@echo "TODO: start Medplum (if needed) and the app in replay mode"

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
