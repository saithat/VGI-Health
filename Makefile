# Top-level targets. Lanes fill these in as they land.
.PHONY: install run check lean app infra-up infra-down fixtures

install:
	cd lean && lake build
	pnpm install
	$(MAKE) infra-up
	@if [ -f infra/scripts/load.mjs ]; then node infra/scripts/load.mjs; fi

run:
	@echo "TODO: start Medplum (if needed) and the app in replay mode"

check:
	cd lean && lake build

infra-up:
	@if [ -f infra/docker-compose.yml ]; then docker compose -f infra/docker-compose.yml up -d; fi

infra-down:
	@if [ -f infra/docker-compose.yml ]; then docker compose -f infra/docker-compose.yml down; fi
