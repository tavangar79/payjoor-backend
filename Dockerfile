# Backend image: Express web process and BullMQ worker process (PRD §11). Build context is the repo root.
# It needs the admin and web builds as named contexts, which docker-compose.yml passes in; by hand:
#   docker build -f backend/Dockerfile --build-context admin=docker-image://pagesanj/admin \
#     --build-context web=docker-image://pagesanj/web .
# Default command runs the web process; the worker runs `node dist/worker.js` from the same image.

FROM node:22-alpine AS build
WORKDIR /app
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
COPY admin/package.json admin/
COPY web/package.json web/
COPY backend/package.json backend/
RUN npm ci -w backend --include-workspace-root=false
COPY backend/ backend/
RUN npm run build -w backend

# Production deps: the backend's, plus web's react/react-dom, which the SSR bundle imports at runtime.
FROM node:22-alpine AS deps
WORKDIR /app
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
COPY admin/package.json admin/
COPY web/package.json web/
COPY backend/package.json backend/
RUN npm ci --omit=dev -w backend -w web --include-workspace-root=false

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY backend/package.json backend/
COPY --from=build /app/backend/dist backend/dist
COPY backend/scripts backend/scripts
# The backend resolves ../web/dist and ../admin/dist relative to backend/dist (routes/landing.ts, routes/admin).
COPY --from=web /dist web/dist
COPY --from=admin /dist admin/dist
WORKDIR /app/backend
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/healthz >/dev/null || exit 1
CMD ["node", "dist/server.js"]
