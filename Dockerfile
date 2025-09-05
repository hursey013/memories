# ---- base dependencies layer ----
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm i --omit=dev; fi

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy node_modules from deps for production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# App data
RUN mkdir -p /app/cache && chown -R app:app /app

USER app

ENV NODE_ENV=production

# Start
CMD ["node", "src/index.js"]
