#####################
# BASE STAGE
#####################
FROM node:22-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./
COPY nx.json tsconfig.base.json tsconfig.json jest.preset.js ./
COPY apps/api/package.json ./apps/api/

RUN npm ci

#####################
# DEVELOPMENT STAGE
#####################
FROM base AS development

WORKDIR /usr/src/app

COPY . .

# Install postgres client and pm2 for dev hot-reload
RUN apk add --no-cache postgresql-client
RUN npm install -g pm2

RUN chmod +x apps/api/scripts/entrypoint.dev.sh

EXPOSE 5500

CMD ["sh", "apps/api/scripts/entrypoint.dev.sh"]

#####################
# BUILD STAGE
#####################
FROM base AS build

WORKDIR /usr/src/app

COPY . .

RUN npx nx build api --configuration=production

# Compile migration TS files to JS using @swc/core (available in node_modules)
RUN node -e " \
  const { transformFileSync } = require('@swc/core'); \
  const fs = require('fs'); \
  const path = require('path'); \
  const src = 'apps/api/src/database/migrations'; \
  const out = 'apps/api/dist/migrations'; \
  fs.mkdirSync(out, { recursive: true }); \
  fs.readdirSync(src).filter(f => f.endsWith('.ts')).forEach(f => { \
    const { code } = transformFileSync(path.join(src, f), { \
      jsc: { parser: { syntax: 'typescript' }, target: 'es2021' }, \
      module: { type: 'commonjs' } \
    }); \
    fs.writeFileSync(path.join(out, f.replace('.ts', '.js')), code); \
  }); \
  console.log('Migrations compiled to ' + out); \
"

#####################
# PRODUCTION STAGE
#####################
FROM node:22-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built bundle and compiled migrations
COPY --from=build /usr/src/app/apps/api/dist ./dist

ENV PORT=5500
EXPOSE 5500

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "dist/main.js"]
