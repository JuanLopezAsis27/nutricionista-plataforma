"""
Modelos del servicio de ML.

Son modelos INTERPRETABLES (reglas + regresión), no cajas negras: dan resultados
útiles desde el día 1 sin necesitar datos etiquetados ni entrenamiento, y son la
línea base contra la que se comparará un modelo entrenado más adelante
(scikit-learn/XGBoost). La firma de estas funciones no cambia cuando se
reemplace la lógica interna por un modelo entrenado.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

from features import FeaturesPaciente


# --- 1. Riesgo de abandono (dropout) ---------------------------------------
@dataclass
class Abandono:
    probabilidad: float  # 0..1
    motivos: list[str] = field(default_factory=list)


def riesgo_abandono(f: FeaturesPaciente) -> Abandono:
    """
    Probabilidad de que el paciente deje el tratamiento, como combinación
    logística de factores interpretables. El peso mayor lo tiene el tiempo sin
    actividad; un turno próximo agendado reduce el riesgo.
    """
    # Días sin actividad: si nunca registró, 10 si tiene turno próximo (recién
    # ingresó/está agendado) o 40 si no (parece haberse desenganchado).
    dias = f.dias_sin_actividad
    if dias is None:
        dias = 10 if f.tiene_turno_proximo else 40

    tasa_cancel = f.turnos_cancelados / f.turnos_total if f.turnos_total else 0.0

    z = -2.2
    z += 0.06 * min(dias, 90)          # inactividad (señal dominante)
    z += 1.5 * tasa_cancel             # cancela seguido
    if f.registros_30d < 4:
        z += 0.8                        # engagement bajo en el diario
    if f.registros_30d == 0:
        z += 0.4
    if f.plan_vencido:
        z += 0.7                        # plan vencido sin renovar
    if f.tiene_turno_proximo:
        z -= 1.2                        # protector: ya tiene próximo turno

    prob = 1.0 / (1.0 + math.exp(-z))

    motivos: list[str] = []
    if dias >= 14:
        motivos.append(f"sin registrar actividad hace {dias} días")
    if tasa_cancel >= 0.25 and f.turnos_total >= 2:
        motivos.append(f"canceló el {round(tasa_cancel * 100)}% de sus turnos")
    if f.registros_30d < 4:
        motivos.append("pocos registros en el diario el último mes")
    if f.plan_vencido:
        motivos.append("plan vencido sin renovar")
    if not motivos:
        motivos.append("actividad reciente estable")

    return Abandono(probabilidad=round(prob, 2), motivos=motivos)


# --- 2. Adherencia ----------------------------------------------------------
def score_adherencia(f: FeaturesPaciente) -> int:
    """
    Score 0..100 = 70% constancia en el diario (objetivo ~20 registros/mes) +
    30% asistencia a turnos (completados vs. cancelados).
    """
    diario = min(f.registros_30d / 20.0, 1.0)
    decididos = f.turnos_completados + f.turnos_cancelados
    asistencia = f.turnos_completados / decididos if decididos else diario
    return round((0.7 * diario + 0.3 * asistencia) * 100)


# --- 3. Tendencia de peso ---------------------------------------------------
@dataclass
class Tendencia:
    slope_semana: float   # kg por semana (negativo = baja)
    proyeccion_30d: float  # kg estimado a 30 días
    estancado: bool
    peso_actual: float
    n_puntos: int


def tendencia_peso(f: FeaturesPaciente) -> Optional[Tendencia]:
    """
    Regresión lineal por mínimos cuadrados sobre los pesos recientes. Devuelve
    la pendiente (kg/semana), la proyección a 30 días y si está estancado
    (cambio semanal casi nulo sostenido). None si no hay suficientes datos.
    """
    puntos = f.pesos[-12:]  # ventana reciente
    if len(puntos) < 3:
        return None

    dia0 = puntos[0][0]
    x = np.array([(fecha - dia0).days for fecha, _ in puntos], dtype=float)
    y = np.array([peso for _, peso in puntos], dtype=float)
    span = float(x[-1] - x[0])
    if span < 14:  # menos de dos semanas: no proyectamos todavía
        return None

    pendiente_dia, interseccion = np.polyfit(x, y, 1)
    slope_semana = float(pendiente_dia * 7)
    peso_actual = float(y[-1])
    proyeccion = float(pendiente_dia * (x[-1] + 30) + interseccion)

    estancado = abs(slope_semana) < 0.15 and len(puntos) >= 4 and span >= 21

    return Tendencia(
        slope_semana=round(slope_semana, 2),
        proyeccion_30d=round(proyeccion, 1),
        estancado=estancado,
        peso_actual=round(peso_actual, 1),
        n_puntos=len(puntos),
    )
