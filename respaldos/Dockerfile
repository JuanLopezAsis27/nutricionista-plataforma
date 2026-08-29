# Imagen de respaldos: pg_dump (PostgreSQL 18) + mc (cliente MinIO/S3) para
# subir las copias a OVH Object Storage. Corre un programador que hace un
# respaldo diario a la hora indicada.
FROM postgres:18

# mc (MinIO Client) para copiar/espejar hacia S3 (OVH). ca-certificates para TLS.
# gnupg cifra el volcado antes de que salga del servidor (ver respaldo.sh): el
# dump lleva la base clínica entera y viajaba en claro a un bucket de terceros.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
  && curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
  && chmod +x /usr/local/bin/mc \
  && apt-get purge -y curl \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

COPY respaldo.sh programador.sh restaurar-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/respaldo.sh /usr/local/bin/programador.sh /usr/local/bin/restaurar-db.sh

# Sobreescribe el entrypoint de la imagen postgres (no arranca un servidor).
ENTRYPOINT ["programador.sh"]
