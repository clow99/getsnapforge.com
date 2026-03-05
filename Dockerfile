FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/demo-next/package.json ./apps/demo-next/package.json
COPY packages/snapforge/package.json ./packages/snapforge/package.json
RUN npm ci

FROM base AS builder
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
COPY --from=deps /app ./
COPY . .
RUN npm -w packages/snapforge run build
RUN npm -w apps/demo-next run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "-w", "apps/demo-next", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
