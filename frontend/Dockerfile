# Imagem do front: Vite compila e o nginx serve. Contexto de build: esta pasta (frontend/).
# A versão do Node é a do .nvmrc da raiz; se mudar lá, mude aqui e no backend/Dockerfile.
ARG NODE_VERSION=26
ARG NGINX_VERSION=1.29

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
