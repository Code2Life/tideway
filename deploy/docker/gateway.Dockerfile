FROM node:22-alpine

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts ./
COPY workers/gateway/package.json workers/gateway/package.json

RUN pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/workers/gateway

CMD ["pnpm", "dev", "--ip", "0.0.0.0", "--port", "8787"]
