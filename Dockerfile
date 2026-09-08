# syntax=docker/dockerfile:1

FROM node:lts-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates tini \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

# 1) 全量依赖，给 ace build 用（不要 --prod）
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
COPY pnpm-workspace.yaml ./
ENV NODE_ENV=development
RUN --mount=type=secret,id=adonis_plus_token \
    TOKEN="$(cat /run/secrets/adonis_plus_token)" \
 && npm config set "@adonisplus:registry" "https://plus.adonisjs.com/registry/" \
 && npm config set "//plus.adonisjs.com/registry/:_authToken" "$TOKEN" \
 && pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .

WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile \
  && pnpm exec vite build --outDir /app/public --emptyOutDir

WORKDIR /app
RUN node ace build --ignore-ts-errors --package-manager=pnpm

# 3) 最终生产阶段（此时 /app/build/node_modules 全是实体文件，软链接不会断）
FROM base AS production
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    DB_DATABASE=/app/data/db.sqlite

COPY --from=build /app/build ./
COPY .npmrc pnpm-workspace.yaml ./

ENV CI=true

RUN --mount=type=secret,id=adonis_plus_token \
    TOKEN="$(cat /run/secrets/adonis_plus_token)" \
 && npm config set "@adonisplus:registry" "https://plus.adonisjs.com/registry/" \
 && npm config set "//plus.adonisjs.com/registry/:_authToken" "$TOKEN" \
 && pnpm install --prod --frozen-lockfile --config.node-linker=hoisted \
 && test -d node_modules/reflect-metadata

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
  && mkdir -p /app/data /app/tmp

EXPOSE 3333
VOLUME ["/app/data"]
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
