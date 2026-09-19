-- Migración 69 — Varios planes por paciente; el presente y el pasado, aparte
--
-- `AsignacionPlan` nació siendo dos cosas a la vez: "qué plan tiene hoy" y "qué
-- planes tuvo". Por eso llevaba un período (fechaInicio/fechaFin), un fin real
-- (finalizadaEn), un estado (activa) y una foto del nombre del plan. Y encima,
-- un índice único parcial —una activa por paciente— que convertía asignar en
-- REEMPLAZAR.
--
-- En el consultorio el plan no funciona así: el paciente sigue el plan de
-- descenso y, al mismo tiempo, el de suplementación y el de la semana de
-- competencia. No hay uno que rija sobre los otros y no empiezan ni terminan
-- en una fecha declarada.
--
-- La mezcla era el problema, no el historial. Así que se separan:
--
--   * `asignaciones_plan` queda como VÍNCULO PURO del presente —plan, paciente
--     y nada más—, igual que `asignaciones_receta`. Se asigna y se desasigna,
--     conviven varios, y desasignar BORRA la fila.
--   * `desasignaciones_plan` guarda el PASADO: una fila por cada vez que un
--     plan dejó de estar asignado, con el nombre congelado y las dos fechas.
--     Es append-only y ninguna pantalla lo lee.
--
-- Lo que sí desaparece del todo es la alerta PLAN_VENCIDO: era "asignación
-- activa cuya fechaFin ya pasó", y sin fecha de fin no hay nada que venza.

-- 1. El pasado, en su propia tabla ------------------------------------------
--
-- `planId` es NULLABLE con SET NULL a propósito: el plan se puede borrar
-- después y ahí `nombrePlan` es lo único que queda para decir qué tenía. Es la
-- misma razón por la que esa columna existía en `asignaciones_plan`.
-- `pacienteId` es CASCADE: el registro le pertenece al paciente y se va con él.

CREATE TABLE "desasignaciones_plan" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "planId" TEXT,
    "nombrePlan" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL,
    "desasignadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desasignaciones_plan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "desasignaciones_plan_nutricionistaId_pacienteId_idx"
  ON "desasignaciones_plan"("nutricionistaId", "pacienteId");

ALTER TABLE "desasignaciones_plan" ADD CONSTRAINT "desasignaciones_plan_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "desasignaciones_plan" ADD CONSTRAINT "desasignaciones_plan_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "desasignaciones_plan" ADD CONSTRAINT "desasignaciones_plan_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Mudar el historial que ya existe ----------------------------------------
--
-- Las asignaciones cerradas SON el historial: se mudan tal cual. El id viaja
-- con la fila —es un uuid y la de origen se borra—, así que una alerta vieja
-- que lo tenga de `referenciaId` sigue apuntando a algo.
--
-- `desasignadoEn` sale del fin REAL; si esa fila es anterior a la migración 38
-- y no lo tiene, cae al fin planificado y, en última instancia, a cuándo se
-- creó. Es la mejor fecha disponible, no una inventada.

INSERT INTO "desasignaciones_plan"
  ("id", "nutricionistaId", "pacienteId", "planId", "nombrePlan", "asignadoEn", "desasignadoEn")
SELECT
  a."id",
  a."nutricionistaId",
  a."pacienteId",
  a."planId",
  a."nombrePlan",
  a."fechaInicio"::timestamp,
  COALESCE(a."finalizadaEn"::timestamp, a."fechaFin"::timestamp, a."creadoEn")
FROM "asignaciones_plan" a
WHERE NOT a."activa";

DELETE FROM "asignaciones_plan" WHERE NOT "activa";

-- Las activas que apuntan a un plan borrado (FK SET NULL de la migración 38)
-- no pueden seguir siendo vínculos: `planId` pasa a ser obligatorio. Tampoco
-- son un plan que el paciente tenga —el plan no existe—, así que se cierran
-- acá y ahora, que es exactamente cuando dejan de estar asignadas.

INSERT INTO "desasignaciones_plan"
  ("id", "nutricionistaId", "pacienteId", "planId", "nombrePlan", "asignadoEn", "desasignadoEn")
SELECT
  a."id",
  a."nutricionistaId",
  a."pacienteId",
  NULL,
  a."nombrePlan",
  a."fechaInicio"::timestamp,
  NOW()
FROM "asignaciones_plan" a
WHERE a."planId" IS NULL;

DELETE FROM "asignaciones_plan" WHERE "planId" IS NULL;

-- 3. El vínculo puro ---------------------------------------------------------

-- Un mismo plan asignado dos veces al mismo paciente era imposible con el
-- índice de "una activa", pero la nueva clave única lo exige explícito: queda
-- la más reciente.
DELETE FROM "asignaciones_plan" a
USING "asignaciones_plan" b
WHERE a."planId" = b."planId"
  AND a."pacienteId" = b."pacienteId"
  AND (a."creadoEn", a."id") < (b."creadoEn", b."id");

DROP INDEX "asignaciones_plan_una_activa_uk";
DROP INDEX "asignaciones_plan_nutricionistaId_activa_fechaFin_idx";
DROP INDEX "asignaciones_plan_nutricionistaId_planId_idx";

ALTER TABLE "asignaciones_plan"
  DROP COLUMN "nombrePlan",
  DROP COLUMN "fechaInicio",
  DROP COLUMN "fechaFin",
  DROP COLUMN "finalizadaEn",
  DROP COLUMN "activa";

-- El plan vuelve a ser obligatorio y a llevarse sus vínculos al borrarse, como
-- la receta con `asignaciones_receta`. El historial NO se va con él: para eso
-- `desasignaciones_plan` tiene su propia FK, con SET NULL.
ALTER TABLE "asignaciones_plan" ALTER COLUMN "planId" SET NOT NULL;
ALTER TABLE "asignaciones_plan" DROP CONSTRAINT "asignaciones_plan_planId_fkey";
ALTER TABLE "asignaciones_plan" ADD CONSTRAINT "asignaciones_plan_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "asignaciones_plan_planId_pacienteId_key"
  ON "asignaciones_plan"("planId", "pacienteId");

-- 4. Se va la alerta de plan vencido -----------------------------------------
--
-- Sin `fechaFin` no hay nada que venza, así que el tipo se va entero: las
-- pendientes piden renovar algo que ya no caduca.

DELETE FROM "alertas_seguimiento" WHERE "tipo" = 'PLAN_VENCIDO';

ALTER TYPE "TipoAlertaSeguimiento" RENAME TO "TipoAlertaSeguimiento_old";
CREATE TYPE "TipoAlertaSeguimiento" AS ENUM ('SIN_REGISTRO_PESO', 'SIN_ACTIVIDAD', 'TURNO_SIN_CONFIRMAR');
ALTER TABLE "alertas_seguimiento"
  ALTER COLUMN "tipo" TYPE "TipoAlertaSeguimiento"
  USING ("tipo"::text::"TipoAlertaSeguimiento");
DROP TYPE "TipoAlertaSeguimiento_old";
