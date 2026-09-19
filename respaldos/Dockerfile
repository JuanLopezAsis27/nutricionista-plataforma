# Imagen de respaldos: pg_dump (PostgreSQL 18) + mc (cliente MinIO/S3) para
# subir las copias a OVH Object Storage. Corre un programador que hace un
# respaldo diario a la hora indicada.
# El stage final lleva nombre para que la matriz de construcción del CI pueda
# pasar `--target` de forma uniforme en los cuatro componentes, sin un caso
# especial con el target vacío.

# mc (MinIO Client) sale de la imagen OFICIAL, fijada al mismo tag que usa
# `crear_bucket` en docker-compose.prod.yml, y NO de una descarga.
# Antes se bajaba de https://dl.min.io/client/mc/release/linux-amd64/mc, que
# MinIO retiró (responde 410 Gone): es el mismo retiro que ya obligó a pasar
# minio/minio de Docker Hub a quay.io. No falló el día del retiro sino cuando
# cambió el digest de postgres:18 y el CI dejó de encontrar esta capa en caché:
# una URL sin versión es una dependencia que se rompe sola, sin tocar el repo.
# quay.io sirve los tags ya publicados, y el binario es estático (Go), así que
# corre igual sobre la Debian de postgres.
FROM quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z AS mc

FROM postgres:18 AS respaldo

# ca-certificates para TLS contra OVH. gnupg cifra el volcado antes de que salga
# del servidor (ver respaldo.sh): el dump lleva la base clínica entera y viajaba
# en claro a un bucket de terceros.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gnupg \
  && rm -rf /var/lib/apt/lists/*

COPY --from=mc /usr/bin/mc /usr/local/bin/mc

COPY respaldo.sh programador.sh restaurar-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/respaldo.sh /usr/local/bin/programador.sh /usr/local/bin/restaurar-db.sh

# Sobreescribe el entrypoint de la imagen postgres (no arranca un servidor).
ENTRYPOINT ["programador.sh"]
