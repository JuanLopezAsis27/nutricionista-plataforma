#!/usr/bin/env bash
# =============================================================================
# Vuelve a una versión anterior.
#
#   scripts/revertir.sh prod            → lista las versiones disponibles
#   scripts/revertir.sh prod <sha>      → despliega esa versión
#   scripts/revertir.sh staging <sha>
#
# Esto es posible porque cada imagen se publica etiquetada con el SHA del commit
# que la generó. Antes no existía vuelta atrás: las imágenes no tenían etiqueta,
# la anterior quedaba sin referencia y `docker image prune` la borraba, así que
# revertir significaba recompilar desde cero EN el servidor caído — decenas de
# minutos, en el peor momento posible.
#
# Ahora revertir es descargar una etiqueta distinta: el mismo tiempo que un
# despliegue normal (~40 s), sin compilar nada.
#
# ⚠️ LO QUE ESTE SCRIPT **NO** DESHACE: LAS MIGRACIONES DE BASE DE DATOS.
#
# Prisma no genera migraciones inversas. Si la versión que estás dejando atrás
# aplicó un cambio destructivo (un DROP COLUMN, por ejemplo), el esquema YA
# cambió y el código viejo puede no funcionar contra él. En ese caso lo que
# corresponde es restaurar un respaldo, no revertir la imagen.
#
# Por eso conviene el patrón expand/contract: una versión AGREGA lo nuevo y
# escribe en ambos lados; la siguiente, ya estable, elimina lo viejo. Así
# siempre hay una versión atrás a la que se puede volver.
# =============================================================================
set -euo pipefail

entorno="${1:-}"
etiqueta="${2:-}"

case "$entorno" in
  prod)    proyecto="nutri_prod";    env_file=".env.produccion" ;;
  staging) proyecto="nutri_staging"; env_file=".env.staging" ;;
  *)
    echo "Uso: $0 prod|staging [sha]" >&2
    echo "     Sin sha, lista las versiones disponibles en este servidor." >&2
    exit 1
    ;;
esac

registro="${REGISTRO:-ghcr.io/juanlopezasis27/nutricionista-plataforma}"

if [ -z "$etiqueta" ]; then
  echo "Versiones de la app descargadas en este servidor (más nueva primero):"
  echo
  docker image ls "$registro/app" \
    --format '  {{.Tag}}\t{{.CreatedSince}}\t{{.Size}}' \
    | grep -v '<none>' || echo "  (ninguna)"
  echo
  echo "Corriendo ahora:"
  actual=$(docker compose -p "$proyecto" -f docker-compose.prod.yml ps -q app 2>/dev/null || true)
  if [ -n "$actual" ]; then
    docker inspect --format '  {{.Config.Image}}' "$actual"
  else
    echo "  (la app no está levantada)"
  fi
  echo
  echo "Para revertir:  $0 $entorno <sha>"
  echo "Si el SHA que buscás no figura arriba, igual sirve: se descarga del registry."
  exit 0
fi

[ -f "$env_file" ] || { echo "Falta $env_file en este servidor." >&2; exit 1; }

echo "=============================================================="
echo " REVERTIR $entorno  →  $etiqueta"
echo "=============================================================="
echo
echo "Recordá: esto cambia el CÓDIGO, no el ESQUEMA de la base."
echo "Si la versión que dejás atrás aplicó una migración destructiva,"
echo "revertir la imagen no alcanza y hay que restaurar un respaldo."
echo

# El checkout deja el compose y los scripts en la misma versión que la imagen,
# para que no se despliegue un compose nuevo con una imagen vieja.
if git rev-parse --verify --quiet "$etiqueta^{commit}" >/dev/null; then
  echo "==> Alineando el repositorio con $etiqueta"
  git checkout --detach "$etiqueta"
else
  echo "==> Aviso: $etiqueta no es un commit conocido en este clon."
  echo "    Se despliega la imagen igual, pero el compose queda en la versión actual."
  echo "    Si falla, probá:  git fetch origin && $0 $entorno $etiqueta"
fi

IMAGE_TAG="$etiqueta" exec "$(dirname "$0")/desplegar.sh" "$entorno"
