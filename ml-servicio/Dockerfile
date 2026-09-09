# syntax=docker/dockerfile:1

# =============================================================================
# Servicio de ML del consultorio (FastAPI + psycopg + numpy).
#
# Corre como un contenedor más del stack, en la red interna y SIN publicar
# puertos: sólo lo alcanza la app por http://ml:8000. No necesita salir a
# internet ni que Postgres se exponga afuera.
#
# Construir y correr suelto (desarrollo):
#   docker build -t nutricionista-ml ./ml-servicio
#   docker run --rm -p 8000:8000 -e DATABASE_URL_RO=... nutricionista-ml
# =============================================================================

FROM python:3.13-slim AS base

# Sin .pyc y sin buffering: los logs salen en el momento, que es lo que hace
# `docker logs` útil durante un incidente. Con buffering, la línea que explica
# el fallo puede quedarse en memoria de un proceso que ya murió.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Las dependencias van ANTES del código: mientras requirements.txt no cambie,
# Docker reutiliza esta capa y el build no vuelve a bajar numpy.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY *.py ./

# Usuario sin privilegios: el proceso no necesita root para nada, y si alguna
# vez hay una ejecución remota de código en una dependencia, el radio de daño
# es mucho menor.
RUN useradd --create-home --shell /usr/sbin/nologin ml \
    && chown -R ml:ml /app
USER ml

EXPOSE 8000

# Sonda de salud: verifica que el proceso sirva HTTP. No consulta la base a
# propósito — el servicio degrada elegantemente cuando la base no está
# (devuelve un insight informativo), así que "sin base" no es "sin servicio", y
# reiniciar el contenedor no arreglaría nada.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=4).status==200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
