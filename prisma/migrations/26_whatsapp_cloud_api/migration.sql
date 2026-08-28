-- CreateEnum
CREATE TYPE "DireccionWhatsapp" AS ENUM ('ENTRANTE', 'SALIENTE');

-- CreateEnum
CREATE TYPE "EstadoMensajeWhatsapp" AS ENUM ('PENDIENTE', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'FALLIDO');

-- AlterTable
ALTER TABLE "recordatorios_whatsapp" ADD COLUMN     "idExterno" TEXT;

-- AlterTable
ALTER TABLE "credenciales_integracion" ADD COLUMN     "whatsappTokenCifrado" TEXT,
ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappVerifyTokenCifrado" TEXT,
ADD COLUMN     "whatsappAppSecretCifrado" TEXT;

-- CreateTable
CREATE TABLE "mensajes_whatsapp" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "pacienteId" TEXT NOT NULL,
    "direccion" "DireccionWhatsapp" NOT NULL,
    "telefono" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "idExterno" TEXT,
    "estado" "EstadoMensajeWhatsapp" NOT NULL DEFAULT 'PENDIENTE',
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensajes_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recordatorios_whatsapp_idExterno_idx" ON "recordatorios_whatsapp"("idExterno");

-- CreateIndex
CREATE UNIQUE INDEX "mensajes_whatsapp_idExterno_key" ON "mensajes_whatsapp"("idExterno");

-- CreateIndex
CREATE INDEX "mensajes_whatsapp_nutricionistaId_idx" ON "mensajes_whatsapp"("nutricionistaId");

-- CreateIndex
CREATE INDEX "mensajes_whatsapp_pacienteId_creadoEn_idx" ON "mensajes_whatsapp"("pacienteId", "creadoEn");

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp" ADD CONSTRAINT "mensajes_whatsapp_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
