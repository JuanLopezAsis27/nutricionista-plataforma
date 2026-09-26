-- Migración 81 — El teléfono del paciente se puede repetir.
--
-- Igual que el email de contacto (migración 79): dos hermanos pueden llevar el
-- teléfono de la madre, y un chico el de su abuelo. El número identifica a
-- QUIÉN ESCRIBE por WhatsApp, no de quién se habla, así que cuando varias
-- fichas lo comparten la ingesta elige con pistas (el turno del botón, con
-- quién venía la conversación, la ficha más antigua). Ver
-- `dominio/servicios/fichaPorTelefono.ts` y docs/WHATSAPP.md.
--
-- Solo afloja una restricción: ninguna fila existente puede incumplirla.

DROP INDEX "pacientes_nutricionistaId_telefonoE164_key";
CREATE INDEX "pacientes_nutricionistaId_telefonoE164_idx" ON "pacientes"("nutricionistaId", "telefonoE164");
