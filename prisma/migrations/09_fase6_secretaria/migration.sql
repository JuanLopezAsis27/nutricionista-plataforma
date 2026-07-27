-- CreateEnum
CREATE TYPE "ProveedorCuenta" AS ENUM ('GOOGLE');

-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "pagado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precio" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "plantillas_email" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpoHtml" TEXT NOT NULL,
    "descripcion" TEXT,
    "deSistema" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails_enviados" (
    "id" TEXT NOT NULL,
    "plantillaClave" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "referenciaId" TEXT,
    "pacienteId" TEXT,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_conectadas" (
    "id" TEXT NOT NULL,
    "proveedor" "ProveedorCuenta" NOT NULL,
    "emailCuenta" TEXT NOT NULL,
    "accessTokenCifrado" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT,
    "scopes" TEXT[],
    "expiraEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_conectadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sincronizaciones_turno" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sincronizaciones_turno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_email_clave_key" ON "plantillas_email"("clave");

-- CreateIndex
CREATE INDEX "emails_enviados_creadoEn_idx" ON "emails_enviados"("creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "emails_enviados_plantillaClave_referenciaId_key" ON "emails_enviados"("plantillaClave", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_conectadas_proveedor_emailCuenta_key" ON "cuentas_conectadas"("proveedor", "emailCuenta");

-- CreateIndex
CREATE INDEX "sincronizaciones_turno_turnoId_idx" ON "sincronizaciones_turno"("turnoId");

-- CreateIndex
CREATE UNIQUE INDEX "sincronizaciones_turno_cuentaId_turnoId_key" ON "sincronizaciones_turno"("cuentaId", "turnoId");

-- AddForeignKey
ALTER TABLE "sincronizaciones_turno" ADD CONSTRAINT "sincronizaciones_turno_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_conectadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

