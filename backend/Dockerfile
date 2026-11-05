# Imagem da API. Contexto de build: esta pasta (backend/).
# A versão do Node é a do .nvmrc da raiz; se mudar lá, mude aqui e no frontend/Dockerfile.
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
# As migrations ficam ao lado de dist/ (veja src/db/migrate.ts).
COPY --chown=node:node drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
