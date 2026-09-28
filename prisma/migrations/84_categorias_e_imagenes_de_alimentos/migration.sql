-- Migración 84 — Categoría e imagen de los alimentos.
--
-- La categoría es de una lista FIJA (enum) y no etiquetas libres: es lo que
-- se filtra en el buscador de todos los consultorios, y con texto libre
-- «Lácteos», «lacteos» y «Lácteo» serían tres filtros. Opcional: los
-- alimentos que ya existen quedan sin categoría hasta que alguien la cargue.
-- Los valores del enum solo se agregan, nunca se renombran.
--
-- La imagen es una clave del bucket en la fila del alimento, NO un `Archivo`:
-- `archivos` es tabla de inquilino y un alimento de la plataforma no es de
-- ningún consultorio. El barrido de huérfanos consulta también estas
-- columnas antes de borrar (ver docs/CATALOGO-BASE.md, «Imágenes»).

CREATE TYPE "CategoriaAlimento" AS ENUM (
  'CARNES', 'PESCADOS', 'HUEVOS', 'LACTEOS', 'CEREALES', 'LEGUMBRES',
  'VERDURAS', 'FRUTAS', 'FRUTOS_SECOS', 'ACEITES_GRASAS', 'AZUCARES_DULCES',
  'BEBIDAS', 'SUPLEMENTOS', 'OTROS'
);

ALTER TABLE "alimentos_propios"
  ADD COLUMN "categoria" "CategoriaAlimento",
  ADD COLUMN "imagenClave" TEXT;

ALTER TABLE "alimentos_base"
  ADD COLUMN "categoria" "CategoriaAlimento",
  ADD COLUMN "imagenClave" TEXT;

CREATE INDEX "alimentos_propios_nutricionistaId_categoria_idx"
  ON "alimentos_propios"("nutricionistaId", "categoria");
CREATE INDEX "alimentos_base_categoria_idx" ON "alimentos_base"("categoria");
