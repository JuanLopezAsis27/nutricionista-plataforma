-- Migración 35 — Foto principal de la receta
--
-- Hasta acá "la foto de la receta" era `fotos[0]`: la primera que devolviera
-- Postgres. Sin ORDER BY eso no está garantizado y puede cambiar de una
-- consulta a otra, así que la portada del recetario iba rotando sola.
--
-- La columna la vuelve una decisión del profesional. Es una FK real con
-- ON DELETE SET NULL: borrar la foto deja la receta sin portada —vuelve a
-- caer en la primera disponible— en vez de apuntar a un archivo inexistente.
--
-- Nullable a propósito: una receta sin fotos no tiene principal, y una que
-- nunca eligió tampoco. La lectura resuelve el fallback.

ALTER TABLE "recetas" ADD COLUMN "fotoPrincipalId" TEXT;

ALTER TABLE "recetas" ADD CONSTRAINT "recetas_fotoPrincipalId_fkey"
  FOREIGN KEY ("fotoPrincipalId") REFERENCES "archivos"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
