-- Migración 82 — Catálogo de la plataforma y macros en las opciones del plan.
--
-- 1. Catálogo PREDETERMINADO (alimentos_base, recetas_base): lo carga el
--    SUPERADMIN y lo ven todos los consultorios. No son tablas de inquilino:
--    no llevan nutricionistaId y no están en MODELOS_INQUILINO. Lo que agrega
--    un profesional sigue yendo a alimentos_propios y es solo suyo.
--    Una receta base no se usa en su lugar: se COPIA al recetario del
--    consultorio (recetas.recetaBaseId, único por consultorio).
--
-- 2. Las opciones del plan pasan a tener alimentos sueltos con macros
--    (items_opcion_comida) y porciones de la receta vinculada. Receta y
--    alimentos se SUMAN; los ingredientes de la receta nunca se suman aparte.
--    El texto de la opción deja de ser obligatorio si hay receta o alimentos.
--
-- 3. Cada meta diaria del plan dice si es un piso, un techo o un objetivo
--    aproximado. Las existentes quedan APROXIMADO: es como se leían (±10 %).
--
-- Ver docs/CATALOGO-BASE.md y docs/PLANES.md.

CREATE TYPE "TipoMetaMacro" AS ENUM ('APROXIMADO', 'MINIMO', 'MAXIMO');

ALTER TABLE "opciones_comida"
  ADD COLUMN "porciones" DECIMAL(6,2),
  ALTER COLUMN "contenido" SET DEFAULT '';

ALTER TABLE "planes_nutricionales"
  ADD COLUMN "caloriasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
  ADD COLUMN "proteinasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
  ADD COLUMN "carbohidratosMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
  ADD COLUMN "grasasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO';

ALTER TABLE "recetas" ADD COLUMN "recetaBaseId" TEXT;

CREATE TABLE "alimentos_base" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "nombreNormalizado" TEXT NOT NULL,
  "marca" TEXT,
  "caloriasPor100" DECIMAL(7,2),
  "proteinasPor100" DECIMAL(7,2),
  "carbohidratosPor100" DECIMAL(7,2),
  "grasasPor100" DECIMAL(7,2),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "alimentos_base_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recetas_base" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "porciones" INTEGER,
  "preparacion" TEXT,
  "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "enlaces" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "calorias" DECIMAL(7,2),
  "proteinasG" DECIMAL(7,2),
  "carbohidratosG" DECIMAL(7,2),
  "grasasG" DECIMAL(7,2),
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recetas_base_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingredientes_receta_base" (
  "id" TEXT NOT NULL,
  "recetaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "cantidadGramos" DECIMAL(8,1),
  "caloriasPor100" DECIMAL(7,2),
  "proteinasPor100" DECIMAL(7,2),
  "carbohidratosPor100" DECIMAL(7,2),
  "grasasPor100" DECIMAL(7,2),
  "fuente" TEXT,
  "referenciaExterna" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ingredientes_receta_base_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "items_opcion_comida" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "opcionId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "cantidadGramos" DECIMAL(8,1),
  "caloriasPor100" DECIMAL(7,2),
  "proteinasPor100" DECIMAL(7,2),
  "carbohidratosPor100" DECIMAL(7,2),
  "grasasPor100" DECIMAL(7,2),
  "fuente" TEXT,
  "referenciaExterna" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "items_opcion_comida_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alimentos_base_nombreNormalizado_idx" ON "alimentos_base"("nombreNormalizado");
CREATE INDEX "recetas_base_nombre_idx" ON "recetas_base"("nombre");
CREATE INDEX "ingredientes_receta_base_recetaId_idx" ON "ingredientes_receta_base"("recetaId");
CREATE INDEX "items_opcion_comida_nutricionistaId_opcionId_idx" ON "items_opcion_comida"("nutricionistaId", "opcionId");
CREATE UNIQUE INDEX "recetas_nutricionistaId_recetaBaseId_key" ON "recetas"("nutricionistaId", "recetaBaseId");

ALTER TABLE "ingredientes_receta_base" ADD CONSTRAINT "ingredientes_receta_base_recetaId_fkey"
  FOREIGN KEY ("recetaId") REFERENCES "recetas_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_recetaBaseId_fkey"
  FOREIGN KEY ("recetaBaseId") REFERENCES "recetas_base"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "items_opcion_comida" ADD CONSTRAINT "items_opcion_comida_opcionId_fkey"
  FOREIGN KEY ("opcionId") REFERENCES "opciones_comida"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "items_opcion_comida" ADD CONSTRAINT "items_opcion_comida_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
