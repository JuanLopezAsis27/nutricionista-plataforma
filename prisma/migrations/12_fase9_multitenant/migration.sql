-- Fase 9 — Multi-tenant por nutricionista.
-- Agrega `nutricionistaId` a todas las tablas de inquilino, hace backfill de los
-- datos existentes al nutricionista actual (estado mono-tenant previo) y crea
-- los índices/uniques por tenant.

-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'SUPERADMIN';

-- DropIndex
DROP INDEX "plantillas_email_clave_key";

-- AlterTable
ALTER TABLE "alertas_alimentarias" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "alertas_seguimiento" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "analisis_comida" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "antropometrias" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "axiomas_nutricionales" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "configuracion_consultorio" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "consultas_ia" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "conversaciones" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "cuentas_conectadas" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "emails_enviados" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "historias_clinicas" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "laboratorios" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "materiales_biblioteca" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "objetivos" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "planes_nutricionales" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "plantillas_email" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "recetas" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "registros_diarios" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "suplementos" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "nutricionistaId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nutricionistaId" TEXT;

-- Backfill: todos los datos existentes pertenecen al nutricionista actual.
-- El nutricionista es su propio inquilino (nutricionistaId = su id).
DO $$
DECLARE nutri_id TEXT;
BEGIN
  SELECT id INTO nutri_id FROM usuarios WHERE rol = 'NUTRICIONISTA' ORDER BY "creadoEn" ASC LIMIT 1;
  IF nutri_id IS NOT NULL THEN
    UPDATE usuarios SET "nutricionistaId" = nutri_id WHERE rol IN ('NUTRICIONISTA', 'PACIENTE');
    UPDATE pacientes SET "nutricionistaId" = nutri_id;
    UPDATE suplementos SET "nutricionistaId" = nutri_id;
    UPDATE alertas_seguimiento SET "nutricionistaId" = nutri_id;
    UPDATE turnos SET "nutricionistaId" = nutri_id;
    UPDATE registros_diarios SET "nutricionistaId" = nutri_id;
    UPDATE historias_clinicas SET "nutricionistaId" = nutri_id;
    UPDATE alertas_alimentarias SET "nutricionistaId" = nutri_id;
    UPDATE laboratorios SET "nutricionistaId" = nutri_id;
    UPDATE antropometrias SET "nutricionistaId" = nutri_id;
    UPDATE recetas SET "nutricionistaId" = nutri_id;
    UPDATE planes_nutricionales SET "nutricionistaId" = nutri_id;
    UPDATE materiales_biblioteca SET "nutricionistaId" = nutri_id;
    UPDATE emails_enviados SET "nutricionistaId" = nutri_id;
    UPDATE cuentas_conectadas SET "nutricionistaId" = nutri_id;
    UPDATE conversaciones SET "nutricionistaId" = nutri_id;
    UPDATE consultas_ia SET "nutricionistaId" = nutri_id;
    UPDATE analisis_comida SET "nutricionistaId" = nutri_id;
    UPDATE objetivos SET "nutricionistaId" = nutri_id;
    UPDATE axiomas_nutricionales SET "nutricionistaId" = nutri_id;
    UPDATE plantillas_email SET "nutricionistaId" = nutri_id;
    UPDATE configuracion_consultorio SET "nutricionistaId" = nutri_id;
  END IF;
END $$;

-- CreateIndex (uniques por tenant)
CREATE UNIQUE INDEX "configuracion_consultorio_nutricionistaId_key" ON "configuracion_consultorio"("nutricionistaId");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_email_nutricionistaId_clave_key" ON "plantillas_email"("nutricionistaId", "clave");

-- CreateIndex (índices de tenant para el filtrado por nutricionista)
CREATE INDEX "usuarios_nutricionistaId_idx" ON "usuarios"("nutricionistaId");
CREATE INDEX "pacientes_nutricionistaId_idx" ON "pacientes"("nutricionistaId");
CREATE INDEX "turnos_nutricionistaId_idx" ON "turnos"("nutricionistaId");
CREATE INDEX "planes_nutricionales_nutricionistaId_idx" ON "planes_nutricionales"("nutricionistaId");
CREATE INDEX "recetas_nutricionistaId_idx" ON "recetas"("nutricionistaId");
CREATE INDEX "materiales_biblioteca_nutricionistaId_idx" ON "materiales_biblioteca"("nutricionistaId");
CREATE INDEX "axiomas_nutricionales_nutricionistaId_idx" ON "axiomas_nutricionales"("nutricionistaId");
CREATE INDEX "alertas_seguimiento_nutricionistaId_idx" ON "alertas_seguimiento"("nutricionistaId");
CREATE INDEX "emails_enviados_nutricionistaId_idx" ON "emails_enviados"("nutricionistaId");
CREATE INDEX "suplementos_nutricionistaId_idx" ON "suplementos"("nutricionistaId");
CREATE INDEX "objetivos_nutricionistaId_idx" ON "objetivos"("nutricionistaId");
CREATE INDEX "conversaciones_nutricionistaId_idx" ON "conversaciones"("nutricionistaId");
