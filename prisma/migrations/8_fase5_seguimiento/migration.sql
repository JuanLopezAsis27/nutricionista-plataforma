-- Fase 5: Suplementación + alertas de seguimiento.
-- Suplementos por paciente y alertas generadas por el cron diario del worker.

-- CreateEnum
CREATE TYPE "TipoAlertaSeguimiento" AS ENUM ('SIN_REGISTRO_PESO', 'SIN_ACTIVIDAD', 'PLAN_VENCIDO', 'TURNO_SIN_CONFIRMAR');

-- CreateEnum
CREATE TYPE "EstadoAlertaSeguimiento" AS ENUM ('PENDIENTE', 'RESUELTA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "suplementos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dosis" TEXT,
    "frecuencia" TEXT,
    "desde" DATE,
    "hasta" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suplementos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_seguimiento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoAlertaSeguimiento" NOT NULL,
    "estado" "EstadoAlertaSeguimiento" NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT NOT NULL,
    "referenciaId" TEXT,
    "datos" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEn" TIMESTAMP(3),

    CONSTRAINT "alertas_seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suplementos_pacienteId_idx" ON "suplementos"("pacienteId");

-- CreateIndex
CREATE INDEX "alertas_seguimiento_estado_idx" ON "alertas_seguimiento"("estado");

-- CreateIndex
CREATE INDEX "alertas_seguimiento_pacienteId_tipo_estado_idx" ON "alertas_seguimiento"("pacienteId", "tipo", "estado");

-- AddForeignKey
ALTER TABLE "suplementos" ADD CONSTRAINT "suplementos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_seguimiento" ADD CONSTRAINT "alertas_seguimiento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

