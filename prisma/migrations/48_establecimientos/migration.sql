-- Establecimientos (migración 48).
--
-- Un nutricionista atiende en más de un lugar. Lo que cambia de lugar es el
-- TURNO, no el paciente: la misma persona se atiende un mes en el consultorio
-- del centro y al siguiente en el del barrio, y un turno de marzo en el centro
-- tiene que seguir siendo del centro aunque hoy el paciente vaya a otro lado.
-- Por eso `establecimientoId` va en `turnos` y NO en `pacientes`.
--
-- `pacientes.establecimientoHabitualId` existe igual, pero es una PREFERENCIA:
-- precarga el formulario y ordena el listado. Nunca restringe dónde se le
-- puede dar un turno a alguien. La diferencia entre "suele venir acá" y
-- "pertenece acá" es justamente lo que esta feature no puede perder.
--
-- Lo que esta migración NO hace, a propósito:
--
--   * NO toca `turnos_sin_solapamiento` (migración 27). El EXCLUDE sigue
--     agrupando por `nutricionistaId` solo. Agregarle `establecimientoId`
--     habilitaría dos turnos a las 10:00 del mismo día en dos consultorios
--     distintos: el profesional es uno y no puede estar en dos lados. El eje
--     del solapamiento es QUIÉN atiende, nunca DÓNDE.
--
--   * NO borra las columnas de agenda de `configuracion_consultorio`. Las
--     COPIA al establecimiento principal y las deja donde están: el código
--     todavía las lee. La mudanza de `agendaConsultorio.ts` y el DROP van
--     juntos en la migración siguiente, así ningún deploy queda con la regla
--     apuntando a columnas que ya no existen.

-- ---------------------------------------------------------------------------
-- La tabla
--
-- Los campos de agenda (días, horario, duración, paso) viven acá y no en
-- `configuracion_consultorio` porque describen al LUGAR: el caso típico es
-- "lunes y miércoles en el centro, martes y jueves en el barrio". El membrete,
-- el PDF y el prefijo telefónico se quedan en la configuración: describen al
-- profesional, que es uno solo.

CREATE TABLE "establecimientos" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "direccion" TEXT,
  "telefono" TEXT,
  -- Color del globo en el calendario semanal: distinguir la sede de un vistazo
  -- es la mitad de para qué sirve la feature.
  "color" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "diasAtencion" INTEGER[],
  "atencionHoraDesde" TEXT,
  "atencionHoraHasta" TEXT,
  "turnoDuracionMinutos" INTEGER NOT NULL DEFAULT 30,
  "turnoPasoMinutos" INTEGER NOT NULL DEFAULT 15,
  -- Baja lógica, como en `pacientes`. Un establecimiento que cerró sigue
  -- siendo el lugar donde ocurrieron los turnos de los últimos tres años; la
  -- FK de `turnos` es RESTRICT y borrarlo rompería el histórico.
  "archivadoEn" TIMESTAMP(3),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "establecimientos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "establecimientos_nutricionistaId_idx"
  ON "establecimientos" ("nutricionistaId");

-- Mismo par que en `pacientes`: deja verificar "este establecimiento es de
-- este inquilino" contra un índice.
CREATE UNIQUE INDEX "establecimientos_nutricionistaId_id_key"
  ON "establecimientos" ("nutricionistaId", "id");

-- El nombre es único entre los VIGENTES. Con la baja lógica, un índice total
-- dejaría "Consultorio centro" bloqueado para siempre por una sede archivada.
CREATE UNIQUE INDEX "establecimientos_nutricionistaId_nombre_key"
  ON "establecimientos" ("nutricionistaId", "nombre")
  WHERE "archivadoEn" IS NULL;

-- Un solo principal por consultorio: es el que resuelve el fallback cuando
-- nadie eligió sede todavía, y dos candidatos harían que el fallback dependa
-- del orden de la consulta.
CREATE UNIQUE INDEX "establecimientos_uno_principal_uk"
  ON "establecimientos" ("nutricionistaId")
  WHERE "esPrincipal";

-- Mismo CHECK que `turnos.hora` (migración 27): el espejo de pantalla y el
-- dominio parsean estos dos campos con substring y asumen HH:mm.
ALTER TABLE "establecimientos" ADD CONSTRAINT "establecimientos_hora_formato"
  CHECK (
    ("atencionHoraDesde" IS NULL OR "atencionHoraDesde" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
    AND
    ("atencionHoraHasta" IS NULL OR "atencionHoraHasta" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  );

ALTER TABLE "establecimientos" ADD CONSTRAINT "establecimientos_minutos_positivos"
  CHECK ("turnoDuracionMinutos" > 0 AND "turnoPasoMinutos" > 0);

ALTER TABLE "establecimientos"
  ADD CONSTRAINT "establecimientos_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Un establecimiento principal por consultorio existente
--
-- Con la agenda que hoy rige, copiada de `configuracion_consultorio`. Los
-- defaults del COALESCE son los de la propia tabla de configuración (30 y 15):
-- un nutricionista sin fila de configuración tiene que quedar con la misma
-- agenda que tenía de hecho, no con una vacía.

INSERT INTO "establecimientos" (
  "id", "nutricionistaId", "nombre", "esPrincipal", "orden",
  "diasAtencion", "atencionHoraDesde", "atencionHoraHasta",
  "turnoDuracionMinutos", "turnoPasoMinutos",
  "creadoEn", "actualizadoEn"
)
SELECT
  gen_random_uuid()::text,
  n."id",
  'Consultorio principal',
  true,
  0,
  c."diasAtencion",
  c."atencionHoraDesde",
  c."atencionHoraHasta",
  COALESCE(c."turnoDuracionMinutos", 30),
  COALESCE(c."turnoPasoMinutos", 15),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "nutricionistas" n
LEFT JOIN "configuracion_consultorio" c ON c."nutricionistaId" = n."id";

-- ---------------------------------------------------------------------------
-- El turno pasa a llevar su lugar
--
-- Se agrega nullable, se rellena y recién ahí NOT NULL. Nullable permanente
-- sería una trampa: cada filtro de agenda y cada corte de facturación tendría
-- que decidir qué hacer con el turno sin sede, y cada uno decidiría distinto.

ALTER TABLE "turnos" ADD COLUMN "establecimientoId" TEXT;

UPDATE "turnos" t
SET "establecimientoId" = e."id"
FROM "establecimientos" e
WHERE e."nutricionistaId" = t."nutricionistaId" AND e."esPrincipal";

ALTER TABLE "turnos" ALTER COLUMN "establecimientoId" SET NOT NULL;

ALTER TABLE "turnos"
  ADD CONSTRAINT "turnos_establecimientoId_fkey"
  FOREIGN KEY ("establecimientoId") REFERENCES "establecimientos" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- La agenda filtrada por sede es la consulta más caliente de la pantalla.
CREATE INDEX "turnos_nutricionistaId_establecimientoId_fecha_idx"
  ON "turnos" ("nutricionistaId", "establecimientoId", "fecha");

-- ---------------------------------------------------------------------------
-- La sede habitual del paciente
--
-- SET NULL y no RESTRICT: archivar una sede no puede dejar fichas de pacientes
-- apuntando a un establecimiento que ya no se ofrece. Es una preferencia; que
-- se pierda no rompe nada.

ALTER TABLE "pacientes" ADD COLUMN "establecimientoHabitualId" TEXT;

ALTER TABLE "pacientes"
  ADD CONSTRAINT "pacientes_establecimientoHabitualId_fkey"
  FOREIGN KEY ("establecimientoHabitualId") REFERENCES "establecimientos" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
