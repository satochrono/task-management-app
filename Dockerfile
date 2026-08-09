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

# Build-time only.
# Prisma Client generation / Next.js module evaluation requires a syntactically
# valid DATABASE_URL, but no database connection should occur during image build.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build_only"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm db:generate
RUN pnpm build


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

CMD ["node", "server.js"]
