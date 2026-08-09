"""
Acceso a la RÉPLICA DE SOLO LECTURA de la base de la app.

Nunca escribe. Nunca se conecta a la primaria de producción: usar
`DATABASE_URL_RO` (una réplica o un usuario de solo lectura). Si la variable no
está, `conectar()` devuelve None y el servicio degrada con un mensaje informativo
en vez de fallar.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg
from psycopg.rows import dict_row


def url_replica() -> Optional[str]:
    return os.environ.get("DATABASE_URL_RO")


@contextmanager
def conexion() -> Iterator[Optional[psycopg.Connection]]:
    """Abre una conexión de solo lectura (o cede None si no está configurada)."""
    url = url_replica()
    if not url:
        yield None
        return
    conn = psycopg.connect(url, row_factory=dict_row, connect_timeout=10)
    try:
        # Defensa extra: la sesión es de solo lectura pase lo que pase.
        conn.execute("SET default_transaction_read_only = on")
        yield conn
    finally:
        conn.close()


def consultar(conn: psycopg.Connection, sql: str, params: tuple) -> list[dict]:
    """Ejecuta un SELECT y devuelve las filas como diccionarios."""
    return conn.execute(sql, params).fetchall()
