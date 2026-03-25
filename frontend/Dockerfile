# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lockfile và package.json trước để tận dụng Docker layer cache
COPY package.json package-lock.json ./
RUN npm ci

# Copy toàn bộ source và build production
COPY . .

# (Tuỳ chọn) Nếu frontend cần URL của backend, truyền vào lúc build:
# ARG VITE_API_URL=http://localhost:3000
# ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Serve với Nginx ───────────────────────────────────────────────────
FROM nginx:alpine

# Copy file build tĩnh vào thư mục gốc của nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy cấu hình nginx (hỗ trợ SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
