# Imagen de respaldos: pg_dump (PostgreSQL 18) + mc (cliente MinIO/S3) para
# subir las copias a OVH Object Storage. Corre un programador que hace un
# respaldo diario a la hora indicada.
# El stage final lleva nombre para que la matriz de construcción del CI pueda
# pasar `--target` de forma uniforme en los cuatro componentes, sin un caso
# especial con el target vacío.

# mc (MinIO Client) se COMPILA desde el código fuente, fijado a un tag, y no se
# toma de una imagen ni de una descarga. MinIO fue retirando todos los canales
# de binarios uno por uno:
#   - https://dl.min.io/client/mc/release/... responde 410 Gone;
#   - minio/mc en Docker Hub ya no existe;
#   - quay.io/minio/mc pasó a exigir autenticación (401) en 2026-09, rompiendo
#     este build sin tocar el repo, igual que las dos veces anteriores.
# El módulo Go es lo único que queda: proxy.golang.org lo guarda aunque el repo
# desaparezca, y la base de checksums (sum.golang.org) verifica que el código
# sea el mismo que se publicó con ese tag. El binario es estático
# (CGO_ENABLED=0), así que corre igual sobre la Debian de postgres.
# Es el mismo tag que compila minio/Dockerfile (servidor y `crear_bucket`): al
# subirlo, subilo en los dos. Las ldflags son las de los buildscripts de MinIO;
# sin ellas mc se presenta como DEVELOPMENT.GOGET.
FROM golang:1.24-bookworm AS mc
ENV CGO_ENABLED=0
ARG MC_TAG=RELEASE.2025-08-13T08-35-41Z
ARG MC_VERSION=2025-08-13T08:35:41Z
RUN go install -trimpath -ldflags "-s -w \
      -X github.com/minio/mc/cmd.Version=${MC_VERSION} \
      -X github.com/minio/mc/cmd.ReleaseTag=${MC_TAG} \
      -X github.com/minio/mc/cmd.CopyrightYear=2025" \
      github.com/minio/mc@${MC_TAG}

FROM postgres:18 AS respaldo

# ca-certificates para TLS contra OVH. gnupg cifra el volcado antes de que salga
# del servidor (ver respaldo.sh): el dump lleva la base clínica entera y viajaba
# en claro a un bucket de terceros.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gnupg \
  && rm -rf /var/lib/apt/lists/*

COPY --from=mc /go/bin/mc /usr/local/bin/mc

COPY respaldo.sh programador.sh restaurar-db.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/respaldo.sh /usr/local/bin/programador.sh /usr/local/bin/restaurar-db.sh

# Sobreescribe el entrypoint de la imagen postgres (no arranca un servidor).
ENTRYPOINT ["programador.sh"]
