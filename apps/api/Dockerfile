#####################
# BASE STAGE
#####################
FROM node:22-alpine AS base

WORKDIR /usr/src/app

COPY package*.json ./
COPY nx.json tsconfig.base.json tsconfig.json jest.preset.js ./
COPY apps/api/package.json ./apps/api/

RUN npm ci
RUN npm install -g pm2
#####################
# DEVELOPMENT STAGE
#####################
FROM base AS development

WORKDIR /usr/src/app

COPY . .

# Install postgres client
RUN apk add --no-cache postgresql-client

RUN chmod +x apps/api/scripts/entrypoint.dev.sh

EXPOSE 5500

CMD ["sh", "apps/api/scripts/entrypoint.dev.sh"]

#####################
# BUILD STAGE
#####################
FROM base AS build

WORKDIR /usr/src/app

COPY . .

RUN npx nx build "api" --configuration=production

#####################
# STAGING STAGE
#####################
FROM node:22-alpine AS staging

WORKDIR /usr/src/app
ENV NODE_ENV=staging

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /usr/src/app/dist/apps/api ./dist

ENV PORT=5500
EXPOSE 5500

CMD ["node", "dist/main.js"]
