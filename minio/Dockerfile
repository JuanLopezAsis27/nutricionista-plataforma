# Imagen de MinIO: el servidor del bucket + mc (MinIO Client), los dos
# COMPILADOS desde el código fuente y fijados a un tag.
#
# Por qué no la imagen oficial: MinIO dejó de publicar binarios e imágenes de
# forma pública, uno por uno —minio/minio y minio/mc en Docker Hub ya no
# existen, dl.min.io responde 410 Gone y quay.io/minio/* pasó a exigir
# autenticación (401) en 2026-09—. Cada retiro rompió el CI o un `compose pull`
# sin que nadie tocara el repo.
#
# El módulo Go es lo único que queda: proxy.golang.org guarda la versión aunque
# el repo desaparezca, y sum.golang.org verifica que el código sea el publicado
# con ese tag. Los binarios salen estáticos (CGO_ENABLED=0).
#
# La usan dos servicios del compose: `minio` (el servidor) y `crear_bucket`
# (que solo necesita mc y sobreescribe el entrypoint). mc también hace falta en
# el servidor: el healthcheck es `mc ready local`, como en la imagen oficial.
#
# Al subir el tag de mc, subilo también en respaldos/Dockerfile.

FROM golang:1.24-bookworm AS compilacion
ENV CGO_ENABLED=0

# Version/ReleaseTag/CopyrightYear se inyectan como en los buildscripts de
# MinIO (gen-ldflags.go); sin eso los binarios se presentan como
# DEVELOPMENT.GOGET.
ARG MINIO_TAG=RELEASE.2025-09-07T16-13-09Z
ARG MINIO_VERSION=2025-09-07T16:13:09Z
ARG MC_TAG=RELEASE.2025-08-13T08-35-41Z
ARG MC_VERSION=2025-08-13T08:35:41Z

RUN go install -trimpath -ldflags "-s -w \
      -X github.com/minio/minio/cmd.Version=${MINIO_VERSION} \
      -X github.com/minio/minio/cmd.ReleaseTag=${MINIO_TAG} \
      -X github.com/minio/minio/cmd.CopyrightYear=2025" \
      github.com/minio/minio@${MINIO_TAG}

RUN go install -trimpath -ldflags "-s -w \
      -X github.com/minio/mc/cmd.Version=${MC_VERSION} \
      -X github.com/minio/mc/cmd.ReleaseTag=${MC_TAG} \
      -X github.com/minio/mc/cmd.CopyrightYear=2025" \
      github.com/minio/mc@${MC_TAG}

FROM debian:bookworm-slim AS minio

# ca-certificates por si algún día el servidor habla TLS hacia afuera
# (notificaciones, replicación); hoy vive en la red interna.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=compilacion /go/bin/minio /go/bin/mc /usr/bin/

VOLUME ["/data"]
EXPOSE 9000 9001

# Igual que la oficial: el `command` del compose son los argumentos de minio
# (`server /data --console-address ":9001"`).
ENTRYPOINT ["minio"]
