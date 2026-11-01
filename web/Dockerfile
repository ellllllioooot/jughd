# prod web image — static build behind nginx (Caddy proxies web:80)
FROM node:22.22.1-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci   # postinstall copies MediaPipe wasm into public/

COPY . .
RUN npm run build   # tsc --noEmit && vite build → dist/

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
