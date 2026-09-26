-- Migración 79 — El email del paciente pasa a ser opcional y repetible.
--
-- Hay pacientes sin email (niños, personas mayores) y hermanos que llevan el
-- de la madre. El email de la ficha queda como dato de CONTACTO: a dónde le
-- escribe este consultorio. El usuario con el que se entra al portal es de la
-- cuenta (`usuarios`), no de la ficha. Ver docs/CUENTAS-PACIENTE.md.
--
-- Solo afloja restricciones: ninguna fila existente puede incumplirlas.

ALTER TABLE "pacientes" ALTER COLUMN "email" DROP NOT NULL;

-- Único por consultorio → índice común (se sigue buscando por email).
DROP INDEX "pacientes_nutricionistaId_email_key";
CREATE INDEX "pacientes_nutricionistaId_email_idx" ON "pacientes"("nutricionistaId", "email");

-- Un email vacío no es un email: si quedó alguno de antes de validar el
-- formato, pasa a NULL para que "sin email" signifique una sola cosa.
UPDATE "pacientes" SET "email" = NULL WHERE btrim("email") = '';
