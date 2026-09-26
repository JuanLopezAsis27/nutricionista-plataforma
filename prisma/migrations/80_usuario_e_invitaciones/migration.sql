-- Migración 80 — Nombre de usuario e invitaciones al portal.
--
-- 1. Un paciente sin email (niños, personas mayores) igual puede tener cuenta:
--    entra con un NOMBRE DE USUARIO. La cuenta tiene email, usuario o los dos.
-- 2. Una ficha solo se asocia a una cuenta que ya existe con un CÓDIGO DE
--    INVITACIÓN que canjea la persona desde su cuenta. Reemplaza la
--    vinculación automática por email: un email mal escrito asociaba la ficha
--    a la cuenta de otra persona.
--
-- Ver docs/CUENTAS-PACIENTE.md. Solo agrega y afloja: hoy toda cuenta tiene
-- email (NOT NULL), así que el CHECK no puede fallar sobre los datos
-- existentes.

-- 1. La cuenta ---------------------------------------------------------------

ALTER TABLE "usuarios" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "usuarios" ADD COLUMN "nombreUsuario" TEXT;
CREATE UNIQUE INDEX "usuarios_nombreUsuario_key" ON "usuarios"("nombreUsuario");

-- Con qué se entra: al menos uno de los dos.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_email_o_usuario_check"
  CHECK ("email" IS NOT NULL OR "nombreUsuario" IS NOT NULL);

-- El profesional y el administrador siempre tienen email (recuperación,
-- avisos): sin email solo puede quedar la cuenta de un paciente.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_email_si_no_es_paciente_check"
  CHECK ("rol" = 'PACIENTE' OR "email" IS NOT NULL);

-- Minúsculas y sin arroba: es lo que deja al login saber qué le escribieron.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nombreUsuario_formato_check"
  CHECK ("nombreUsuario" IS NULL OR "nombreUsuario" ~ '^[a-z0-9][a-z0-9._-]{2,29}$');

-- 2. Invitaciones al portal --------------------------------------------------

CREATE TABLE "invitaciones_portal" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_portal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitaciones_portal_codigoHash_key" ON "invitaciones_portal"("codigoHash");
CREATE INDEX "invitaciones_portal_nutricionistaId_pacienteId_idx" ON "invitaciones_portal"("nutricionistaId", "pacienteId");

ALTER TABLE "invitaciones_portal" ADD CONSTRAINT "invitaciones_portal_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitaciones_portal" ADD CONSTRAINT "invitaciones_portal_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
