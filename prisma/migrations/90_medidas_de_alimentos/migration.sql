-- Migración 90 — Medidas de los alimentos (g, ml y medidas caseras)
--
-- No todo se mide en gramos: la leche va en ml, el aceite en cucharadas y el
-- huevo en unidades. Como en FatSecret, cada alimento declara:
--
--   * su UNIDAD BASE (GRAMO o MILILITRO): sus macros son por 100 g o por 100 ml;
--   * sus MEDIDAS CASERAS: [{ "nombre": "taza", "cantidad": 240 }], es decir
--     «1 taza = 240 ml» (o g, según la unidad base).
--
-- Donde se USA un alimento (opción del plan, ingrediente de receta, comida
-- del plan semanal) se copia además en qué medida se indicó la cantidad.
-- `cantidadGramos` sigue siendo la cantidad en la unidad base y la única que
-- suma macros, así que todo lo ya cargado queda igual: GRAMO y sin medida.
-- Ver docs/MEDIDAS-ALIMENTOS.md.

CREATE TYPE "UnidadBaseAlimento" AS ENUM ('GRAMO', 'MILILITRO');

ALTER TABLE "alimentos_propios"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "alimentos_base"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "items_opcion_comida"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "medida" TEXT,
  ADD COLUMN "cantidadMedida" DECIMAL(8,2),
  ADD COLUMN "cantidadPorMedida" DECIMAL(8,1);

ALTER TABLE "ingredientes_receta"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "medida" TEXT,
  ADD COLUMN "cantidadMedida" DECIMAL(8,2),
  ADD COLUMN "cantidadPorMedida" DECIMAL(8,1);

ALTER TABLE "ingredientes_receta_base"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "medida" TEXT,
  ADD COLUMN "cantidadMedida" DECIMAL(8,2),
  ADD COLUMN "cantidadPorMedida" DECIMAL(8,1);

ALTER TABLE "items_comida_semanal"
  ADD COLUMN "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
  ADD COLUMN "medidas" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "medida" TEXT,
  ADD COLUMN "cantidadMedida" DECIMAL(8,2),
  ADD COLUMN "cantidadPorMedida" DECIMAL(8,1);
