-- Migración 83 — Un alimento no se carga dos veces en la misma lista.
--
-- "El mismo alimento" es mismo nombre y misma marca, sin distinguir
-- mayúsculas, tildes ni espacios de más (`AlimentoPropio.claveIdentidad`):
-- «Leche Descremada» y «leche  descremada» son uno; la misma leche de dos
-- marcas son dos. La clave se guarda en `claveIdentidad` y es ÚNICA:
--   - por consultorio en `alimentos_propios` (dos consultorios pueden tener
--     cada uno su «Avena»);
--   - global en `alimentos_base` (el catálogo es uno solo).
-- Un alimento propio igual a uno de la plataforma NO es un duplicado: es la
-- versión del profesional, y el buscador muestra la suya primero.
--
-- El caso de uso chequea antes de escribir (es el que puede decir cuál ya
-- estaba); el índice único es la garantía cuando dos altas llegan juntas.
--
-- Pasos:
--   1. La columna, calculada para las filas existentes. La normalización de
--      acá es el espejo en SQL de `normalizarTextoAlimento` (NFD sin marcas,
--      minúsculas, espacios colapsados) para los caracteres latinos que
--      aparecen en una planilla de alimentos. Las filas nuevas la calculan
--      en TypeScript.
--   2. Los duplicados que ya existían: queda el MÁS RECIENTE de cada grupo
--      (creadoEn, y el id para desempatar). Borrarlos no afecta a ningún plan
--      ni receta: copiaron los macros al elegir el alimento, no lo
--      referencian.
--   3. NOT NULL y los índices únicos.

CREATE FUNCTION pg_temp.normalizar_alimento(texto TEXT) RETURNS TEXT AS $$
  SELECT btrim(regexp_replace(
    translate(lower(coalesce(texto, '')),
      'áàäâãåéèëêíìïîóòöôõúùüûñçý',
      'aaaaaaeeeeiiiiooooouuuuncy'),
    '\s+', ' ', 'g'))
$$ LANGUAGE SQL IMMUTABLE;

-- 1. La clave
ALTER TABLE "alimentos_propios" ADD COLUMN "claveIdentidad" TEXT;
ALTER TABLE "alimentos_base" ADD COLUMN "claveIdentidad" TEXT;

UPDATE "alimentos_propios"
SET "claveIdentidad" = pg_temp.normalizar_alimento("nombre") || '|' || pg_temp.normalizar_alimento("marca");

UPDATE "alimentos_base"
SET "claveIdentidad" = pg_temp.normalizar_alimento("nombre") || '|' || pg_temp.normalizar_alimento("marca");

-- 2. Los duplicados existentes: queda el más reciente
DELETE FROM "alimentos_propios" a
USING (
  SELECT "id", row_number() OVER (
    PARTITION BY "nutricionistaId", "claveIdentidad"
    ORDER BY "creadoEn" DESC, "id" DESC
  ) AS n
  FROM "alimentos_propios"
) d
WHERE a."id" = d."id" AND d.n > 1;

DELETE FROM "alimentos_base" a
USING (
  SELECT "id", row_number() OVER (
    PARTITION BY "claveIdentidad"
    ORDER BY "creadoEn" DESC, "id" DESC
  ) AS n
  FROM "alimentos_base"
) d
WHERE a."id" = d."id" AND d.n > 1;

-- 3. Obligatoria y única
ALTER TABLE "alimentos_propios" ALTER COLUMN "claveIdentidad" SET NOT NULL;
ALTER TABLE "alimentos_base" ALTER COLUMN "claveIdentidad" SET NOT NULL;

CREATE UNIQUE INDEX "alimentos_propios_nutricionistaId_claveIdentidad_key"
  ON "alimentos_propios"("nutricionistaId", "claveIdentidad");
CREATE UNIQUE INDEX "alimentos_base_claveIdentidad_key"
  ON "alimentos_base"("claveIdentidad");
