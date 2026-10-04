-- Migración 88 — Evoluciones en el PDF de la evaluación
--
-- El PDF de la evaluación integral suma las evoluciones de control del
-- paciente, y el consultorio elige si van (Configuración → Documentos y
-- mensajes → Secciones a incluir), igual que las secciones del PDF del plan.
-- Encendido por defecto: es lo que se pidió ver.

ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "pdfEvaluacionMostrarEvoluciones" BOOLEAN NOT NULL DEFAULT true;
