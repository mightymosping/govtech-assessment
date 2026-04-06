FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@10.33.0

FROM base AS build-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM build-deps AS build
COPY tsconfig.json tsconfig.test.json jest.config.js eslint.config.mjs ./
COPY src ./src
RUN pnpm build

FROM build-deps AS prod-deps
RUN pnpm prune --prod --ignore-scripts && pnpm store prune

FROM build-deps AS migrate
ENV NODE_ENV=production
CMD ["pnpm", "prisma:migrate:deploy"]

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
EXPOSE 80
CMD ["/bin/sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/app/server.js"]