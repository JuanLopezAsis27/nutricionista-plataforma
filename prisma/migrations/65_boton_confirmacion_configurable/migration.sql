-- El botón "Confirmar asistencia" salía siempre en los recordatorios de
-- turnos pendientes; pasa a ser una decisión por plantilla (default true,
-- así el comportamiento no cambia para las que ya existen).
--
-- (Se omitió a propósito `ALTER TABLE "turnos" ALTER COLUMN "periodo" DROP
-- DEFAULT`, que generó el diff automático: es el mismo artefacto conocido de
-- cómo Prisma introspecciona la columna GENERADA `periodo` -ver el
-- comentario sobre ella en schema.prisma-, no un cambio real de este feature.)

-- AlterTable
ALTER TABLE "plantillas_email_recordatorio" ADD COLUMN     "incluirBotonConfirmacion" BOOLEAN NOT NULL DEFAULT true;
