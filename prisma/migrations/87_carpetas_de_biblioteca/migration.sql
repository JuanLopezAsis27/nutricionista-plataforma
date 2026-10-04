-- Migración 87 — Carpetas de la biblioteca
--
-- Las mismas carpetas que ya tienen los planes (migración 38) y el recetario
-- (migración 41), ahora en la biblioteca de materiales, y por el mismo motivo:
-- la lista deja de alcanzar cuando crece, y el criterio para ordenarla lo pone
-- quien trabaja ("Guías de inicio", "Deportistas", "Julia Pérez").
--
-- No reemplazan a la categoría ni a las etiquetas: esas describen el material;
-- la carpeta dice dónde lo guardó el profesional.
--
-- ON DELETE SET NULL: borrar la carpeta no borra los materiales, quedan
-- sueltos. Una carpeta es cómo están ordenados, no de quién son.

CREATE TABLE "grupos_material" (
  "id"              TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "nombre"          TEXT NOT NULL,
  "descripcion"     TEXT,
  "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grupos_material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupos_material_nutricionistaId_nombre_key"
  ON "grupos_material"("nutricionistaId", "nombre");

ALTER TABLE "grupos_material" ADD CONSTRAINT "grupos_material_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "materiales_biblioteca" ADD COLUMN "grupoId" TEXT;

ALTER TABLE "materiales_biblioteca" ADD CONSTRAINT "materiales_biblioteca_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "grupos_material"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "materiales_biblioteca_nutricionistaId_grupoId_idx"
  ON "materiales_biblioteca"("nutricionistaId", "grupoId");
