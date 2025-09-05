# ---- build base (for reproducible installs) ----
FROM node:22-alpine AS deps
WORKDIR /app

# Install deps with exact lockfile when present
COPY package*.json ./
# If you keep a lockfile, npm ci is ideal; falls back to npm i otherwise
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# ---- runtime image ----
FROM node:22-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the app
COPY package*.json ./
COPY src ./src

# Environment
ENV NODE_ENV=production

# Run as non-root
USER app

# Default command: run once (or use CRON_EXPRESSION in .env to schedule)
CMD ["node", "src/index.js"]
