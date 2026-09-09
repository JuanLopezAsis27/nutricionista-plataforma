-- Migración 42 — Grabar la consulta, transcribirla y resumirla
--
-- El profesional graba el audio de la consulta desde la ficha del turno. Al
-- terminar, un trabajo en segundo plano transcribe cada grabación y otro arma
-- UN resumen de la consulta con IA.
--
-- Tres decisiones que se leen en el esquema:
--
--   1. MUCHAS grabaciones por turno. Una consulta se interrumpe —entra alguien,
--      suena el teléfono, se corta para pesar— y obligar a una sola grabación
--      significaba perder lo grabado o dejar el micrófono abierto en el medio.
--      `orden` las devuelve en la secuencia en que ocurrieron, que es la que le
--      da sentido a la transcripción concatenada.
--
--   2. UN resumen por turno, no uno por grabación. Lo que se resume es la
--      CONSULTA; las grabaciones son los pedazos en que quedó partida. Un
--      resumen por pedazo obliga a leer tres textos y reconstruir la consulta.
--
--   3. El audio ES un `archivo`, como el resto de los adjuntos: clave en el
--      bucket, MIME, tamaño y borrado compensado ya resueltos por ese módulo.

-- ---------------------------------------------------------------------------
-- 1. Proveedor de voz a texto
--
-- Anthropic no transcribe audio, así que la transcripción se configura aparte
-- de la IA: OpenAI (Whisper / gpt-4o-transcribe) o el mismo OpenRouter.
ALTER TYPE "ProveedorIntegracion" ADD VALUE 'OPENAI';

ALTER TABLE "preferencias_integracion"
  ADD COLUMN "proveedorTranscripcion" TEXT,
  ADD COLUMN "modeloTranscripcion"    TEXT;

-- ---------------------------------------------------------------------------
-- 2. Grabaciones
--
-- El estado describe SOLO la transcripción. El resumen es del turno entero y
-- vive en su propia tabla: mezclarlos dejaría una grabación "a medias" porque
-- el resumen de otra falló.
CREATE TYPE "EstadoGrabacion" AS ENUM ('PENDIENTE', 'TRANSCRIBIENDO', 'LISTA', 'FALLIDA');

CREATE TABLE "grabaciones_consulta" (
  "id"               TEXT NOT NULL,
  "nutricionistaId"  TEXT NOT NULL,
  "turnoId"          TEXT NOT NULL,
  "orden"            INTEGER NOT NULL,
  "duracionSegundos" INTEGER,
  "estado"           "EstadoGrabacion" NOT NULL DEFAULT 'PENDIENTE',
  "transcripcion"    TEXT,
  "error"            TEXT,
  "intentos"         INTEGER NOT NULL DEFAULT 0,
  "transcritoEn"     TIMESTAMP(3),
  "creadoEn"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grabaciones_consulta_pkey" PRIMARY KEY ("id")
);

-- Dos grabaciones del mismo turno no pueden compartir posición: el orden es lo
-- único que dice en qué secuencia leer las transcripciones.
CREATE UNIQUE INDEX "grabaciones_consulta_turnoId_orden_key"
  ON "grabaciones_consulta"("turnoId", "orden");
CREATE INDEX "grabaciones_consulta_nutricionistaId_turnoId_idx"
  ON "grabaciones_consulta"("nutricionistaId", "turnoId");
-- El barrido del worker busca las que quedaron a medio procesar.
CREATE INDEX "grabaciones_consulta_estado_idx" ON "grabaciones_consulta"("estado");

ALTER TABLE "grabaciones_consulta" ADD CONSTRAINT "grabaciones_consulta_turnoId_fkey"
  FOREIGN KEY ("turnoId") REFERENCES "turnos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "grabaciones_consulta" ADD CONSTRAINT "grabaciones_consulta_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Resumen de la consulta
--
-- `grabacionesIncluidas` es cuántas transcripciones había al generarlo: si
-- después aparece otra, la pantalla sabe que el resumen quedó viejo sin tener
-- que compararlo con nada.
CREATE TABLE "resumenes_consulta" (
  "id"                   TEXT NOT NULL,
  "nutricionistaId"      TEXT NOT NULL,
  "turnoId"              TEXT NOT NULL,
  "texto"                TEXT NOT NULL,
  "modelo"               TEXT,
  "grabacionesIncluidas" INTEGER NOT NULL,
  "generadoEn"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resumenes_consulta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resumenes_consulta_turnoId_key" ON "resumenes_consulta"("turnoId");
CREATE INDEX "resumenes_consulta_nutricionistaId_turnoId_idx"
  ON "resumenes_consulta"("nutricionistaId", "turnoId");

ALTER TABLE "resumenes_consulta" ADD CONSTRAINT "resumenes_consulta_turnoId_fkey"
  FOREIGN KEY ("turnoId") REFERENCES "turnos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resumenes_consulta" ADD CONSTRAINT "resumenes_consulta_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. El audio, como un dueño más del arco exclusivo de `archivos`
--
-- Sigue siendo `<= 1` y no `= 1` (ver migración 34): el audio se sube ANTES de
-- que exista la fila de la grabación y se vincula después, así que estar sin
-- dueño es un estado transitorio legítimo.
ALTER TABLE "archivos" ADD COLUMN "grabacionId" TEXT;

CREATE UNIQUE INDEX "archivos_grabacionId_key" ON "archivos"("grabacionId");

ALTER TABLE "archivos" ADD CONSTRAINT "archivos_grabacionId_fkey"
  FOREIGN KEY ("grabacionId") REFERENCES "grabaciones_consulta"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "archivos" DROP CONSTRAINT "archivos_un_solo_dueno";

ALTER TABLE "archivos" ADD CONSTRAINT "archivos_un_solo_dueno" CHECK (
  (("pacienteId"        IS NOT NULL)::int
 + ("laboratorioId"     IS NOT NULL)::int
 + ("comidaConsumidaId" IS NOT NULL)::int
 + ("recetaId"          IS NOT NULL)::int
 + ("materialId"        IS NOT NULL)::int
 + ("planId"            IS NOT NULL)::int
 + ("grabacionId"       IS NOT NULL)::int) <= 1
);
