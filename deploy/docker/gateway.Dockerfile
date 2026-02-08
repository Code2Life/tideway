# ── Build stage ──────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY workers/gateway/package.json workers/gateway/package.json

RUN pnpm install --frozen-lockfile

COPY workers/gateway workers/gateway

RUN cd workers/gateway && pnpm build:server

# ── Production stage ─────────────────────────────
FROM node:24-alpine

RUN addgroup -S tideway && adduser -S tideway -G tideway

WORKDIR /app

COPY --from=builder --chown=tideway:tideway /app/workers/gateway/dist ./dist

USER tideway

EXPOSE 8787

ENV NODE_ENV=production
ENV PORT=8787

CMD ["node", "dist/server.js"]
