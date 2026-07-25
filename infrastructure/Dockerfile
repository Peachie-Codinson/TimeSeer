# syntax=docker/dockerfile:1

FROM node:24-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/scheduler/package.json packages/scheduler/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @planner/scheduler build
RUN pnpm --filter @planner/web build
RUN pnpm --filter @planner/server build
RUN pnpm deploy --filter @planner/server --prod /repo/out/server

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/planner.db
ENV ATTACHMENTS_DIR=/data/attachments
COPY --from=build /repo/out/server ./
COPY --from=build /repo/apps/server/public ./public
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "dist/index.js"]
