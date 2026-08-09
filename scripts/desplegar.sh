#!/usr/bin/env bash
# Despliega o actualiza la app en el VPS (producción o staging).
#
#   scripts/desplegar.sh prod       → producción (con respaldos)
#   scripts/desplegar.sh staging    → staging (sin respaldos)
#
# Idempotente: podés correrlo cada vez que quieras publicar una versión nueva.
set -euo pipefail

entorno="${1:-prod}"
case "$entorno" in
  prod)
    proyecto="nutri_prod"
    env_file=".env.produccion"
    perfiles=(--profile respaldos)
    ;;
  staging)
    proyecto="nutri_staging"
    env_file=".env.staging"
    perfiles=()
    ;;
  *)
    echo "Uso: $0 prod|staging" >&2
    exit 1
    ;;
esac

[ -f "$env_file" ] || { echo "Falta $env_file (copiá desde ${env_file}.example)"; exit 1; }

echo "==> Actualizando código (git pull)"
git pull --ff-only

# El reverse proxy es nginx en el HOST (ver docs/nginx.conf.ejemplo); la app
# publica su puerto en 127.0.0.1 y nginx proxea ahí. No hay proxy en Docker.
echo "==> Construyendo y levantando '$entorno' (proyecto $proyecto)"
docker compose -p "$proyecto" --env-file "$env_file" -f docker-compose.prod.yml \
  "${perfiles[@]}" up -d --build

echo "==> Limpiando imágenes viejas"
docker image prune -f >/dev/null || true

echo "==> Estado:"
docker compose -p "$proyecto" -f docker-compose.prod.yml ps
echo "Listo ✅  ($entorno)"
