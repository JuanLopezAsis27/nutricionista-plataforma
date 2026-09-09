-- Migración 51 — Fotos de evolución
--
-- Una evolución puede tener fotos (1 a MUCHAS, como las de una receta): la FK
-- vive en `archivos`, el mismo arco exclusivo que sostiene al resto de los
-- dueños de archivo. `onDelete: Cascade` porque una foto de evolución no
-- tiene sentido si se borra la evolución que la contiene.

ALTER TABLE "archivos" ADD COLUMN "evolucionId" TEXT;

CREATE INDEX "archivos_nutricionistaId_evolucionId_idx"
  ON "archivos" ("nutricionistaId", "evolucionId");

ALTER TABLE "archivos"
  ADD CONSTRAINT "archivos_evolucionId_fkey"
  FOREIGN KEY ("evolucionId") REFERENCES "evoluciones" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
