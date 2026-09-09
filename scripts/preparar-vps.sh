#!/usr/bin/env bash
# =============================================================================
# Prepara un VPS Debian/Ubuntu limpio para correr la aplicación.
#
#   sudo ./scripts/preparar-vps.sh staging
#   sudo ./scripts/preparar-vps.sh prod
#
# IDEMPOTENTE: se puede correr las veces que haga falta. Cada paso comprueba si
# ya está hecho antes de tocar nada.
#
# POR QUÉ EXISTE ESTE ARCHIVO
#
# La guía de docs/DESPLIEGUE.md describe ~25 pasos manuales. Una guía que nunca
# se ejecutó dos veces no es un procedimiento de recuperación: es una hipótesis.
# El día que haya que reconstruir el servidor —disco muerto, incidente del
# proveedor— nadie quiere descubrir bajo presión que faltaba un paso.
#
# Montar el VPS de staging es la única oportunidad barata de ensayar ese
# desastre: se corre este script sobre una máquina limpia y, si funciona, queda
# probado que el procedimiento de reconstrucción sirve.
#
# LO QUE ESTE SCRIPT **NO** HACE (a propósito):
#   - No crea el archivo .env: lleva secretos y se completa a mano.
#   - No emite el certificado TLS: certbot necesita que el DNS ya apunte acá.
#   - No despliega la aplicación: eso es scripts/desplegar.sh.
#   - No formatea discos: destruir datos nunca debe ser automático.
# =============================================================================
set -euo pipefail

entorno="${1:-}"
case "$entorno" in
  prod|staging) ;;
  *) echo "Uso: $0 prod|staging" >&2; exit 1 ;;
esac

if [ "$(id -u)" -ne 0 ]; then
  echo "Este script necesita root (usá sudo)." >&2
  exit 1
fi

paso() { echo; echo "==> $*"; }
ok()   { echo "    ✓ $*"; }
aviso(){ echo "    ! $*"; }

# --- 1. Paquetes base --------------------------------------------------------
paso "Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# ufw: firewall. gnupg: cifrado de los respaldos. curl/ca-certificates: TLS.
apt-get install -y -qq --no-install-recommends \
  ca-certificates curl gnupg ufw nginx certbot python3-certbot-nginx >/dev/null
ok "nginx, certbot, ufw, gnupg instalados"

# --- 2. Docker ---------------------------------------------------------------
paso "Docker Engine + Compose v2"
if command -v docker >/dev/null 2>&1; then
  ok "docker ya instalado ($(docker --version))"
else
  curl -fsSL https://get.docker.com | sh >/dev/null
  ok "docker instalado ($(docker --version))"
fi

if docker compose version >/dev/null 2>&1; then
  ok "compose v2 disponible ($(docker compose version --short))"
else
  echo "ERROR: falta Docker Compose v2." >&2
  exit 1
fi

# El usuario que despliega por SSH tiene que poder hablar con el demonio de
# Docker sin sudo, porque el workflow no puede escribir una contraseña.
usuario_despliegue="${SUDO_USER:-}"
if [ -n "$usuario_despliegue" ] && [ "$usuario_despliegue" != "root" ]; then
  if id -nG "$usuario_despliegue" | grep -qw docker; then
    ok "$usuario_despliegue ya está en el grupo docker"
  else
    usermod -aG docker "$usuario_despliegue"
    aviso "$usuario_despliegue agregado al grupo docker — tiene que volver a iniciar sesión"
  fi
fi

# --- 3. Firewall -------------------------------------------------------------
#
# Sólo 22, 80 y 443. La app publica su puerto en 127.0.0.1 y Postgres, MinIO y
# el worker no publican ninguno, así que no hay nada más que abrir.
paso "Firewall (ufw)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
if ufw status | grep -q "^Status: active"; then
  ok "ufw ya estaba activo"
else
  ufw --force enable >/dev/null
  ok "ufw activado"
fi
ok "abiertos: 22, 80, 443 (nada más)"

# --- 4. Directorios ----------------------------------------------------------
paso "Directorios de trabajo"
# Llavero GPG con la clave PÚBLICA de cifrado de respaldos. La privada no vive
# acá: sin ella, un dump robado del bucket externo no sirve de nada.
install -d -m 700 /etc/nutricionista/llaves
ok "/etc/nutricionista/llaves"

