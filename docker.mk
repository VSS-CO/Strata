# ============================================================================
# Docker Build Makefile
# ============================================================================
# Targets for building, pushing, and managing Docker images
# Include with: make -f docker.mk <target>
# Or add to main Makefile: include docker.mk

.PHONY: docker-help docker-build docker-build-runtime docker-build-sdk \
        docker-run docker-run-runtime docker-run-sdk docker-compose-up \
        docker-compose-down docker-compose-logs docker-test docker-push \
        docker-clean docker-inspect docker-buildx

# ============================================================================
# Configuration
# ============================================================================

REGISTRY ?= ghcr.io
IMAGE_RUNTIME ?= strata
IMAGE_SDK ?= strata-sdk
VERSION ?= latest
DOCKER_BUILDKIT ?= 1

# ============================================================================
# Help
# ============================================================================

docker-help:
	@echo "Docker Build Targets"
	@echo ""
	@echo "Build:"
	@echo "  make docker-build          - Build both runtime and SDK images"
	@echo "  make docker-build-runtime  - Build runtime image only"
	@echo "  make docker-build-sdk      - Build SDK image only"
	@echo ""
	@echo "Run:"
	@echo "  make docker-run-runtime    - Run runtime (prompts for program)"
	@echo "  make docker-run-sdk        - Run SDK CLI"
	@echo ""
	@echo "Compose:"
	@echo "  make docker-compose-up     - Start all services"
	@echo "  make docker-compose-down   - Stop all services"
	@echo "  make docker-compose-logs   - View logs"
	@echo ""
	@echo "Testing:"
	@echo "  make docker-test           - Run tests in container"
	@echo ""
	@echo "Push & Cleanup:"
	@echo "  make docker-push           - Push images to registry"
	@echo "  make docker-clean          - Remove all Strata images"
	@echo ""
	@echo "Inspection:"
	@echo "  make docker-inspect        - Inspect runtime image"
	@echo "  make docker-buildx         - Build for multiple architectures"

# ============================================================================
# Build Targets
# ============================================================================

docker-build: docker-build-runtime docker-build-sdk
	@echo "✓ Both images built successfully"

docker-build-runtime:
	@echo "Building $(IMAGE_RUNTIME):$(VERSION)..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) docker build \
		-t $(IMAGE_RUNTIME):$(VERSION) \
		-t $(IMAGE_RUNTIME):latest \
		--target runtime \
		.
	@echo "✓ Runtime image built"

docker-build-sdk:
	@echo "Building $(IMAGE_SDK):$(VERSION)..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) docker build \
		-t $(IMAGE_SDK):$(VERSION) \
		-t $(IMAGE_SDK):latest \
		--target production \
		./sdk
	@echo "✓ SDK image built"

docker-build-dev:
	@echo "Building development image..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) docker build \
		-t $(IMAGE_SDK):dev \
		--target development \
		./sdk
	@echo "✓ Development image built"

docker-build-test:
	@echo "Building test image..."
	DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) docker build \
		-t strata:test \
		--target builder \
		.
	@echo "✓ Test image built"

# ============================================================================
# Run Targets
# ============================================================================

docker-run-runtime:
	@echo "Running Strata runtime..."
	docker run --rm -it \
		-v $$(pwd):/workspace \
		-w /workspace \
		$(IMAGE_RUNTIME):latest \
		examples/01_basic_types.str

docker-run-sdk:
	@echo "Running Strata SDK CLI..."
	docker run --rm -it \
		-v $$(pwd):/workspace \
		-w /workspace \
		$(IMAGE_SDK):latest \
		cli --help

docker-run-interactive:
	@echo "Starting interactive shell..."
	docker run --rm -it \
		-v $$(pwd):/workspace \
		-w /workspace \
		$(IMAGE_SDK):latest \
		bash

# ============================================================================
# Docker Compose Targets
# ============================================================================

docker-compose-up:
	@echo "Starting Docker Compose services..."
	docker-compose up -d
	@docker-compose ps

docker-compose-down:
	@echo "Stopping Docker Compose services..."
	docker-compose down
	@echo "✓ Services stopped"

docker-compose-logs:
	docker-compose logs -f

docker-compose-ps:
	docker-compose ps

docker-compose-build:
	docker-compose build --no-cache

# ============================================================================
# Testing Targets
# ============================================================================

docker-test: docker-build-test
	@echo "Running tests in container..."
	docker run --rm strata:test npm run test:quick
	@echo "✓ Tests passed"

docker-test-all: docker-build-test
	@echo "Running all tests in container..."
	docker run --rm strata:test npm run test:all
	@echo "✓ All tests passed"

docker-test-examples: docker-build-test
	@echo "Running example tests..."
	docker run --rm strata:test npm run test:examples
	@echo "✓ Example tests passed"

