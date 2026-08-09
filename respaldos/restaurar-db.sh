#!/bin/sh
# Restaura la base desde un dump (.dump de pg_dump --format=custom).
#
# Uso (dentro del contenedor de respaldos):
#   docker compose -p nutri_prod -f docker-compose.prod.yml run --rm respaldo \
#     restaurar-db.sh /respaldos/db/nutricionista-AAAAMMDD-HHMMSS.dump
#
# Si el dump está en OVH, primero bajalo:
#   mc alias set ovh "$OVH_S3_ENDPOINT" "$OVH_S3_ACCESS_KEY" "$OVH_S3_SECRET_KEY"
#   mc cp ovh/$OVH_S3_BUCKET/db/<archivo>.dump /respaldos/db/
set -eu

archivo="${1:?Uso: restaurar-db.sh <archivo.dump>}"
if [ ! -f "$archivo" ]; then
  echo "[restaurar] no existe el archivo: $archivo" >&2
  exit 1
fi

echo "[restaurar] ADVERTENCIA: se van a sobrescribir objetos de la base actual."
echo "[restaurar] restaurando desde: $archivo"
# --clean --if-exists: elimina y recrea los objetos; --no-owner/--no-privileges
# evita problemas de roles entre entornos.
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$archivo"
echo "[restaurar] completado."
