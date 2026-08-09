-- Fase 17: alimentos propios del nutricionista (Excel de macros).
CREATE TABLE "alimentos_propios" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "nombre" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "marca" TEXT,
    "caloriasPor100" DOUBLE PRECISION,
    "proteinasPor100" DOUBLE PRECISION,
    "carbohidratosPor100" DOUBLE PRECISION,
    "grasasPor100" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alimentos_propios_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "alimentos_propios_nutricionistaId_nombreNormalizado_idx" ON "alimentos_propios"("nutricionistaId", "nombreNormalizado");
