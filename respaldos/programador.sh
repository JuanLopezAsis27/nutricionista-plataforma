#!/bin/sh
# Programador simple: corre respaldo.sh una vez por día a HORA_RESPALDO (hora
# local según TZ). Sin cron externo: duerme hasta la próxima ejecución.
set -eu

hora="${HORA_RESPALDO:-03:00}"
echo "[programador] respaldos activos — hora diaria: $hora (TZ=${TZ:-sistema})"

# Un primer respaldo al arrancar deja una copia inmediata (y valida la config).
/usr/local/bin/respaldo.sh || echo "[programador] ERROR en el respaldo inicial (continúa el ciclo)"

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
