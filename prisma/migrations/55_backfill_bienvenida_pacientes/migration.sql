-- Migración 55 — Backfill de bienvenida para pacientes ya existentes
--
-- Antes de esta feature, el alta de un paciente mandaba la bienvenida
-- SIEMPRE (best-effort, sin registrar nada: cada tenant se aprovisiona con
-- su plantilla BIENVENIDA desde el alta del consultorio). Sin este backfill,
-- todo paciente cargado antes de este deploy aparecería como "no enviada" y
-- quedaría expuesto a un reenvío manual innecesario desde el listado.
--
-- Se usa `creadoEn` como fecha de referencia: es la mejor aproximación
-- disponible a cuándo se le mandó en su momento (la bienvenida nunca quedó
-- registrada aparte). Solo toca los que todavía están en null, así que
-- correrla de nuevo no pisa nada.
UPDATE "pacientes"
  SET "bienvenidaEnviadaEn" = "creadoEn"
  WHERE "bienvenidaEnviadaEn" IS NULL;
