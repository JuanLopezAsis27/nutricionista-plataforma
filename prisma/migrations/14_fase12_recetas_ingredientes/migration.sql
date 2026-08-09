-- Fase 12: ingredientes estructurados de recetas (con macros por 100 g) para
-- sumar los datos nutricionales de la receta. Migra la lista de texto plano
-- (recetas.ingredientes) a filas de ingredientes_receta y elimina la columna.

-- 1. Tabla de ingredientes estructurados.
CREATE TABLE "ingredientes_receta" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidadGramos" DECIMAL(8,1),
    "caloriasPor100" DECIMAL(6,1),
    "proteinasPor100" DECIMAL(5,1),
    "carbohidratosPor100" DECIMAL(5,1),
    "grasasPor100" DECIMAL(5,1),
    "fuente" TEXT,
    "referenciaExterna" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ingredientes_receta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingredientes_receta_recetaId_idx" ON "ingredientes_receta"("recetaId");

ALTER TABLE "ingredientes_receta"
    ADD CONSTRAINT "ingredientes_receta_recetaId_fkey"
    FOREIGN KEY ("recetaId") REFERENCES "recetas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill: cada string de recetas.ingredientes pasa a una fila (solo nombre;
--    sin macros, fuente MANUAL). Preserva el orden original con WITH ORDINALITY.
INSERT INTO "ingredientes_receta" ("id", "recetaId", "nombre", "orden", "fuente")
SELECT
    gen_random_uuid()::text,
    r."id",
    btrim(ing.valor),
    (ing.orden - 1)::int,
    'MANUAL'
FROM "recetas" r
CROSS JOIN LATERAL unnest(r."ingredientes") WITH ORDINALITY AS ing(valor, orden)
WHERE ing.valor IS NOT NULL AND btrim(ing.valor) <> '';

-- 3. Eliminar la columna de texto plano ya migrada.
ALTER TABLE "recetas" DROP COLUMN "ingredientes";
