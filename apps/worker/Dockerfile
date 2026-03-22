FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

RUN npm install --production=false

# Copy source
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Build
WORKDIR /app/apps/worker
RUN npx tsc || true

# Production
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/worker ./apps/worker

WORKDIR /app/apps/worker

ENV NODE_ENV=production

CMD ["npx", "tsx", "src/index.ts"]
