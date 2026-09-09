-- Migración 41 — Carpetas del recetario
--
-- Las mismas carpetas que ya tenían los planes (migración 38), ahora en el
-- recetario, y por el mismo motivo: la lista deja de alcanzar cuando pasa de
-- veinte recetas y el criterio para ordenarlas lo pone quien trabaja
-- ("Desayunos", "Sin TACC", "Julia Pérez"), no el sistema.
--
-- NO reemplazan a las etiquetas ni compiten con ellas: una receta tiene MUCHAS
-- etiquetas (es a la vez "vegetariana" y "rápida") y está en UNA carpeta. La
-- etiqueta describe la receta; la carpeta dice dónde la guardó el profesional.
--
-- ON DELETE SET NULL: borrar la carpeta no borra las recetas. Una carpeta es
-- cómo están ordenadas, no de quién son; llevarse el contenido al tirar el
-- rótulo sería una pérdida de datos disfrazada de organización.

CREATE TABLE "grupos_receta" (
  "id"              TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "nombre"          TEXT NOT NULL,
  "descripcion"     TEXT,
  "creadoEn"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "grupos_receta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "grupos_receta_nutricionistaId_nombre_key"
  ON "grupos_receta"("nutricionistaId", "nombre");

ALTER TABLE "grupos_receta" ADD CONSTRAINT "grupos_receta_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recetas" ADD COLUMN "grupoId" TEXT;

ALTER TABLE "recetas" ADD CONSTRAINT "recetas_grupoId_fkey"
  FOREIGN KEY ("grupoId") REFERENCES "grupos_receta"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "recetas_nutricionistaId_grupoId_idx"
  ON "recetas"("nutricionistaId", "grupoId");
