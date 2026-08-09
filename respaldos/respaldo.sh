#!/bin/sh
# Un respaldo completo: vuelca la base, sube el dump a OVH y espeja el bucket de
# archivos (fotos/PDFs) a OVH. Retención local y offsite de los dumps.
set -eu

marca=$(date +%Y%m%d-%H%M%S)
dir_db="/respaldos/db"
mkdir -p "$dir_db"

echo "[respaldo] $(date '+%F %T') — iniciando"

# 1. Volcado de la base en formato custom (comprimido, restaurable con pg_restore).
archivo="$dir_db/nutricionista-$marca.dump"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$archivo"
echo "[respaldo] dump creado: $archivo ($(du -h "$archivo" | cut -f1))"

# 2. Alias de mc: origen = MinIO de este stack; destino = OVH Object Storage.
mc alias set origen "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
mc alias set ovh "$OVH_S3_ENDPOINT" "$OVH_S3_ACCESS_KEY" "$OVH_S3_SECRET_KEY" >/dev/null

# 3. Subir el dump de la base a OVH (carpeta db/).
mc cp "$archivo" "ovh/$OVH_S3_BUCKET/db/"
echo "[respaldo] dump subido: ovh/$OVH_S3_BUCKET/db/$(basename "$archivo")"

# 4. Espejar el bucket de archivos MinIO → OVH (sin --remove: nunca borra del
#    destino, así una eliminación accidental en la app no destruye la copia).
mc mirror --overwrite "origen/$S3_BUCKET" "ovh/$OVH_S3_BUCKET/bucket" >/dev/null
echo "[respaldo] bucket de archivos espejado a OVH"

# 5. Retención de los dumps (local y offsite) según RETENCION_DIAS.
find "$dir_db" -name '*.dump' -mtime "+${RETENCION_DIAS:-14}" -delete
mc rm --recursive --force --older-than "${RETENCION_DIAS:-14}d" "ovh/$OVH_S3_BUCKET/db/" >/dev/null 2>&1 || true

echo "[respaldo] $(date '+%F %T') — completado"
