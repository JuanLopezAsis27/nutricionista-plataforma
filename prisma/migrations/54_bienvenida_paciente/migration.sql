-- Migración 54 — Gestión del email de bienvenida
--
-- Interruptor por consultorio: si el alta de un paciente nuevo manda,
-- además, su email de bienvenida con los datos de acceso. Apagarlo no afecta
-- el envío manual desde el listado de pacientes, solo el automático del alta.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "bienvenidaAutomaticaActiva" BOOLEAN NOT NULL DEFAULT true;

-- Registro de a quién se le mandó (automático o manual). Null = todavía no.
ALTER TABLE "pacientes" ADD COLUMN "bienvenidaEnviadaEn" TIMESTAMP(3);
