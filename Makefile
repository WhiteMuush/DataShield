# DataShield developer tasks. Thin wrapper over the npm scripts and
# scripts/db-init.sh so a fresh clone can be brought up with a single command.
# Requires Node 22 and (for the local database) Docker.

.DEFAULT_GOAL := help
SHELL := /bin/sh

.PHONY: help setup install env db-up db-down db-init migrate seed seed-dev \
        dev build lint lint-fix test check clean

help: ## List available targets
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: install env db-init ## One-shot: install deps, create .env.local, start DB, migrate, seed
	@echo "Setup complete. Start the app with 'make dev'."

install: ## Install dependencies (also runs prisma generate)
	npm install

env: ## Create .env.local from .env.example with generated secrets (no-op if it exists)
	@if [ -f .env.local ]; then \
		echo ".env.local already exists, leaving it untouched."; \
	else \
		cp .env.example .env.local; \
		auth=$$(openssl rand -base64 32); \
		enc=$$(openssl rand -base64 32); \
		sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$$auth|" .env.local; \
		sed -i "s|^DIRECTORY_ENCRYPTION_KEY=.*|DIRECTORY_ENCRYPTION_KEY=$$enc|" .env.local; \
		echo ".env.local created with generated AUTH_SECRET and DIRECTORY_ENCRYPTION_KEY."; \
	fi

db-up: ## Start the local PostgreSQL container
	npm run db:up

db-down: ## Stop the local database container
	npm run db:down

db-init: ## Start DB, apply migrations, seed demo data (Docker required)
	npm run db:init

migrate: ## Apply pending Prisma migrations
	npm run db:migrate

seed: ## Seed the base admin account
	npm run seed

seed-dev: ## Seed demo data for development
	npm run seed:dev

dev: ## Run the dev server
	npm run dev

build: ## Production build
	npm run build

lint: ## Lint
	npm run lint

lint-fix: ## Lint and auto-fix
	npm run lint:fix

test: ## Run the test suite
	npm test

check: ## Run the same gates CI enforces (lint, types, schema, build)
	npm run lint -- --max-warnings 0
	npx tsc --noEmit
	npx prisma validate
	npm run build

clean: ## Stop the DB and remove node_modules and the Next.js build cache
	npm run db:down
	rm -rf node_modules .next
