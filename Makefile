.PHONY: help build dev clean test test-quick test-all watch lint format check ci verify run docs

# Default target
help:
	@echo "Strata Extended - Build & Development Targets"
	@echo ""
	@echo "Build targets:"
	@echo "  make build          - Compile TypeScript to JavaScript"
	@echo "  make dev            - Watch mode: auto-compile on file changes"
	@echo "  make clean          - Remove dist/ and compiled output"
	@echo ""
	@echo "Testing targets:"
	@echo "  make test           - Run example tests (all examples)"
	@echo "  make test-quick     - Run single quick test (01_basic_types.str)"
	@echo "  make test-all       - Run all test suites"
	@echo "  make verify         - Build + quick test (CI-like check)"
	@echo ""
	@echo "Quality assurance:"
	@echo "  make lint           - Run ESLint on TypeScript files"
	@echo "  make lint-fix       - Auto-fix ESLint issues"
	@echo "  make format         - Format code with Prettier"
	@echo "  make format-check   - Check if code needs formatting"
	@echo "  make check          - Run typecheck + lint"
	@echo ""
	@echo "Development:"
	@echo "  make run            - Build and run interpreter (prompts for file)"
	@echo "  make watch          - Alias for dev (watch mode)"
	@echo ""
	@echo "Documentation:"
	@echo "  make docs           - Open documentation (docs.html)"
	@echo "  make readme         - Open README.md"
	@echo "  make architecture   - Open ARCHITECTURE.md"
	@echo "  make agents         - Open AGENTS.md"
	@echo ""
	@echo "CI/CD:"
	@echo "  make ci             - Run CI pipeline (build + quick test + lint + typecheck)"
	@echo ""

# Build targets
build:
	npm run build

dev:
	npm run dev

clean:
	npm run clean

# Testing targets
test:
	npm run test:examples

test-quick:
	npm run test:quick

test-all:
	npm run test:all

verify:
	npm run verify

# Code quality
lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

format-check:
	npm run format:check

check:
	npm run check

# Development
run:
	npm run run

watch:
	npm run watch

# Documentation
docs:
	npm run docs:view

readme:
	npm run readme

architecture:
	npm run architecture

agents:
	npm run agents

# CI
ci:
	npm run ci
