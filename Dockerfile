# Multi-stage build for Bridgeworld portal deployment

# Stage 1: Development environment (for local testing)
FROM node:20-alpine AS dev

WORKDIR /app

RUN npm install -g pnpm@10.16.1

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json wrangler.jsonc ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]

# Stage 2: Build environment
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.16.1

# Copy package manifests and wrangler config (needed by postinstall script)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json wrangler.jsonc ./

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build staging or production based on build arg
ARG BUILD_ENV=staging
ENV CLOUDFLARE_ENV=${BUILD_ENV}

RUN if [ "$BUILD_ENV" = "staging" ]; then \
      pnpm run build:staging; \
    else \
      pnpm run build:production; \
    fi

# Stage 3: Runtime environment (wrangler deploy) — last stage, built by Railway by default
FROM node:20-alpine AS deployer

WORKDIR /app

# Install pnpm and wrangler
RUN npm install -g pnpm@10.16.1 wrangler

# Copy built artifacts from builder
COPY --from=builder /app/pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/build ./build
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/wrangler.jsonc ./wrangler.jsonc
COPY --from=builder /app/.env.staging ./.env.staging
COPY --from=builder /app/.env.production ./.env.production

# Reinstall dependencies for wrangler (minimal)
RUN pnpm install --frozen-lockfile --prod

# Default command: deploy to staging
ARG BUILD_ENV=staging
ENV CLOUDFLARE_ENV=${BUILD_ENV}
ENV WRANGLER_ENV=${BUILD_ENV}

CMD [ "sh", "-c", "wrangler deploy --env $WRANGLER_ENV" ]
