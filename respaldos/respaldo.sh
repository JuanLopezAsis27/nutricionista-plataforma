#!/bin/sh
# Un respaldo completo: vuelca la base, la CIFRA, sube el dump a OVH y espeja el
# bucket de archivos (fotos/PDFs) a OVH. Retención local y offsite de los dumps.
#
# ## Cifrado (RESPALDO_GPG_RECIPIENT)
#
# El volcado contiene la base clínica entera: historias, laboratorios,
# antropometrías, mensajes y datos de contacto de todos los pacientes de todos
# los consultorios. Antes salía del VPS en texto plano hacia un bucket de un
# tercero, así que cualquiera que llegara a ese bucket —credencial filtrada,
# error de política, incidente del proveedor— se llevaba la base completa sin
# tocar la aplicación.
#
# Ahora, si está definida `RESPALDO_GPG_RECIPIENT`, el dump se cifra con esa
# clave pública ANTES de subirse. La clave PRIVADA no vive en el VPS: sin ella
# el archivo no sirve de nada, ni siquiera para quien controle el servidor.
#
# Preparación (una sola vez, en tu máquina, NO en el VPS):
#   gpg --full-generate-key                      # guardá la privada a resguardo
#   gpg --armor --export tu@correo > clave.asc
# En el VPS:
#   gpg --import clave.asc
#   # y en .env.produccion:  RESPALDO_GPG_RECIPIENT=tu@correo
#
# Restaurar:  gpg --decrypt archivo.dump.gpg > archivo.dump
#             pg_restore ... archivo.dump
#
# Si la variable NO está definida, el respaldo sigue funcionando sin cifrar (es
# lo que había) pero avisa fuerte en cada corrida. Se eligió avisar y no abortar
# para que la mejora no deje a nadie sin respaldos de un día para el otro.
set -eu

marca=$(date +%Y%m%d-%H%M%S)
dir_db="/respaldos/db"
mkdir -p "$dir_db"

echo "[respaldo] $(date '+%F %T') — iniciando"

# 1. Volcado de la base en formato custom (comprimido, restaurable con pg_restore).
archivo="$dir_db/nutricionista-$marca.dump"
pg_dump --format=custom --no-owner --no-privileges --dbname="$DATABASE_URL" --file="$archivo"
echo "[respaldo] dump creado: $archivo ($(du -h "$archivo" | cut -f1))"

# 2. Cifrado del dump.
if [ -n "${RESPALDO_GPG_RECIPIENT:-}" ]; then
  # --trust-model always: la clave se importó a mano en el VPS, no hay una red
  # de confianza que validar y sin esto gpg pide confirmación interactiva.
  gpg --batch --yes --trust-model always \
      --recipient "$RESPALDO_GPG_RECIPIENT" \
      --output "$archivo.gpg" \
      --encrypt "$archivo"

  # El dump en claro se borra en cuanto existe la versión cifrada: dejarlo en el
  # disco del VPS anularía el punto del cifrado.
  rm -f "$archivo"
  archivo="$archivo.gpg"
  echo "[respaldo] dump cifrado para $RESPALDO_GPG_RECIPIENT"
else
  echo "[respaldo] ATENCIÓN: RESPALDO_GPG_RECIPIENT no está definida."
  echo "[respaldo] El volcado con TODAS las historias clínicas va a salir del"
  echo "[respaldo] servidor SIN CIFRAR. Ver el encabezado de respaldo.sh."
fi

# 3. Alias de mc: origen = MinIO de este stack; destino = OVH Object Storage.
mc alias set origen "$S3_ENDPOINT" "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
mc alias set ovh "$OVH_S3_ENDPOINT" "$OVH_S3_ACCESS_KEY" "$OVH_S3_SECRET_KEY" >/dev/null

# 4. Subir el dump de la base a OVH (carpeta db/).
mc cp "$archivo" "ovh/$OVH_S3_BUCKET/db/"
echo "[respaldo] dump subido: ovh/$OVH_S3_BUCKET/db/$(basename "$archivo")"

# 5. Espejar el bucket de archivos MinIO → OVH (sin --remove: nunca borra del
#    destino, así una eliminación accidental en la app no destruye la copia).
mc mirror --overwrite "origen/$S3_BUCKET" "ovh/$OVH_S3_BUCKET/bucket" >/dev/null
echo "[respaldo] bucket de archivos espejado a OVH"

# 6. Retención de los dumps (local y offsite) según RETENCION_DIAS.
#    Cubre las dos extensiones para no dejar huérfanos si se activa o desactiva
#    el cifrado a mitad de camino.
find "$dir_db" -name '*.dump' -mtime "+${RETENCION_DIAS:-14}" -delete
find "$dir_db" -name '*.dump.gpg' -mtime "+${RETENCION_DIAS:-14}" -delete
mc rm --recursive --force --older-than "${RETENCION_DIAS:-14}d" "ovh/$OVH_S3_BUCKET/db/" >/dev/null 2>&1 || true

echo "[respaldo] $(date '+%F %T') — completado"
