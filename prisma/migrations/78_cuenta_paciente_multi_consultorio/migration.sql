-- Migración 78 — Una cuenta, varios consultorios.
--
-- El email del PACIENTE siempre fue único por consultorio (la misma persona
-- puede ser paciente de dos nutricionistas), pero la CUENTA no acompañaba:
-- `usuarios.email` es único global y la cuenta apuntaba a UNA ficha
-- (`pacienteId`) y a UN consultorio (`nutricionistaId`). El segundo
-- consultorio no podía darle acceso al portal: el alta se rechazaba con «ese
-- email ya tiene una cuenta en la plataforma».
--
-- Se da vuelta el vínculo:
--
--   * `usuarios` queda como la CUENTA (la persona): email, contraseña, foto. La
--     de un paciente deja de pertenecer a un consultorio (`nutricionistaId`
--     NULL) y deja de apuntar a una ficha.
--   * `pacientes` ya era la relación persona ↔ consultorio (la ficha, con todo
--     lo clínico colgando de ella). Ahora además dice de qué cuenta es
--     (`usuarioId`), así que una cuenta puede tener una ficha en cada
--     consultorio donde se atiende.
--
-- Ver docs/CUENTAS-PACIENTE.md.

-- 1. La ficha apunta a su cuenta ---------------------------------------------

ALTER TABLE "pacientes" ADD COLUMN "usuarioId" TEXT;

-- Una ficha por consultorio y por cuenta, igual que el email del paciente.
CREATE UNIQUE INDEX "pacientes_nutricionistaId_usuarioId_key"
  ON "pacientes"("nutricionistaId", "usuarioId");
CREATE INDEX "pacientes_usuarioId_idx" ON "pacientes"("usuarioId");

-- SET NULL: dar de baja la cuenta no puede llevarse puesta la ficha clínica.
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Mudar el vínculo que ya existe (usuarios.pacienteId → pacientes.usuarioId)

UPDATE "pacientes" p
   SET "usuarioId" = u."id"
  FROM "usuarios" u
 WHERE u."pacienteId" = p."id"
   AND u."rol" = 'PACIENTE';

-- 3. La cuenta del paciente deja de ser de un consultorio ----------------------
--
-- Las cuentas PACIENTE sin ficha (se borró la ficha y la FK dejó `pacienteId`
-- en NULL) no daban acceso a nada —el portal exige una ficha— y tenían tomado
-- el email para siempre. Sin ficha no hay qué conservar: se borran, y con
-- ellas sus tokens (CASCADE).
DELETE FROM "usuarios" u
 WHERE u."rol" = 'PACIENTE'
   AND NOT EXISTS (SELECT 1 FROM "pacientes" p WHERE p."usuarioId" = u."id");

UPDATE "usuarios" SET "nutricionistaId" = NULL WHERE "rol" = 'PACIENTE';

ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pacienteId_fkey";
DROP INDEX "usuarios_pacienteId_key";
ALTER TABLE "usuarios" DROP COLUMN "pacienteId";

-- Lo que la entidad garantiza, también el motor: una cuenta de paciente no
-- tiene consultorio propio (sus consultorios son los de sus fichas).
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_paciente_sin_inquilino_check"
  CHECK ("rol" <> 'PACIENTE' OR "nutricionistaId" IS NULL);

-- 4. Contraseña puesta por un profesional --------------------------------------
--
-- Las que ya existen quedan en `false`: nadie que ya usa la app va a ver de
-- golpe una advertencia por una contraseña que quizá cambió hace meses.
ALTER TABLE "usuarios" ADD COLUMN "passwordProvisional" BOOLEAN NOT NULL DEFAULT false;

-- 5. La bienvenida de quien ya tenía cuenta -------------------------------------
--
-- Plantilla de sistema aparte, sin {{contrasena}}: la contraseña es de la
-- persona y ningún consultorio la toca. Se siembra en cada consultorio.
INSERT INTO "plantillas_email"
  ("id", "nutricionistaId", "clave", "nombre", "asunto", "cuerpoHtml", "descripcion", "deSistema", "creadoEn", "actualizadoEn")
SELECT gen_random_uuid()::text,
       n."id",
       'BIENVENIDA_CUENTA_EXISTENTE',
       'Bienvenida (ya tiene cuenta)',
       '¡Bienvenido/a, {{paciente}}!',
       '<div style="font-family:sans-serif;color:#222;line-height:1.5">
  <p>Hola <strong>{{paciente}}</strong>,</p>
  <p>{{profesional}} te sumó a su consultorio. Como ya tenés una cuenta, entrás con tu email ({{email}}) y la contraseña que ya usás.</p>
  <p>Si te atendés con más de un profesional, al entrar vas a poder elegir en qué consultorio trabajar.</p>
  <p>Saludos,<br/>{{profesional}}</p>
</div>',
       'Bienvenida para pacientes que ya tenían cuenta en la plataforma (sin contraseña).',
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
  FROM "nutricionistas" n
 WHERE NOT EXISTS (
   SELECT 1 FROM "plantillas_email" pe
    WHERE pe."nutricionistaId" = n."id"
      AND pe."clave" = 'BIENVENIDA_CUENTA_EXISTENTE'
 );
