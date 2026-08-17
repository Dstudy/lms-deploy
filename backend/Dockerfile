# ---- Base Stage ----
FROM node:20-alpine AS base

# Install build tools for native dependencies (like bcrypt)
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Production Runner Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

# Ensure non-root user setup
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy installed production dependencies
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Ensure uploads folder exists with proper permissions
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]
