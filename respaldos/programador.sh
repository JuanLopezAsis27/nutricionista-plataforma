#!/bin/sh
# Programador simple: corre respaldo.sh una vez por día a HORA_RESPALDO (hora
# local según TZ). Sin cron externo: duerme hasta la próxima ejecución.
set -eu

hora="${HORA_RESPALDO:-03:00}"
echo "[programador] respaldos activos — hora diaria: $hora (TZ=${TZ:-sistema})"

# Un primer respaldo al arrancar valida la config y cubre el contenedor recién
# creado, PERO solo si no hay uno reciente. El contenedor se recrea en cada
# deploy a producción (su imagen lleva el SHA del commit) y con cada reinicio del
# VPS o de Docker: sin este chequeo, cada uno sumaba un respaldo completo (dump
# + espejo del bucket) además del de la hora programada.
#
# "Reciente" se mide contra la marca que respaldo.sh escribe SOLO cuando termina
# bien (dump subido a OVH), no contra el dump del disco: uno que quedó en el VPS
# sin llegar a OVH no protege de que el VPS se muera. La marca vive en el volumen
# /respaldos, que sobrevive a la recreación del contenedor. Si no existe (primer
# arranque), el respaldo corre.
horas_minimas="${RESPALDO_INICIAL_MIN_HORAS:-20}"
marca="/respaldos/.ultimo_exito"
if [ -f "$marca" ] && [ -n "$(find "$marca" -mmin "-$((horas_minimas * 60))" 2>/dev/null)" ]; then
  echo "[programador] ya hay un respaldo exitoso de hace menos de ${horas_minimas} h: se omite el inicial"
else
  /usr/local/bin/respaldo.sh || echo "[programador] ERROR en el respaldo inicial (continúa el ciclo)"
fi

while true; do
  ahora=$(date +%s)
  objetivo=$(date -d "$hora" +%s)
  if [ "$objetivo" -le "$ahora" ]; then
    objetivo=$(date -d "tomorrow $hora" +%s)
  fi
  espera=$((objetivo - ahora))
  echo "[programador] próximo respaldo: $(date -d "@$objetivo" '+%F %T') (en ${espera}s)"
  sleep "$espera"
  /usr/local/bin/respaldo.sh || echo "[programador] ERROR en el respaldo (se reintenta mañana)"
done
