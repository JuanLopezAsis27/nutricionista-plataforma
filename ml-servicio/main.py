"""
Microservicio de ML del consultorio.

Es el "cerebro" detrás de los puertos de IA de la app TypeScript:
  - IAnalisisPredictivo  → POST /insights   (implementado con modelos reales)
  - IAnalisisComidaIA    → POST /analizar-comida  (la app usa Claude; esto es opcional)

La app (Next.js) llama a este servicio vía los adaptadores HTTP
(src/infraestructura/ml/*). Si el servicio no está corriendo, la app cae a los
stubs de demostración y sigue funcionando.

`/insights` lee una RÉPLICA DE SOLO LECTURA de la base (DATABASE_URL_RO),
construye las features por paciente (features.py) y corre los modelos
interpretables (modelos.py). Corre FUERA del VPS (nube on-demand); ver README.

Correr en local:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import os
from typing import Literal, Optional

# Carga las variables del archivo .env ANTES de leerlas (uvicorn no lo hace solo).
# Sin esto, DATABASE_URL_RO/ML_SERVICE_TOKEN del .env no llegan al proceso.
try:
    from dotenv import load_dotenv

    load_dotenv()
except ModuleNotFoundError:
    pass  # en Docker/serverless las vars vienen del entorno; no hace falta .env

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from db import conexion
from features import extraer
from modelos import riesgo_abandono, score_adherencia, tendencia_peso

app = FastAPI(title="ML consultorio", version="1.0.0")

# --- Auth (opcional) --------------------------------------------------------
ML_TOKEN = os.environ.get("ML_SERVICE_TOKEN")


def verificar_token(authorization: Optional[str] = Header(default=None)) -> None:
    """Si hay token configurado, exige el Bearer que manda la app."""
    if not ML_TOKEN:
        return
    if authorization != f"Bearer {ML_TOKEN}":
        raise HTTPException(status_code=401, detail="Token inválido.")


# --- Contratos (deben coincidir con los adaptadores TS) ---------------------
Severidad = Literal["INFO", "ATENCION", "CRITICO"]
ORDEN_SEVERIDAD = {"CRITICO": 0, "ATENCION": 1, "INFO": 2}
MAX_INSIGHTS = 12


class InsightsRequest(BaseModel):
    nutricionistaId: Optional[str] = None


class Insight(BaseModel):
    tipo: str
    titulo: str
    detalle: str
    severidad: Severidad
    # Paciente al que refiere (None en tarjetas informativas). Habilita el feedback.
    pacienteId: Optional[str] = None


class AnalizarComidaRequest(BaseModel):
    archivoClave: Optional[str] = None
    descripcion: Optional[str] = None


class ResultadoComida(BaseModel):
    descripcion: str
    porcionEstimada: str
    calorias: int
    proteinasG: int
    carbohidratosG: int
    grasasG: int
    confianza: float
    nota: str


# --- Endpoints --------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    return {"status": "ok", "replica": bool(os.environ.get("DATABASE_URL_RO"))}


@app.post("/insights", response_model=list[Insight])
def insights(req: InsightsRequest, _: None = Depends(verificar_token)) -> list[Insight]:
    """
    Insights predictivos para los pacientes de `nutricionistaId`:
    riesgo de abandono, adherencia baja y estancamiento de peso.
    """
    if not req.nutricionistaId:
        return [_info("Enviá el nutricionistaId para calcular los insights de su consultorio.")]

    try:
        with conexion() as conn:
            if conn is None:
                return [
                    _info(
                        "Fuente de datos no configurada (DATABASE_URL_RO). "
                        "Apuntá el servicio a una réplica de solo lectura para activar los insights."
                    )
                ]
            pacientes = extraer(conn, req.nutricionistaId)
    except Exception:  # noqa: BLE001 — degradación: nunca tiramos 500 al nutricionista
        return [_info("No se pudo leer la base de datos en este momento. Reintentá más tarde.")]

    if not pacientes:
        return [_info("Todavía no hay pacientes activos con datos para analizar.")]

    resultado: list[Insight] = []

    # 1. Riesgo de abandono (lo más accionable). Ordenados por probabilidad.
    riesgos = sorted(
        ((p, riesgo_abandono(p)) for p in pacientes),
        key=lambda t: t[1].probabilidad,
        reverse=True,
    )
    for p, r in riesgos:
        if r.probabilidad < 0.40:
            break
        severidad: Severidad = "CRITICO" if r.probabilidad >= 0.60 else "ATENCION"
        resultado.append(
            Insight(
                tipo="RIESGO_ABANDONO",
                titulo=f"Riesgo de abandono: {p.nombre}",
                detalle=f"{round(r.probabilidad * 100)}% de probabilidad — {'; '.join(r.motivos[:2])}.",
                severidad=severidad,
                pacienteId=p.paciente_id,
            )
        )
        if len([i for i in resultado if i.tipo == "RIESGO_ABANDONO"]) >= 6:
            break

    # 2. Adherencia baja (con plan activo).
    for p in pacientes:
        if not p.plan_activo:
            continue
        score = score_adherencia(p)
        if score < 40:
            resultado.append(
                Insight(
                    tipo="ADHERENCIA",
                    titulo=f"Adherencia baja: {p.nombre}",
                    detalle=f"Score de adherencia {score}/100. Conviene reforzar el seguimiento.",
                    severidad="ATENCION",
                    pacienteId=p.paciente_id,
                )
            )
        if len([i for i in resultado if i.tipo == "ADHERENCIA"]) >= 4:
            break

    # 3. Estancamiento de peso.
    for p in pacientes:
        t = tendencia_peso(p)
        if t and t.estancado:
            resultado.append(
                Insight(
                    tipo="TENDENCIA_PESO",
                    titulo=f"Estancamiento de peso: {p.nombre}",
                    detalle=(
                        f"Peso estable (~{t.slope_semana:+.2f} kg/sem, {t.peso_actual} kg) "
                        f"hace varias semanas. Considerar ajustar el plan."
                    ),
                    severidad="INFO",
                    pacienteId=p.paciente_id,
                )
            )
        if len([i for i in resultado if i.tipo == "TENDENCIA_PESO"]) >= 4:
            break

    if not resultado:
        return [_info("Sin señales de riesgo por ahora: la actividad de tus pacientes se ve bien.")]

    resultado.sort(key=lambda i: ORDEN_SEVERIDAD[i.severidad])
    return resultado[:MAX_INSIGHTS]


@app.post("/analizar-comida", response_model=ResultadoComida)
def analizar_comida(
    req: AnalizarComidaRequest, _: None = Depends(verificar_token)
) -> ResultadoComida:
    """
    Estima porción y macros de una comida.

    NOTA: la app ahora resuelve la visión de comida con Claude in-app (adaptador
    AnalisisComidaIAClaude), que tiene precedencia sobre este servicio. Este
    endpoint queda como alternativa/legado; para un modelo de visión propio,
    descargar la imagen del bucket (S3_*) y correr el modelo acá.
    """
    descripcion = (req.descripcion or "").strip() or "Plato con proteína, guarnición y vegetales"
    return ResultadoComida(
        descripcion=descripcion,
        porcionEstimada="1 plato (~350 g)",
        calorias=520,
        proteinasG=32,
        carbohidratosG=45,
        grasasG=22,
        confianza=0.4,
        nota="La app usa Claude para la visión de comida; este endpoint es opcional.",
    )


def _info(detalle: str) -> Insight:
    return Insight(tipo="INFO", titulo="Análisis predictivo", detalle=detalle, severidad="INFO")
