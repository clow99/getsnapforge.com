FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/screenshot-service/package.json ./apps/screenshot-service/package.json

RUN npm install --workspace @getsnapforge/screenshot-service --include-workspace-root

COPY apps/screenshot-service ./apps/screenshot-service

RUN npm run build --workspace @getsnapforge/screenshot-service

ENV NODE_ENV=production
ENV PORT=4000
ENV CACHE_DIR=/app/cache

RUN mkdir -p /app/cache

EXPOSE 4000

CMD ["node", "apps/screenshot-service/dist/src/server.js"]
