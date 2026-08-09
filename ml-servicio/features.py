"""
Extracción de *features* (señales) por paciente para un nutricionista.

Todo se filtra por el inquilino: primero se listan los pacientes activos del
`nutricionistaId`, y el resto de las señales se acota a ESOS pacientes
(`"pacienteId" = ANY(...)`), así nunca se cruzan datos entre consultorios.

Las señales son las mismas que usaría un modelo entrenado; hoy alimentan
modelos interpretables (ver modelos.py), mañana un modelo de ML sin cambiar
esta capa.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import psycopg

from db import consultar


@dataclass
class FeaturesPaciente:
    paciente_id: str
    nombre: str
    # Días desde la última señal de actividad (diario o turno completado).
    # None = nunca registró actividad (paciente nuevo o inactivo desde el alta).
    dias_sin_actividad: Optional[int]
    registros_30d: int
    registros_60d: int
    turnos_total: int
    turnos_cancelados: int
    turnos_completados: int
    tiene_turno_proximo: bool
    plan_activo: bool
    plan_vencido: bool
    # Serie de peso (fecha, kg) ordenada por fecha, de diario + antropometría.
    pesos: list[tuple[date, float]] = field(default_factory=list)


def extraer(conn: psycopg.Connection, nutricionista_id: str) -> list[FeaturesPaciente]:
    hoy = date.today()

    pacientes = consultar(
        conn,
        'SELECT id, nombre, apellido FROM pacientes '
        'WHERE "nutricionistaId" = %s AND activo = true',
        (nutricionista_id,),
    )
    if not pacientes:
        return []
    ids = [p["id"] for p in pacientes]

    diario = _por_paciente(
        consultar(
            conn,
            'SELECT "pacienteId", max(fecha) AS ultimo, '
            "count(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '30 days') AS reg_30d, "
            "count(*) FILTER (WHERE fecha >= CURRENT_DATE - INTERVAL '60 days') AS reg_60d "
            'FROM registros_diarios WHERE "pacienteId" = ANY(%s) GROUP BY "pacienteId"',
            (ids,),
        )
    )

    turnos = _por_paciente(
        consultar(
            conn,
            'SELECT "pacienteId", '
            "count(*) FILTER (WHERE estado = 'CANCELADO') AS cancelados, "
            "count(*) FILTER (WHERE estado = 'COMPLETADO') AS completados, "
            "count(*) AS total, "
            "max(fecha) FILTER (WHERE estado = 'COMPLETADO') AS ultimo_completado, "
            "count(*) FILTER (WHERE fecha >= CURRENT_DATE "
            "AND estado IN ('PENDIENTE', 'CONFIRMADO')) AS proximos "
            'FROM turnos WHERE "pacienteId" = ANY(%s) '
            "AND fecha >= CURRENT_DATE - INTERVAL '180 days' GROUP BY \"pacienteId\"",
            (ids,),
        )
    )

    planes = _por_paciente(
        consultar(
            conn,
            'SELECT "pacienteId", max("fechaFin") AS fecha_fin, count(*) AS activos '
            'FROM asignaciones_plan WHERE activa = true AND "pacienteId" = ANY(%s) '
            'GROUP BY "pacienteId"',
            (ids,),
        )
    )

    pesos = _pesos_por_paciente(
        consultar(
            conn,
            'SELECT "pacienteId", fecha, "pesoKg"::float AS peso FROM registros_diarios '
            'WHERE "pacienteId" = ANY(%s) AND "pesoKg" IS NOT NULL '
            "UNION ALL "
            'SELECT "pacienteId", fecha, "pesoKg"::float AS peso FROM antropometrias '
            'WHERE "pacienteId" = ANY(%s) '
            'ORDER BY 1, 2',
            (ids, ids),
        )
    )

    resultado: list[FeaturesPaciente] = []
    for p in pacientes:
        pid = p["id"]
        d = diario.get(pid, {})
        t = turnos.get(pid, {})
        pl = planes.get(pid, {})

        ultimas_fechas = [f for f in (d.get("ultimo"), t.get("ultimo_completado")) if f]
        dias_sin = min((hoy - f).days for f in ultimas_fechas) if ultimas_fechas else None

        fecha_fin = pl.get("fecha_fin")
        plan_activo = (pl.get("activos") or 0) > 0

        resultado.append(
            FeaturesPaciente(
                paciente_id=pid,
                nombre=f"{p['nombre']} {p['apellido']}".strip(),
                dias_sin_actividad=dias_sin,
                registros_30d=int(d.get("reg_30d") or 0),
                registros_60d=int(d.get("reg_60d") or 0),
                turnos_total=int(t.get("total") or 0),
                turnos_cancelados=int(t.get("cancelados") or 0),
                turnos_completados=int(t.get("completados") or 0),
                tiene_turno_proximo=(t.get("proximos") or 0) > 0,
                plan_activo=plan_activo,
                plan_vencido=bool(plan_activo and fecha_fin and fecha_fin < hoy),
                pesos=pesos.get(pid, []),
            )
        )
    return resultado


def _por_paciente(filas: list[dict]) -> dict[str, dict]:
    return {f["pacienteId"]: f for f in filas}


def _pesos_por_paciente(filas: list[dict]) -> dict[str, list[tuple[date, float]]]:
    agrupado: dict[str, list[tuple[date, float]]] = {}
    for f in filas:
        agrupado.setdefault(f["pacienteId"], []).append((f["fecha"], float(f["peso"])))
    # Ya vienen ordenadas por fecha (ORDER BY en el SQL).
    return agrupado
