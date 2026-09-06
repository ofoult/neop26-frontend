# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable

# ---- deps: install with full lockfile, cached separately from source ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder: build the Next.js standalone output ----
FROM base AS builder
WORKDIR /app
# Under QEMU (cross-building linux/arm64 on an amd64 runner), @swc/core's native
# binary auto-detects ARMv8.1 atomics that QEMU's default CPU model doesn't
# emulate, crashing with "Illegal instruction". QEMU_CPU=max fixes it; it's a
# no-op on a native (non-emulated) build.
ENV QEMU_CPU=max
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inlined into the client bundle at build time — must be present before `pnpm build`.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

# ---- runner: minimal production image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
