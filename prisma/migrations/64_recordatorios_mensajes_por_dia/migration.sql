-- Migración: mensajes de recordatorio por escalón de anticipación.
--
-- WhatsApp ya tenía varias plantillas con una "predeterminada"; se le agrega
-- `diasAntes` para que una plantilla pueda atarse a un escalón concreto
-- ("3 días antes", "1 día antes"). El email, en cambio, era UNA sola fila fija
-- (`plantillas_email` con clave RECORDATORIO_TURNO): pasa a ser una lista
-- igual a la de WhatsApp (`plantillas_email_recordatorio`), y esta migración
-- copia el texto que cada consultorio ya tenía escrito a la primera fila de
-- esa lista, marcada predeterminada, antes de borrar la vieja.
--
-- (La línea `ALTER TABLE "turnos" ALTER COLUMN "periodo" DROP DEFAULT` que
-- generó el diff automático se omitió a propósito: es un artefacto conocido
-- de cómo Prisma introspecciona la columna GENERADA `periodo` -ver el
-- comentario sobre ella en schema.prisma-, no un cambio real de este feature.)

-- AlterTable
ALTER TABLE "plantillas_whatsapp" ADD COLUMN     "diasAntes" INTEGER;

-- CreateTable
CREATE TABLE "plantillas_email_recordatorio" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpoHtml" TEXT NOT NULL,
    "diasAntes" INTEGER,
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_email_recordatorio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_email_recordatorio_nutricionistaId_nombre_key" ON "plantillas_email_recordatorio"("nutricionistaId", "nombre");

-- AddForeignKey
ALTER TABLE "plantillas_email_recordatorio" ADD CONSTRAINT "plantillas_email_recordatorio_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Migración del texto: de la fila fija RECORDATORIO_TURNO a la lista nueva
--
-- Cada consultorio que ya tenía su plantilla de email editada la conserva,
-- como predeterminada de la lista nueva (sin día asignado, así cubre
-- cualquier escalón). El texto de fábrica lo siembra el provisionador para
-- los consultorios nuevos; acá solo se migran los que YA existían.

INSERT INTO "plantillas_email_recordatorio" (
    "id", "nutricionistaId", "nombre", "asunto", "cuerpoHtml",
    "predeterminada", "activa", "creadoEn", "actualizadoEn"
)
SELECT
    gen_random_uuid()::text,
    pe."nutricionistaId",
    pe."nombre",
    pe."asunto",
    pe."cuerpoHtml",
    true,
    true,
    pe."creadoEn",
    pe."actualizadoEn"
FROM "plantillas_email" pe
WHERE pe."clave" = 'RECORDATORIO_TURNO';

-- La fila vieja ya cumplió su función (se copió arriba): dejarla sería un
-- texto fantasma que nadie vuelve a editar ni a leer, y esa clave ya no la
-- resuelve ningún caso de uso.
DELETE FROM "plantillas_email" WHERE "clave" = 'RECORDATORIO_TURNO';