# Donde respaldo.sh deja las métricas que lee node_exporter.
install -d -m 755 /var/lib/node_exporter/textfile_collector
ok "/var/lib/node_exporter/textfile_collector"

if [ "$entorno" = "staging" ]; then
  install -d -m 755 /srv/staging/minio
  ok "/srv/staging/minio (bucket de staging, disco principal)"
else
  if mountpoint -q /mnt/bucket; then
    install -d -m 755 /mnt/bucket/minio
    ok "/mnt/bucket/minio (disco secundario montado)"
  else
    aviso "/mnt/bucket NO está montado."
    aviso "  El bucket de producción va en el disco secundario. Montalo y volvé a correr:"
    aviso "    lsblk                                  # identificá el disco"
    aviso "    mkfs.ext4 /dev/sdX                     # SOLO si está vacío"
    aviso "    mount /dev/sdX /mnt/bucket"
    aviso "    echo '/dev/sdX /mnt/bucket ext4 defaults,nofail 0 2' >> /etc/fstab"
  fi
fi

# --- 5. node_exporter --------------------------------------------------------
#
# Publica CPU, RAM y DISCO, que es lo que alimenta las dos alertas que evitan
# los incidentes que causan pérdida de datos. Escucha SOLO en la interfaz
# privada o localhost: expuesto a internet filtra bastante detalle del host.
paso "node_exporter (métricas del host)"
if systemctl is-active --quiet node_exporter 2>/dev/null; then
  ok "node_exporter ya corriendo"
else
  aviso "node_exporter no está instalado."
  aviso "  Instalalo con el paquete de la distro y arrancalo con:"
  aviso "    --collector.textfile.directory=/var/lib/node_exporter/textfile_collector"
  aviso "    --web.listen-address=127.0.0.1:9100"
  aviso "  (y abrí el 9100 SÓLO hacia la IP del servidor de métricas, nunca a internet)"
fi

# --- 6. Comprobaciones -------------------------------------------------------
paso "Comprobaciones"

memoria_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
# 3500 y no 4096: un VPS de "4 GB" reporta algo menos tras descontar lo que se
# reserva el kernel, y no queremos un aviso falso en una máquina correcta.
minimo=3500
if [ "$memoria_mb" -lt "$minimo" ]; then
  aviso "RAM: ${memoria_mb} MB — POR DEBAJO de lo recomendado (4 GB)."
  aviso "  El stack pide ~1,5-2 GB. En staging, encima va el monitoreo (~600 MB)."
  aviso "  Con menos, los mem_limit del compose van a matar contenedores."
else
  ok "RAM: ${memoria_mb} MB"
fi

disco_libre=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [ "$disco_libre" -lt 20 ]; then
  aviso "Disco libre en /: ${disco_libre} GB — poco margen."
else
  ok "Disco libre en /: ${disco_libre} GB"
fi

if [ -z "$(swapon --show)" ]; then
  aviso "Sin swap. Un pico de memoria mata procesos en vez de ir a disco."
  aviso "  Considerá 2 GB de swap:  fallocate -l 2G /swapfile && chmod 600 /swapfile"
  aviso "                           mkswap /swapfile && swapon /swapfile"
else
  ok "swap activa"
fi

# --- 7. Qué falta ------------------------------------------------------------
cat <<FIN

=============================================================================
 VPS preparado para: $entorno
=============================================================================

Lo que queda, y que este script NO hace por diseño:

  1. Clonar el repositorio y crear el archivo de entorno:
       git clone <repo> && cd nutricionista-app
       cp .env.$([ "$entorno" = prod ] && echo produccion || echo staging).example \\
          .env.$([ "$entorno" = prod ] && echo produccion || echo staging)
       # completá los secretos:  openssl rand -base64 32

  2. Iniciar sesión en el registry (para descargar las imágenes):
       docker login ghcr.io -u TU_USUARIO

  3. nginx + certificado (el DNS ya tiene que apuntar a esta máquina):
       cp docs/nginx.conf.ejemplo /etc/nginx/sites-available/nutricionista
       # editá server_name
       ln -s /etc/nginx/sites-available/nutricionista /etc/nginx/sites-enabled/
       nginx -t && systemctl reload nginx
       certbot --nginx -d TU_DOMINIO

  4. Desplegar:
       ./scripts/desplegar.sh $entorno

FIN
