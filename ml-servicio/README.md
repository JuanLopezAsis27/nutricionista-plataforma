# Microservicio de ML — consultorio

El "cerebro" de análisis predictivo detrás del puerto `IAnalisisPredictivo` de la
app. La app (Next.js) lo llama por HTTP (`/insights`); si el servicio **no está
corriendo o no está configurado**, la app cae a stubs de demostración y sigue
funcionando. Corre **FUERA del VPS** (nube on-demand); ver *Deploy*.

> Ya trae **algoritmos reales e interpretables** que dan resultados útiles desde
> el día 1, sin necesitar datos etiquetados ni entrenamiento. Son la línea base;
> se reemplazan por modelos entrenados (scikit-learn/XGBoost) sin cambiar el
> contrato ni la capa de features.

## Qué hace y qué resultados da

`POST /insights` recibe `{ "nutricionistaId": "..." }`, lee la base (réplica de
solo lectura), arma las **features por paciente** (`features.py`) y corre tres
modelos (`modelos.py`). Devuelve una lista de tarjetas `{ tipo, titulo, detalle,
severidad }` que el nutricionista ve en la pantalla de Análisis IA.

### 1. Riesgo de abandono (dropout)
- **Qué hace:** estima la probabilidad (0–100%) de que un paciente deje el
  tratamiento, para poder reengancharlo a tiempo (un llamado, un mensaje).
- **Cómo funciona:** una **regresión logística interpretable** — combina factores
  con pesos fijos y los pasa por una sigmoide. El factor dominante es el **tiempo
  sin actividad** (último registro en el diario o último turno completado); suman
  también la **tasa de cancelación** de turnos, el **bajo uso del diario** el
  último mes y el **plan vencido**; **resta** tener un **turno próximo agendado**
  (protector). No es una caja negra: cada factor que dispara queda como "motivo".
- **Resultado:** `82% de probabilidad — sin registrar actividad hace 45 días;
  canceló el 30% de sus turnos`. Severidad **CRÍTICO** ≥60%, **ATENCIÓN** ≥40%.

### 2. Adherencia
- **Qué hace:** un score 0–100 de qué tan enganchado está cada paciente.
- **Cómo funciona:** 70% **constancia en el diario** (objetivo ~20 registros/mes)
  + 30% **asistencia a turnos** (completados vs. cancelados).
- **Resultado:** marca a los pacientes con plan activo y score < 40 para reforzar
  el seguimiento.

### 3. Tendencia de peso
- **Qué hace:** proyecta la evolución del peso y detecta **estancamientos**.
- **Cómo funciona:** **regresión lineal por mínimos cuadrados** (`numpy.polyfit`)
  sobre los últimos pesos (diario + antropometría). Da la **pendiente en kg/semana**,
  la **proyección a 30 días** y marca *estancado* si el cambio semanal es casi
  nulo sostenido (≥4 puntos, ≥3 semanas). Necesita ≥3 mediciones en ≥2 semanas.
- **Resultado:** `Peso estable (~-0.03 kg/sem, 78.2 kg) hace varias semanas.
  Considerar ajustar el plan.`

Si no hay datos / no está configurada la réplica / falla la base, devuelve **200**
con una tarjeta informativa (nunca un 500): la app muestra el mensaje en vez de
romperse.

## Cómo se conecta con la app

En el `.env` de la app (Next.js):

```
ML_SERVICE_URL=https://<tu-servicio-on-demand>   # sin esto, la app usa el stub
ML_SERVICE_TOKEN=<mismo token que acá>            # opcional (Bearer)
```

`src/infraestructura/contenedor/contenedor.ts` usa el adaptador
`AnalisisPredictivoHTTP` (con **fallback al stub** si el servicio falla). El
adaptador ya manda el `nutricionistaId` del inquilino de la request.

## De dónde salen los datos (features)

Lee una **réplica de SOLO LECTURA** (`DATABASE_URL_RO`) — nunca la primaria. Se
listan los pacientes activos del `nutricionistaId` y el resto se acota a ESOS
pacientes (aislamiento por inquilino). Tablas: `pacientes`, `registros_diarios`
(peso/agua/sueño/actividad), `antropometrias` (peso de consulta), `turnos`
(asistencia/cancelaciones), `asignaciones_plan` (plan activo/vencido).

`db.py` fuerza además `default_transaction_read_only = on`.

## Contrato (no cambiar sin actualizar los adaptadores TS)

| Endpoint | Request | Response |
|---|---|---|
| `GET /health` | — | `{ status, replica }` |
| `POST /insights` | `{ nutricionistaId }` | `[{ tipo, titulo, detalle, severidad }]` (`severidad`: `INFO`\|`ATENCION`\|`CRITICO`) |
| `POST /analizar-comida` | `{ archivoClave?, descripcion? }` | `{ descripcion, porcionEstimada, calorias, … , confianza, nota }` |

> **Visión de comida:** la app la resuelve con **Claude in-app** (tiene
> precedencia). `/analizar-comida` queda como alternativa/legado.

## Upgrade a modelos entrenados

Cuando se acumulen etiquetas (p. ej. quién abandonó de verdad a los 90 días), se
reemplaza la lógica de `modelos.py` por un modelo entrenado (`scikit-learn`/
`xgboost`), **manteniendo la firma de las funciones y las features**. La línea
base actual sirve de referencia para medir la mejora.

### Loop de feedback (ya activo)

Cada insight que se devuelve trae un `pacienteId`. En la app, el nutricionista
vota 👍/👎 cada tarjeta ("¿te resultó útil?"). Ese voto se guarda en la tabla
**`retroalimentacion_insight`** de la base de la app (tenant-scoped por
`nutricionistaId`), que este servicio **ya puede leer por la réplica RO**:

```sql
SELECT "pacienteId", "tipoInsight", "util", "detalle", "creadoEn"
FROM retroalimentacion_insight
WHERE "nutricionistaId" = %s;
```

Son las **etiquetas** para entrenar: se unen por `pacienteId` con las features
del momento (o con un snapshot histórico). `util = false` (👎) marca un falso
positivo del modelo; `util = true` (👍) confirma el acierto. Con suficientes
casos, se entrena un clasificador y se compara contra la línea base.

## Correr en local

```bash
cp .env.example .env   # completar DATABASE_URL_RO (una réplica o usuario RO)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
curl -s localhost:8000/insights -H 'content-type: application/json' -d '{"nutricionistaId":"<id>"}'
```

## Deploy (on-demand, fuera del VPS)

Es un servicio HTTP **stateless** → ideal para **serverless/on-demand** que
escala a cero cuando no se usa (el nutri consulta los insights de a ratos):

- **Cloud Run / Fly Machines / Modal / AWS Lambda (contenedor)**: buen encaje
  on-demand; se paga por uso.
- **Contenedor común** (`uvicorn`) en cualquier host, si preferís algo fijo.

Requisitos del entorno: `DATABASE_URL_RO` apuntando a una **réplica de solo
lectura** de la base del VPS (o un usuario RO con acceso de red a la primaria),
y `ML_SERVICE_TOKEN` (mismo valor que en la app). Exponé HTTPS y restringí el
acceso al origen de la app. Luego, en el `.env` de la app: `ML_SERVICE_URL` →
la URL del servicio. Nada de esto vive en el VPS de la app.

## Privacidad (datos de salud)

- Para agregados/benchmark: anonimizar (sin identificadores del paciente).
- Consentimiento explícito antes de usar datos identificables para entrenar.
- Nunca exponer datos de un inquilino a otro (el filtrado por `nutricionistaId`
  es obligatorio y ya está en `features.py`).
