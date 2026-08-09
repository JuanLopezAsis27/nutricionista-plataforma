-- Fase 18: apariencia editable del PDF del plan nutricional.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "pdfColorPrimario" TEXT,
  ADD COLUMN "pdfSubtitulo" TEXT,
  ADD COLUMN "pdfPieTexto" TEXT,
  ADD COLUMN "pdfMostrarRecetas" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pdfMostrarMacros" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pdfMostrarEquivalencias" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pdfMostrarRecomendaciones" BOOLEAN NOT NULL DEFAULT true;
