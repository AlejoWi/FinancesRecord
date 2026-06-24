# syntax=docker/dockerfile:1.6
# Multi-stage build for the FinancesRecord frontend (React 18 + Vite SPA).
# Build context: Front/ (resolved by docker-compose.yml).
# Stage 1: build the static bundle with Node.
# Stage 2: serve the bundle with nginx and enable SPA fallback for React Router.

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:1.27-alpine

# Remove the stock default server shipped by the base image, then install ours.
# The default server block listens on :80 and would conflict with our SPA config.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the Vite build output.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx:alpine already defines CMD ["nginx", "-g", "daemon off;"]
CMD ["nginx", "-g", "daemon off;"]
