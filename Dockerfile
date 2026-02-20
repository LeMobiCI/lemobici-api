# Multi-stage : même fichier pour dev et prod

# ÉTAPE 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ÉTAPE 3: Development (optionnel)
FROM builder AS development
CMD ["npm", "run", "start:dev"]

# ÉTAPE 2: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl  # Pour healthcheck
COPY package*.json ./
RUN npm ci --production && npm cache clean --force
COPY --from=builder /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
