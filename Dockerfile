# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the React SPA.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./

# Baked into the bundle at build time. Left empty so the app calls /api on
# whatever origin serves it — which is this same container.
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — install production backend dependencies only.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS backend-deps

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
# Stage 3 — runtime image.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# dumb-init reaps zombies and forwards SIGTERM, so graceful shutdown works.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    SERVE_FRONTEND=true \
    TRUST_PROXY=true \
    PORT=5000

WORKDIR /app

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/package.json
COPY backend/server.js ./backend/server.js
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY --from=frontend /app/frontend/build ./frontend/build

# Run as an unprivileged user. The node image ships one already.
RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||5000,path:'/health',timeout:4000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
