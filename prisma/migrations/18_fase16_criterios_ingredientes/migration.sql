-- Fase 16: criterios de ingredientes del nutricionista (filtran la búsqueda).
ALTER TABLE "credenciales_integracion"
  ADD COLUMN "criterioExcluirMarcas" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "criterioRequiereMacros" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "criterioMaxCaloriasPor100" DOUBLE PRECISION,
  ADD COLUMN "criterioExcluirTexto" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
