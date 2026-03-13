#####################
# BUILD STAGE
#####################
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Copy workspace-level files required by Nx
COPY package*.json ./
COPY nx.json tsconfig.base.json tsconfig.json jest.preset.js ./
COPY apps/frontend/package.json ./apps/frontend/

RUN npm ci

COPY . .

# VITE_API_URL defaults to /api so nginx can proxy relative to domain
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npx nx build frontend

#####################
# PRODUCTION STAGE
#####################
FROM nginx:1.27-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf

# Vite outputs to apps/frontend/dist/ relative to workspace root
COPY --from=build /usr/src/app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
