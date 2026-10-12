-- Migración 89 — Qué evoluciones de la antropometría ve el paciente
--
-- El consultorio elige qué gráficos de evolución aparecen en «Mi composición»
-- del portal (peso, un pliegue, un perímetro puntual, la prensión…), en
-- Configuración → Antropometría → Evoluciones del paciente.
--
-- Vacío = nunca se personalizó: el dominio resuelve el juego por defecto al
-- LEER (`EVOLUCIONES_PACIENTE_POR_DEFECTO`), como los campos de protocolo de
-- la migración 70, así que no hace falta backfill ni congelar la lista acá.

ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "evolucionesPaciente" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
