# ============================================================================
# Strata Runtime - Multi-stage Dockerfile
# ============================================================================
# Builds a production-ready Docker image for the Strata language runtime
# Supports running Strata (.str) programs with the interpreter
#
# Usage:
#   docker build -t strata:latest .
#   docker run --rm -v $(pwd):/workspace strata:latest examples/01_basic_types.str
#   docker run --rm -v $(pwd):/workspace strata:latest /workspace/your_program.str
# ============================================================================

# ============================================================================
# Stage 1: Build Stage
# ============================================================================
FROM node:22-alpine AS builder

LABEL maintainer="VSS.CO - Strata Contributors"
LABEL description="Strata Extended - Statically-typed scripting language compiler"

WORKDIR /build

# Install build dependencies (minimal for Alpine)
RUN apk add --no-cache python3 make g++ git

# Copy source files
COPY package*.json ./
COPY index.ts ./
COPY tsconfig.json ./
COPY examples ./examples

# Install dependencies and build
RUN npm ci --prefer-offline --no-audit && \
    npm run build && \
    npm prune --production

# ============================================================================
# Stage 2: Runtime Stage (Lightweight)
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production \
    PATH="/app/node_modules/.bin:${PATH}"

# Create non-root user for security
RUN addgroup -g 1000 strata && \
    adduser -D -u 1000 -G strata strata

# Copy built artifacts from builder
COPY --from=builder --chown=strata:strata /build/dist ./dist
COPY --from=builder --chown=strata:strata /build/node_modules ./node_modules
COPY --from=builder --chown=strata:strata /build/examples ./examples
COPY --from=builder --chown=strata:strata /build/package.json ./

# Create workspace directory
RUN mkdir -p /workspace && chown -R strata:strata /workspace

# Switch to non-root user
USER strata

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('./dist/index.js'); console.log('ok')" || exit 1

# Default command: run interpreter
ENTRYPOINT ["node", "dist/main.js"]
CMD ["--help"]

# ============================================================================
# Labels for image metadata
# ============================================================================
LABEL version="1.0.0" \
    org.opencontainers.image.source="https://github.com/VSS-CO/Strata" \
    org.opencontainers.image.licenses="GPL-3.0" \
    org.opencontainers.image.title="Strata Runtime" \
    org.opencontainers.image.description="Strata Extended - A statically-typed scripting language"
