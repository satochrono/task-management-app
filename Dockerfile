FROM node:24.19.0-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable


FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


FROM base AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm db:generate

# Next.js evaluates server modules during the production build.
# These are non-secret, build-only placeholder values and are scoped to
# this command so they are not persisted as builder-stage ENV settings.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build_only" \
    AUTH_SECRET="build-only-auth-secret-00000000000000000000000000000000" \
    pnpm build


FROM node:24.19.0-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/public \
    ./public

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/standalone \
    ./

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/static \
    ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/live').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
