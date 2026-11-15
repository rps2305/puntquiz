FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @puntquiz/api --workspace @puntquiz/contracts --include-workspace-root
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @puntquiz/contracts && npm run build -w @puntquiz/api
ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/apps/api/src/main.js"]
