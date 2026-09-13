-- Análisis automático por IA de las fotos de comida del diario, configurable
-- por el nutricionista. Apagado por defecto: cada análisis gasta cuota de IA.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "analisisFotoComidaAutomatico" BOOLEAN NOT NULL DEFAULT false;
