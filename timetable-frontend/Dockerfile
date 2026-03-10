# ============================================
# Frontend Dockerfile (Multi-stage Build)
# Stage 1: Build React app with Vite
# Stage 2: Serve static files with Nginx
# ============================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Allow API URL to be set at build time
ARG VITE_API_URL=http://localhost:5050/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:alpine

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
