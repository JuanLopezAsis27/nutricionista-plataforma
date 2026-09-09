-- Migración 38 — Nombre único, carpetas y un historial que sobrevive al plan
--
-- Tres cambios sobre el módulo de planes, los tres sobre el mismo problema de
-- fondo: la lista de planes creció y dejó de alcanzar con "una bolsa de planes
-- con nombre libre".

-- ---------------------------------------------------------------------------
-- 1. El nombre del plan es único por consultorio
--
-- El nombre es lo ÚNICO que se ve al elegir un plan para asignar. Dos planes
-- llamados igual son indistinguibles en esa lista, y asignar el equivocado no
-- se descubre hasta que el paciente pregunta por qué su plan cambió.
--
-- Planes y plantillas son espacios separados: la plantilla "Descenso" y el plan
-- "Descenso" que sale de ella es el flujo esperado, no un error.
--
-- Incluye a los archivados a propósito. Un archivado sigue apareciendo en el
-- historial y en el listado con el filtro puesto, así que dos con el mismo
-- nombre siguen siendo ambiguos; para reusar un nombre hay que renombrar el
-- viejo, que es una decisión explícita y no un accidente.

-- Antes del índice hay que resolver los duplicados que ya existan: se numera el
-- más nuevo (" (2)", " (3)"…) y se deja intacto el más viejo, que es el que
-- probablemente esté asignado.
WITH numerados AS (
  SELECT "id",
         "nombre",
         ROW_NUMBER() OVER (
           PARTITION BY "nutricionistaId", "esPlantilla", "nombre"
           ORDER BY "creadoEn", "id"
         ) AS n
  FROM "planes_nutricionales"
)
UPDATE "planes_nutricionales" p
SET "nombre" = numerados."nombre" || ' (' || numerados.n || ')'
FROM numerados
WHERE p."id" = numerados."id" AND numerados.n > 1;

CREATE UNIQUE INDEX "planes_nutricionales_nutricionistaId_esPlantilla_nombre_key"
  ON "planes_nutricionales"("nutricionistaId", "esPlantilla", "nombre");

-- ---------------------------------------------------------------------------
-- 2. Carpetas de planes
--
-- Agrupan por PROPÓSITO, que es como el profesional los busca: por paciente
-- ("Julia Pérez"), por objetivo ("Descenso"), por población ("Deportistas").
-- El criterio lo pone quien trabaja, por eso es una carpeta libre y no una
-- categoría cerrada.
--
-- ON DELETE SET NULL: borrar la carpeta no borra los planes. Una carpeta es
-- cómo están ordenados, no de quién son; llevarse el contenido al tirar el
-- rótulo sería una pérdida de datos disfrazada de organización.
CREATE TABLE "grupos_plan" (
  "id"              TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "nombre"          TEXT NOT NULL,
  "descripcion"     TEXT,
  "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grupos_plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupos_plan_nutricionistaId_nombre_key"
  ON "grupos_plan"("nutricionistaId", "nombre");

ALTER TABLE "grupos_plan" ADD CONSTRAINT "grupos_plan_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planes_nutricionales" ADD COLUMN "grupoId" TEXT;

ALTER TABLE "planes_nutricionales" ADD CONSTRAINT "planes_nutricionales_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "grupos_plan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "planes_nutricionales_nutricionistaId_grupoId_idx"
  ON "planes_nutricionales"("nutricionistaId", "grupoId");

-- ---------------------------------------------------------------------------
-- 3. El historial de planes del paciente sobrevive al borrado del plan
--
-- `asignaciones_plan` ya era el historial —asignar desactiva la anterior en vez
-- de pisarla—, pero con dos agujeros que lo vaciaban justo cuando servía:
--
--   a) la FK a `planes_nutricionales` era ON DELETE CASCADE, así que borrar un
--      plan borraba TODA la historia de quienes lo habían seguido. Qué plan
--      siguió un paciente y entre qué fechas es información clínica: no es un
--      detalle del plan, le pertenece al paciente.
--
--   b) no se guardaba CUÁNDO terminó de verdad. `fechaFin` es el fin
--      PLANIFICADO al asignar y suele estar vacío; cuando el plan se reemplaza
--      antes de esa fecha —el caso normal— el historial no tenía cómo decir
--      hasta cuándo rigió.
--
-- `nombrePlan` es una FOTO, no un cache: si el plan se borró es lo único que
-- queda para decir qué se le asignó, y si se renombró, el historial tiene que
-- seguir diciendo cómo se llamaba entonces.
ALTER TABLE "asignaciones_plan" ADD COLUMN "nombrePlan" TEXT;
ALTER TABLE "asignaciones_plan" ADD COLUMN "finalizadaEn" DATE;

UPDATE "asignaciones_plan" a
SET "nombrePlan" = p."nombre"
FROM "planes_nutricionales" p
WHERE p."id" = a."planId";

-- Las que quedaron sin plan (no debería haber ninguna: la FK era obligatoria)
-- reciben un rótulo antes de volver la columna obligatoria.
UPDATE "asignaciones_plan" SET "nombrePlan" = 'Plan sin nombre' WHERE "nombrePlan" IS NULL;

ALTER TABLE "asignaciones_plan" ALTER COLUMN "nombrePlan" SET NOT NULL;

-- Las ya desactivadas no tienen fecha real de fin (nadie la guardaba). Se les
-- pone la planificada cuando existía; el resto queda en NULL, que es honesto:
-- "terminó, no sabemos cuándo" es mejor que una fecha inventada.
UPDATE "asignaciones_plan"
SET "finalizadaEn" = "fechaFin"
WHERE "activa" = false AND "fechaFin" IS NOT NULL;

ALTER TABLE "asignaciones_plan" DROP CONSTRAINT "asignaciones_plan_planId_fkey";
ALTER TABLE "asignaciones_plan" ALTER COLUMN "planId" DROP NOT NULL;

ALTER TABLE "asignaciones_plan" ADD CONSTRAINT "asignaciones_plan_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