# ============================================================================
# Registry Targets
# ============================================================================

docker-push-runtime: docker-build-runtime
	@echo "Pushing $(IMAGE_RUNTIME):$(VERSION) to $(REGISTRY)..."
	docker tag $(IMAGE_RUNTIME):latest $(REGISTRY)/$(IMAGE_RUNTIME):$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_RUNTIME):$(VERSION)
	@echo "✓ Runtime image pushed"

docker-push-sdk: docker-build-sdk
	@echo "Pushing $(IMAGE_SDK):$(VERSION) to $(REGISTRY)..."
	docker tag $(IMAGE_SDK):latest $(REGISTRY)/$(IMAGE_SDK):$(VERSION)
	docker push $(REGISTRY)/$(IMAGE_SDK):$(VERSION)
	@echo "✓ SDK image pushed"

docker-push: docker-push-runtime docker-push-sdk
	@echo "✓ All images pushed to $(REGISTRY)"

# ============================================================================
# Cleanup Targets
# ============================================================================

docker-clean:
	@echo "Removing Strata images..."
	docker rmi $(IMAGE_RUNTIME):latest $(IMAGE_RUNTIME):$(VERSION) 2>/dev/null || true
	docker rmi $(IMAGE_SDK):latest $(IMAGE_SDK):$(VERSION) 2>/dev/null || true
	docker rmi strata:test strata:dev 2>/dev/null || true
	@echo "✓ Images removed"

docker-clean-all: docker-clean
	@echo "Removing all build artifacts..."
	docker builder prune -f
	@echo "✓ Build cache cleaned"

docker-prune:
	@echo "Cleaning up unused Docker resources..."
	docker system prune -f
	@echo "✓ Cleaned"

# ============================================================================
# Inspection Targets
# ============================================================================

docker-inspect:
	@echo "Runtime image details:"
	docker inspect $(IMAGE_RUNTIME):latest | jq '.[] | {Id, RepoTags, Size}'

docker-inspect-sdk:
	@echo "SDK image details:"
	docker inspect $(IMAGE_SDK):latest | jq '.[] | {Id, RepoTags, Size}'

docker-history:
	@echo "Runtime image layers:"
	docker history $(IMAGE_RUNTIME):latest

docker-history-sdk:
	@echo "SDK image layers:"
	docker history $(IMAGE_SDK):latest

docker-ls:
	@echo "Strata images:"
	docker images | grep -E "($(IMAGE_RUNTIME)|$(IMAGE_SDK)|strata:)"

# ============================================================================
# Multi-platform Builds
# ============================================================================

docker-buildx:
	@echo "Building for multiple platforms..."
	docker buildx build \
		--platform linux/amd64,linux/arm64,linux/arm/v7 \
		-t $(REGISTRY)/$(IMAGE_RUNTIME):$(VERSION) \
		--push .
	@echo "✓ Multi-platform build complete"

docker-buildx-sdk:
	@echo "Building SDK for multiple platforms..."
	docker buildx build \
		--platform linux/amd64,linux/arm64,linux/arm/v7 \
		-t $(REGISTRY)/$(IMAGE_SDK):$(VERSION) \
		--push \
		./sdk
	@echo "✓ Multi-platform SDK build complete"

# ============================================================================
# Development Targets
# ============================================================================

docker-dev-up:
	@echo "Starting development environment..."
	docker-compose --profile dev up -d strata-dev

docker-dev-down:
	docker-compose --profile dev down

docker-dev-logs:
	docker-compose --profile dev logs -f strata-dev

docker-dev-shell:
	@echo "Starting development shell..."
	docker run --rm -it \
		-v $$(pwd):/workspace \
		-w /workspace \
		-e NODE_ENV=development \
		$(IMAGE_SDK):dev \
		bash

# ============================================================================
# Validation Targets
# ============================================================================

docker-validate:
	@echo "Validating Dockerfile..."
	docker run --rm -i hadolint/hadolint < Dockerfile
	docker run --rm -i hadolint/hadolint < sdk/Dockerfile
	@echo "✓ Dockerfiles valid"

docker-scan:
	@echo "Scanning for vulnerabilities..."
	docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image $(IMAGE_RUNTIME):latest
	@echo "✓ Scan complete"

# ============================================================================
# Info Targets
# ============================================================================

docker-sizes:
	@echo "Image sizes:"
	docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" \
		| grep -E "($(IMAGE_RUNTIME)|$(IMAGE_SDK)|strata:)"

docker-info:
	@echo "Docker system info:"
	docker system df
	@echo ""
	@echo "Strata images:"
	docker images | grep -E "($(IMAGE_RUNTIME)|$(IMAGE_SDK)|strata:)" || echo "No images found"
