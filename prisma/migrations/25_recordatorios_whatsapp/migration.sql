-- CreateEnum
CREATE TYPE "EstadoRecordatorioWhatsapp" AS ENUM ('PREPARADO', 'CONFIRMADO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "recordatorios_whatsapp" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "turnoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoRecordatorioWhatsapp" NOT NULL DEFAULT 'PREPARADO',
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEn" TIMESTAMP(3),

    CONSTRAINT "recordatorios_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recordatorios_whatsapp_nutricionistaId_idx" ON "recordatorios_whatsapp"("nutricionistaId");

-- CreateIndex
CREATE INDEX "recordatorios_whatsapp_turnoId_creadoEn_idx" ON "recordatorios_whatsapp"("turnoId", "creadoEn");

-- AlterTable
ALTER TABLE "configuracion_consultorio" ADD COLUMN     "whatsappPlantilla" TEXT,
ADD COLUMN     "whatsappPrefijoPais" TEXT;
