# ============================================================================
# Strata SDK - Multi-stage Dockerfile
# ============================================================================
# Builds a production-ready Docker image for the Strata SDK
# Includes Electron GUI, CLI tools, and development utilities
#
# Usage:
#   docker build -t strata-sdk:latest .
#   docker run --rm strata-sdk:latest strata-sdk --help
#   docker run --rm -v $(pwd):/workspace strata-sdk:latest strata-sdk run /workspace/program.str
#   docker run --rm -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix strata-sdk:latest strata-gui
# ============================================================================

# ============================================================================
# Stage 1: Build Stage
# ============================================================================
FROM node:22-alpine AS builder

LABEL maintainer="VSS.CO - Strata Contributors"
LABEL description="Strata SDK - Production-grade SDK for Strata programming language"

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    git

# Copy SDK files
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY examples ./examples
COPY .npmignore ./

# Install dependencies and build
RUN npm ci --prefer-offline --no-audit && \
    npm run build && \
    npm prune --production

# ============================================================================
# Stage 2: Development Stage (includes all tools)
# ============================================================================
FROM node:22-alpine AS development

LABEL variant="development"

WORKDIR /app

# Install runtime dependencies including development tools
RUN apk add --no-cache \
    curl \
    git \
    vim \
    bash \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman

ENV NODE_ENV=development \
    PATH="/app/node_modules/.bin:${PATH}"

# Copy everything including dev dependencies
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/src ./src
COPY --from=builder /build/examples ./examples
COPY --from=builder /build/package.json ./
COPY --from=builder /build/tsconfig.json ./

RUN mkdir -p /workspace && chmod 777 /workspace

ENTRYPOINT ["npm", "run"]
CMD ["--help"]

# ============================================================================
# Stage 3: Runtime Stage (Minimal)
# ============================================================================
FROM node:22-alpine AS runtime

LABEL variant="runtime"

WORKDIR /app

# Install minimal runtime dependencies (no GUI support)
RUN apk add --no-cache curl

ENV NODE_ENV=production \
    PATH="/app/node_modules/.bin:${PATH}"

# Create non-root user for security
RUN addgroup -g 1000 strata && \
    adduser -D -u 1000 -G strata strata

# Copy built artifacts from builder
COPY --from=builder --chown=strata:strata /build/dist ./dist
COPY --from=builder --chown=strata:strata /build/node_modules ./node_modules
COPY --from=builder --chown=strata:strata /build/package.json ./

RUN mkdir -p /workspace && chown -R strata:strata /workspace

USER strata

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('./dist/index.js'); console.log('ok')" || exit 1

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]

# ============================================================================
# Stage 4: Production with GUI Support
# ============================================================================
FROM development AS production

LABEL variant="production"

# Install Electron runtime dependencies for GUI
RUN apk add --no-cache \
    libxkbcommon \
    libxkbcommon-x11 \
    libx11-dev \
    libxrandr \
    libxinerama \
    libxcursor \
    libxext \
    libxrender \
    libxinerama \
    libuuid \
    libsm \
    libice

ENV NODE_ENV=production

# Health check includes both CLI and potential GUI startup
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node dist/cli.js --version || exit 1

# ============================================================================
# Default image: Production with all features
# ============================================================================

# Copy entrypoint script for flexibility
COPY --chown=root:root <<EOF /usr/local/bin/strata-sdk
#!/bin/bash
set -e

case "$1" in
  cli)
    shift
    exec node /app/dist/cli.js "$@"
    ;;
  gui)
    shift
    exec electron /app/dist/gui.js "$@"
    ;;
  *)
    exec node /app/dist/cli.js "$@"
    ;;
esac
EOF

RUN chmod +x /usr/local/bin/strata-sdk

ENTRYPOINT ["/usr/local/bin/strata-sdk"]
CMD ["--help"]

# ============================================================================
# Image Metadata
# ============================================================================
LABEL version="1.0.0" \
    org.opencontainers.image.source="https://github.com/VSS-CO/Strata" \
    org.opencontainers.image.licenses="GPL-3.0" \
    org.opencontainers.image.title="Strata SDK" \
    org.opencontainers.image.description="Production-grade SDK for Strata programming language with GUI support"
