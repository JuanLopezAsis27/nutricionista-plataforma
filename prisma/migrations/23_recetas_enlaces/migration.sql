-- Adjuntos en recetas: enlaces de referencia (URLs). Los documentos adjuntos
-- (PDF/Word) reutilizan la tabla archivos vía recetaId, sin columna nueva.
ALTER TABLE "recetas" ADD COLUMN "enlaces" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
