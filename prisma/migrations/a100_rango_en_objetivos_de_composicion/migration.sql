-- Migración 100 — Las metas de composición corporal pueden ser un RANGO.
--
-- Por qué la carpeta se llama `a100_…` y no `100_…`: Prisma ordena las
-- carpetas con `localeCompare` (no por número), y ahí el `_` va antes que los
-- dígitos y los dígitos antes que las letras. `100_` caería entre `10_` y
-- `11_` —una base nueva la correría antes de que exista la tabla— y en una
-- base ya migrada `migrate dev` vería la historia divergir. Con la `a`
-- adelante queda después de todas las de dos dígitos, y de acá en adelante
-- las migraciones son `a101_`, `a102_`… hasta la 999.
--
-- Hasta acá una meta era un solo número, y se daba por cumplida al pasarse
-- en la dirección buscada: bajar a 11 kg cuando la meta era 12 es cumplir.
-- En algunas variables eso es justo lo que NO se quiere —un % graso
-- demasiado bajo no es "mejor"—, así que la meta puede ser ahora un mínimo y
-- un máximo, y se cumple solo estando adentro.
--
-- Son dos formas excluyentes: `valorObjetivo` solo, o `valorMinimo` +
-- `valorMaximo` juntos y con el mínimo menor que el máximo. Lo sostiene el
-- CHECK, además de la entidad: una fila con las dos cosas no se sabría cómo
-- leer. Las metas ya cargadas quedan como estaban (un valor).

ALTER TABLE "objetivos_composicion"
  ALTER COLUMN "valorObjetivo" DROP NOT NULL,
  ADD COLUMN "valorMinimo" DECIMAL(7,2),
  ADD COLUMN "valorMaximo" DECIMAL(7,2);

ALTER TABLE "objetivos_composicion"
  ADD CONSTRAINT "objetivos_composicion_valor_o_rango"
  CHECK (
    (
      "valorObjetivo" IS NOT NULL
      AND "valorMinimo" IS NULL
      AND "valorMaximo" IS NULL
    )
    OR (
      "valorObjetivo" IS NULL
      AND "valorMinimo" IS NOT NULL
      AND "valorMaximo" IS NOT NULL
      AND "valorMinimo" < "valorMaximo"
    )
  );
