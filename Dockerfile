# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy package.json and yarn.lock from the root of the client project
COPY package.json ./
COPY yarn.lock ./

# Install dependencies with yarn
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY .env.production .env.production

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the client source code
COPY ./ ./

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Ensure next is available for building
RUN yarn add next@14.0.3

# Build the Next.js app
RUN yarn build

# Production image, copy all the files and run next
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
