# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfile và package.json trước để tận dụng Docker layer cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ source và build production
COPY . .

# URL backend truyền vào lúc build — Vite bake vào bundle JS
# Docker: VITE_GATEWAY_URL="" → URL tương đối → nginx proxy tới backend
# Local dev: không set → fallback "http://localhost:8001"
ARG VITE_GATEWAY_URL=""
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL

RUN npm run build

# ── Stage 2: Serve với Nginx ───────────────────────────────────────────────────
FROM nginx:alpine

# Copy file build tĩnh vào thư mục gốc của nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx (hỗ trợ SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
