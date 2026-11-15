FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @puntquiz/web --workspace @puntquiz/contracts --include-workspace-root
COPY packages/contracts packages/contracts
COPY apps/web apps/web
COPY assets/favicon apps/web/public/icons
RUN npm run build -w @puntquiz/web

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "server/index.mjs"]
