# syntax=docker/dockerfile:1

# =============================================================================
# Imagen de producción de nutricionista-app (Next.js 16 + Prisma).
# Multi-stage: deps → build → (migrator | runner).
#   - runner   → servidor Next.js autónomo (output: standalone), liviano.
#   - migrator → aplica las migraciones de Prisma (one-shot en el arranque).
# =============================================================================

# ----------------------------- base ----------------------------------------
FROM node:22-bookworm-slim AS base
# Prisma necesita openssl en runtime; ca-certificates para TLS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ----------------------------- deps ----------------------------------------
# Instala TODAS las dependencias (incluye dev) para poder compilar.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ----------------------------- build ---------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables dummy: el build de Next instancia módulos (Prisma/Auth) al
# recolectar páginas. No se hornean en la imagen final (stage aparte).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV AUTH_SECRET="placeholder-build-secret-con-mas-de-32-caracteres"
RUN npx prisma generate
RUN npm run build

# ----------------------------- migrator ------------------------------------
# Imagen one-shot que aplica las migraciones contra la base de datos.
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
# Genera el cliente Prisma (lo necesita el seed; migrate deploy no, pero es
# barato y deja la imagen lista para ambos comandos).
RUN npx prisma generate
# CMD por defecto: aplicar migraciones pendientes.
# (El seed se puede correr con: ... run --rm migrate npm run db:seed)
CMD ["npx", "prisma", "migrate", "deploy"]

# ----------------------------- runner --------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios.
RUN groupadd -r nodejs && useradd -r -g nodejs -m nextjs

# Servidor autónomo de Next.js + assets estáticos.
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cliente y motor de Prisma (garantiza que el engine esté en el bundle).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
