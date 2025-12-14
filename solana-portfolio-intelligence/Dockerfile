FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace
COPY package*.json ./

# Copy shared package
COPY shared ./shared

# Copy backend package
COPY backend ./backend

# Install all dependencies from root
RUN npm ci

# Build shared first
WORKDIR /app/shared
RUN npm run build || true

# Build backend
WORKDIR /app/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy shared (built)
COPY --from=builder /app/shared ./shared

# Copy backend package.json
COPY --from=builder /app/backend/package*.json ./backend/

# Install production deps
RUN npm ci --omit=dev

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3004

CMD ["node", "dist/server.js"]
