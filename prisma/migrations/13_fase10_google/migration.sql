-- DropIndex
DROP INDEX "cuentas_conectadas_proveedor_emailCuenta_key";

-- AlterTable
ALTER TABLE "sincronizaciones_turno" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "cuentas_conectadas_nutricionistaId_idx" ON "cuentas_conectadas"("nutricionistaId");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_conectadas_nutricionistaId_proveedor_key" ON "cuentas_conectadas"("nutricionistaId", "proveedor");

-- CreateIndex
CREATE INDEX "sincronizaciones_turno_nutricionistaId_idx" ON "sincronizaciones_turno"("nutricionistaId");

