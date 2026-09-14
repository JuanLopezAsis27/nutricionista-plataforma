-- Migración 63 — Fotos de progreso ("antes y después")
--
-- Las fotos del antes y después colgaban de una EVOLUCIÓN (migración 51), y
-- eso ataba dos cosas que no van juntas. Una evolución es lo que se anotó de la
-- consulta —cumplimiento, entrenamiento, descanso— y existe solo si se escribió
-- algo; una foto de progreso es del PACIENTE y de una fecha, y se saca aunque
-- esa consulta no se haya anotado. Con la foto adentro de la evolución, cargar
-- el antes y el después obligaba a crear (o editar) dos evoluciones, y la línea
-- de tiempo solo podía mostrar las fechas que tuvieran evolución escrita.
--
-- Ahora la foto de progreso es un archivo del paciente —el mismo dueño que ya
-- usan los documentos de la ficha— con la fecha que representa:
--
--   * `fechaProgreso` es la fecha de la FOTO, no la de la subida (`creadoEn`):
--     una foto de hace seis meses se carga hoy y tiene que ubicarse en su lugar
--     de la línea de tiempo. Es DATE, sin hora, como `evoluciones.fecha`.
--   * `fechaProgreso IS NOT NULL` es lo que distingue una foto de progreso de
--     cualquier otro archivo del paciente: un consentimiento no tiene fecha de
--     progreso y no aparece en la sección de antes y después.

ALTER TABLE "archivos" ADD COLUMN "fechaProgreso" DATE;

-- Por acá entra la consulta de la sección: las fotos de progreso de un
-- paciente, en orden. `nutricionistaId` adelante, como el resto de los índices
-- de tablas de inquilino.
CREATE INDEX "archivos_nutricionistaId_pacienteId_fechaProgreso_idx"
  ON "archivos" ("nutricionistaId", "pacienteId", "fechaProgreso");

-- Las fotos que ya estaban en una evolución pasan a ser fotos de progreso del
-- paciente, con la FECHA DE ESA EVOLUCIÓN: es la que tenían de hecho, y sin
-- copiarla la línea de tiempo las ordenaría por el día en que se subieron.
-- La clave en el bucket no se toca (sigue siendo `evoluciones/<id>.jpg`): la
-- clave es historia, no clasificación, y renombrar objetos del bucket dentro de
-- una migración es un paso que puede fallar a mitad.
UPDATE "archivos" a
SET "pacienteId"    = e."pacienteId",
    "fechaProgreso" = e."fecha",
    "evolucionId"   = NULL
FROM "evoluciones" e
WHERE a."evolucionId" = e."id";

ALTER TABLE "archivos" DROP CONSTRAINT "archivos_evolucionId_fkey";
DROP INDEX "archivos_nutricionistaId_evolucionId_idx";
ALTER TABLE "archivos" DROP COLUMN "evolucionId";
