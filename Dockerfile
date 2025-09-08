FROM node:22-alpine

WORKDIR /app

# Install deps to a container-only node_modules (kept off your host via anonymous volume)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

# Copy source (will be overridden by bind mount at runtime, but helps first build)
COPY src ./src

# Non-root user for safety
RUN addgroup -S app && adduser -S app -G app && \
    mkdir -p /app/cache && chown -R app:app /app
USER app

ENV NODE_ENV=production
CMD ["npm", "start"]