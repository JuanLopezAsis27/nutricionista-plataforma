-- Migración 76 — Cancelar el turno desde el recordatorio.
--
-- Hasta acá el recordatorio (email o WhatsApp) solo sabía pedir que el
-- paciente CONFIRMARA. Ahora también puede ofrecerle cancelar, de dos maneras
-- que elige el profesional por plantilla:
--
--   * APP — un enlace firmado a /cancelar-turno: el turno pasa a CANCELADO sin
--     que nadie intervenga, igual que la confirmación.
--   * WHATSAPP — un enlace wa.me al número de cancelaciones del consultorio con
--     un mensaje ya escrito. No toca el turno: lo cancela el profesional
--     después de leerlo.

-- 1) Cuándo y quién canceló.
--
-- `canceladoEn` se registra en toda cancelación desde ahora; las anteriores
-- quedan en NULL porque ese dato nunca se guardó y no hay de dónde sacarlo.
-- `canceladoPor` distingue la del paciente (el enlace del recordatorio) de la
-- del consultorio: la primera es la que el profesional tiene que enterarse.
CREATE TYPE "OrigenCancelacion" AS ENUM ('PACIENTE', 'CONSULTORIO');

ALTER TABLE "turnos"
  ADD COLUMN "canceladoEn" TIMESTAMP(3),
  ADD COLUMN "canceladoPor" "OrigenCancelacion";

-- 2) Los dos avisos nuevos de la campana.
ALTER TYPE "TipoNotificacion" ADD VALUE 'TURNO_CANCELADO';
ALTER TYPE "TipoNotificacion" ADD VALUE 'CANCELACION_PEDIDA';

-- 3) El botón de cancelar en la plantilla de email. NINGUNO por defecto: las
-- plantillas que ya existen siguen saliendo exactamente igual.
CREATE TYPE "BotonCancelacion" AS ENUM ('NINGUNO', 'APP', 'WHATSAPP');

ALTER TABLE "plantillas_email_recordatorio"
  ADD COLUMN "botonCancelacion" "BotonCancelacion" NOT NULL DEFAULT 'NINGUNO',
  ADD COLUMN "mensajeCancelacion" TEXT;

-- 4) El número al que escribe el paciente para cancelar. Es del consultorio y
-- no del proveedor de WhatsApp: muchas veces el número que manda los
-- recordatorios no es el que el profesional usa en el día a día.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "whatsappCancelaciones" TEXT;
