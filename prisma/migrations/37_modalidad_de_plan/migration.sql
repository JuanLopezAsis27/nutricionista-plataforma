-- Migración 37 — Un plan en PDF no es un plan con un PDF
--
-- La migración 36 metió el PDF como un adjunto opcional del plan: 1 a 1, y si
-- estaba, la vista lo mostraba primero. Eso mezcló dos cosas que en la práctica
-- del consultorio son distintas:
--
--   1. El plan ARMADO AFUERA (Word, Canva) que se sube entero. Acá el PDF no
--      acompaña al plan: ES el plan, y es lo que el paciente tiene que ver al
--      entrar a "Mi plan". No hay comidas que cargar.
--
--   2. El plan ARMADO EN LA APP, franja por franja, que además puede llevar
--      material en PDF —la lista de compras, el instructivo de la colación, un
--      recetario—. Ahí el PDF es un ANEXO: el plan sigue siendo el estructurado
--      y el anexo no puede taparlo.
--
-- Con el modelo de la 36 las dos caían en el mismo campo, así que un anexo de
-- un plan cargado se mostraba como si fuera el plan, y solo se podía adjuntar
-- UNO. Las dos consecuencias son del mismo error de modelado: "tiene un PDF" no
-- alcanza para saber qué es ese PDF.
--
-- Ahora son dos preguntas separadas:
--   - `modalidad` dice de qué clase es el plan (APP | PDF);
--   - `archivoPrincipalId` dice CUÁL de sus archivos es el plan, y solo tiene
--     sentido en modalidad PDF.
--
-- Y `archivos.planId` deja de ser único: un plan puede tener varios anexos.

CREATE TYPE "ModalidadPlan" AS ENUM ('APP', 'PDF');

ALTER TABLE "planes_nutricionales"
  ADD COLUMN "modalidad" "ModalidadPlan" NOT NULL DEFAULT 'APP',
  ADD COLUMN "archivoPrincipalId" TEXT;

ALTER TABLE "planes_nutricionales" ADD CONSTRAINT "planes_nutricionales_archivoPrincipalId_fkey"
  FOREIGN KEY ("archivoPrincipalId") REFERENCES "archivos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Un plan puede tener varios archivos: el índice único de la 36 lo impedía.
-- Queda un índice común, que es lo que las lecturas necesitan.
DROP INDEX "archivos_planId_key";

CREATE INDEX "archivos_nutricionistaId_planId_idx" ON "archivos"("nutricionistaId", "planId");

-- Migración de datos: un plan de la 36 que tenía PDF y NO tenía comidas era, de
-- hecho, un plan en PDF —no había otra forma de cargarlo—, así que se lo
-- declara como tal y su archivo pasa a ser el principal. Sin esto quedaría en
-- modalidad APP sin comidas: un plan vacío para la app y un archivo que nadie
-- sabe que es el plan.
--
-- El que tenía PDF **y** comidas se queda en APP y su archivo pasa a ser un
-- anexo, que es lo que siempre debió ser. No se lo pasa a PDF porque perdería
-- de vista las comidas cargadas, y esa es información que alguien escribió.
UPDATE "planes_nutricionales" p
SET "modalidad" = 'PDF',
    "archivoPrincipalId" = a."id"
FROM "archivos" a
WHERE a."planId" = p."id"
  AND NOT EXISTS (SELECT 1 FROM "comidas_plan" c WHERE c."planId" = p."id");
