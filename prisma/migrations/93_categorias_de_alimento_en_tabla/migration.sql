-- Migración 93 — Las categorías de alimento pasan de un enum a tablas.
--
-- Hasta acá eran el enum `CategoriaAlimento` (migraciones 84 y 86): una lista
-- fija en el código. Ahora:
--
--   * las PREDETERMINADAS viven en `categorias_alimento_base`, sin inquilino,
--     y las administra el SUPERADMIN (crear, renombrar, ordenar, borrar);
--   * cada consultorio suma las SUYAS en `categorias_alimento_propias`, que
--     solo usan sus alimentos.
--
-- Un alimento propio lleva una predeterminada (`categoriaId`) o una propia
-- (`categoriaPropiaId`), nunca las dos. Uno de la plataforma, solo una
-- predeterminada. Borrar una categoría deja a sus alimentos sin categoría
-- (SET NULL), como borrar una carpeta deja sueltos sus planes.
--
-- Los valores del enum se convierten en filas con el MISMO orden en que se
-- ofrecían en pantalla, y se suman «Geles deportivos» y «Bebidas isotónicas»
-- para la planificación de carreras (migración 94). Cada alimento conserva la
-- categoría que tenía: `codigoLegado` hace de puente y se borra al final.

-- 1. Categorías predeterminadas ---------------------------------------------

CREATE TABLE "categorias_alimento_base" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveNombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "codigoLegado" TEXT,

    CONSTRAINT "categorias_alimento_base_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_alimento_base_claveNombre_key"
  ON "categorias_alimento_base"("claveNombre");

INSERT INTO "categorias_alimento_base"
  ("id", "nombre", "claveNombre", "orden", "actualizadoEn", "codigoLegado")
SELECT gen_random_uuid()::text, s.nombre, s.clave, s.orden, CURRENT_TIMESTAMP, s.codigo
FROM (VALUES
  ('CARNES',             'Carnes',                  'carnes',                   1),
  ('EMBUTIDOS',          'Embutidos',               'embutidos',                2),
  ('PESCADOS',           'Pescados y mariscos',     'pescados y mariscos',      3),
  ('HUEVOS',             'Huevos',                  'huevos',                   4),
  ('LACTEOS',            'Lácteos',                 'lacteos',                  5),
  ('CEREALES',           'Cereales y derivados',    'cereales y derivados',     6),
  ('LEGUMBRES',          'Legumbres',               'legumbres',                7),
  ('VERDURAS',           'Verduras',                'verduras',                 8),
  ('FRUTAS',             'Frutas',                  'frutas',                   9),
  ('FRUTOS_SECOS',       'Frutos secos y semillas', 'frutos secos y semillas', 10),
  ('ACEITES_GRASAS',     'Aceites y grasas',        'aceites y grasas',        11),
  ('AZUCARES_DULCES',    'Azúcares y dulces',       'azucares y dulces',       12),
  ('BEBIDAS',            'Bebidas',                 'bebidas',                 13),
  ('BEBIDAS_ISOTONICAS', 'Bebidas isotónicas',      'bebidas isotonicas',      14),
  ('GELES_DEPORTIVOS',   'Geles deportivos',        'geles deportivos',        15),
  ('SUPLEMENTOS',        'Suplementos',             'suplementos',             16),
  ('OTROS',              'Otros',                   'otros',                   17)
) AS s(codigo, nombre, clave, orden);

-- 2. Categorías propias de cada consultorio ----------------------------------

CREATE TABLE "categorias_alimento_propias" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveNombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_alimento_propias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_alimento_propias_nutricionistaId_claveNombre_key"
  ON "categorias_alimento_propias"("nutricionistaId", "claveNombre");

ALTER TABLE "categorias_alimento_propias"
  ADD CONSTRAINT "categorias_alimento_propias_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Los alimentos pasan del enum a las tablas ------------------------------

ALTER TABLE "alimentos_propios"
  ADD COLUMN "categoriaId" TEXT,
  ADD COLUMN "categoriaPropiaId" TEXT;

ALTER TABLE "alimentos_base" ADD COLUMN "categoriaId" TEXT;

UPDATE "alimentos_propios" a
SET "categoriaId" = c."id"
FROM "categorias_alimento_base" c
WHERE c."codigoLegado" = a."categoria"::text;

UPDATE "alimentos_base" a
SET "categoriaId" = c."id"
FROM "categorias_alimento_base" c
WHERE c."codigoLegado" = a."categoria"::text;

DROP INDEX "alimentos_propios_nutricionistaId_categoria_idx";
DROP INDEX "alimentos_base_categoria_idx";

ALTER TABLE "alimentos_propios" DROP COLUMN "categoria";
ALTER TABLE "alimentos_base" DROP COLUMN "categoria";

DROP TYPE "CategoriaAlimento";

ALTER TABLE "categorias_alimento_base" DROP COLUMN "codigoLegado";

CREATE INDEX "alimentos_propios_nutricionistaId_categoriaId_idx"
  ON "alimentos_propios"("nutricionistaId", "categoriaId");
CREATE INDEX "alimentos_propios_nutricionistaId_categoriaPropiaId_idx"
  ON "alimentos_propios"("nutricionistaId", "categoriaPropiaId");
CREATE INDEX "alimentos_base_categoriaId_idx" ON "alimentos_base"("categoriaId");

ALTER TABLE "alimentos_propios"
  ADD CONSTRAINT "alimentos_propios_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "categorias_alimento_base"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alimentos_propios"
  ADD CONSTRAINT "alimentos_propios_categoriaPropiaId_fkey"
  FOREIGN KEY ("categoriaPropiaId") REFERENCES "categorias_alimento_propias"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alimentos_base"
  ADD CONSTRAINT "alimentos_base_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "categorias_alimento_base"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Una predeterminada O una propia: con las dos, el filtro del buscador lo
-- mostraría en dos lugares y la pantalla no tendría cuál elegir.
ALTER TABLE "alimentos_propios"
  ADD CONSTRAINT "alimentos_propios_una_sola_categoria"
  CHECK (num_nonnulls("categoriaId", "categoriaPropiaId") <= 1);
