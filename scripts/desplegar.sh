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
    # `correo-prueba` levanta Mailpit, que es lo que impide que el worker de
    # staging le escriba a pacientes reales cuando este entorno tenga un dump de
    # producción restaurado. Ver el comentario del servicio en el compose.
    perfiles=(--profile correo-prueba)
    ;;
  *)
    echo "Uso: $0 prod|staging" >&2
    exit 1
    ;;
esac

[ -f "$env_file" ] || { echo "Falta $env_file (copiá desde ${env_file}.example)"; exit 1; }

# El workflow de despliegue hace `git checkout --detach <sha>` ANTES de invocar
# este script, para desplegar exactamente el commit que validó el CI. En ese
# caso no hay nada que traer, y un `git pull` sobre un HEAD desacoplado falla.
#
# Cuando lo corrés a mano estás parado en una rama, y ahí sí conviene actualizar.
if git symbolic-ref -q HEAD >/dev/null; then
  echo "==> Actualizando código (git pull)"
  git pull --ff-only
else
  echo "==> HEAD desacoplado en $(git rev-parse --short HEAD): se despliega ese commit exacto"
fi

# El reverse proxy es nginx en el HOST (ver docs/nginx.conf.ejemplo); la app
# publica su puerto en 127.0.0.1 y nginx proxea ahí. No hay proxy en Docker.
#
# La etiqueta de imagen a desplegar. El workflow pasa el SHA del commit; a mano,
# `latest` (el alias que el CI mueve con cada push a la rama) o un SHA concreto
# para revertir. Se exporta porque docker compose la lee del entorno del shell,
# que tiene precedencia sobre el --env-file.
export IMAGE_TAG="${IMAGE_TAG:-latest}"
compose=(docker compose -p "$proyecto" --env-file "$env_file" -f docker-compose.prod.yml "${perfiles[@]}")

if [ "${CONSTRUIR_LOCAL:-0}" = "1" ]; then
  # Salida de emergencia: compila acá mismo. Es lo que hacía siempre este script
  # antes de mover el build al CI. Sirve para el primer arranque de un servidor
  # nuevo o si GHCR no responde, pero NO es el camino normal: compilar mientras
  # Postgres atiende pacientes es justo lo que se quiso dejar de hacer.
  echo "==> CONSTRUIR_LOCAL=1 — compilando en ESTE servidor (salida de emergencia)"
  "${compose[@]}" up -d --build
else
  echo "==> Descargando imágenes (etiqueta: $IMAGE_TAG)"
  if ! "${compose[@]}" pull; then
    echo "ERROR: no se pudieron descargar las imágenes." >&2
    echo "  · ¿Iniciaste sesión?   docker login ghcr.io -u <usuario>" >&2
    echo "  · ¿Existe la etiqueta '$IMAGE_TAG' en el registry?" >&2
    echo "  · Para compilar acá igual:  CONSTRUIR_LOCAL=1 $0 $entorno" >&2
    exit 1
  fi

  echo "==> Levantando '$entorno' (proyecto $proyecto)"
  # --no-build es deliberado: si por lo que sea faltara una imagen, queremos que
  # falle a la vista y no que se ponga a compilar en producción por su cuenta.
  "${compose[@]}" up -d --no-build
fi

# --- Verificación de que el despliegue realmente funcionó --------------------
#
# `docker compose up -d` vuelve cuando los contenedores ARRANCARON, no cuando la
# app sirve. Sin esta espera, el script terminaba con "Listo ✅" y el workflow
# quedaba en verde aunque la app estuviera reiniciándose en bucle: un despliegue
# roto que se reporta como exitoso es peor que uno que aborta, porque nadie va a
# mirar.
espera="${ESPERA_SALUD:-180}"
echo "==> Esperando a que la app quede sana (hasta ${espera}s)"

cid=$("${compose[@]}" ps -q app)
if [ -z "$cid" ]; then
  echo "ERROR: no existe el contenedor de la app tras el despliegue." >&2
  exit 1
fi

limite=$(( $(date +%s) + espera ))
while true; do
  estado=$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "desconocido")
  if [ "$estado" = "healthy" ]; then
    echo "    app sana ✅"
    break
  fi
  if [ "$(date +%s)" -ge "$limite" ]; then
    echo "ERROR: la app no llegó a 'healthy' en ${espera}s (último estado: $estado)." >&2
    echo "Últimas líneas del log:" >&2
    "${compose[@]}" logs --tail 40 app >&2
    echo >&2
    echo "El stack anterior YA fue reemplazado. Para volver atrás:" >&2
    echo "  ./scripts/revertir.sh $entorno <sha-anterior>" >&2
    exit 1
  fi
  sleep 5
done

# Limpieza acotada de imágenes.
#
# `prune -f` a secas sólo borra las colgantes, así que ahora que cada imagen
# lleva su SHA NINGUNA queda colgante y se acumularían para siempre: volveríamos
# a llenar el disco, que es justo lo que se acaba de arreglar.
#
# El filtro conserva ~14 días de imágenes —suficiente para revertir a cualquier
# versión reciente— y borra lo anterior. Docker nunca elimina una imagen que
# tenga un contenedor asociado, ni siquiera detenido, así que lo que está en uso
# está a salvo.
echo "==> Limpiando imágenes de más de 14 días (conserva las recientes para revertir)"
docker image prune -af --filter "until=${RETENCION_IMAGENES:-336h}" >/dev/null 2>&1 || true

echo "==> Estado:"
"${compose[@]}" ps
echo "Listo ✅  ($entorno · commit $(git rev-parse --short HEAD) · imagen $IMAGE_TAG)"
