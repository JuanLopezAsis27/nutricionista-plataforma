-- Migración 27 — Integridad del modelo de datos
--
-- Aplica los hallazgos críticos y altos de audits/AUDIT_MODELO_DATOS.md:
--
--   [C-4] `nutricionistaId` deja de ser un TEXT suelto con DEFAULT '' y pasa a
--         ser NOT NULL con FK a la nueva tabla `nutricionistas`.
--   [C-1] `archivos` y [A-1] `mensajes` —y otras 12 tablas hijas— reciben la
--         columna de inquilino, así la extensión de Prisma puede filtrarlas.
--   [C-2] `whatsappPhoneNumberId` pasa a ser único (ruteo de webhooks).
--   [C-3] el email del paciente pasa a ser único POR INQUILINO.
--   [C-5] no solapamiento de turnos con EXCLUDE sobre un rango generado.
--   [A-3] `telefonoE164` para resolver la ingesta de WhatsApp con un índice.
--   [A-4] `activo` (que nadie escribía) -> `archivadoEn` + `motivoArchivado`.
--   [A-7]/[B-1] las FKs que faltaban (recordatorios, logo, plan de origen).
--   [A-8] una sola precisión numérica para los macros.
--   [M-*] índices alineados con las consultas reales, CHECK del arco exclusivo,
--         índice único parcial del plan activo, GIN de etiquetas, pg_trgm.
--
-- Escrita para una base sin datos productivos: hace los cambios de una pasada,
-- sin CONCURRENTLY ni backfills en fases.

-- ---------------------------------------------------------------------------
-- 1. El inquilino como entidad referenciable
-- ---------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "nutricionistas" (
    "id" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutricionistas_pkey" PRIMARY KEY ("id")
);

-- El nutricionista es su propio inquilino: su fila sale de `usuarios`.
INSERT INTO "nutricionistas" ("id", "creadoEn")
SELECT u."id", u."creadoEn" FROM "usuarios" u WHERE u."rol" = 'NUTRICIONISTA'
ON CONFLICT ("id") DO NOTHING;

-- Red de seguridad: si alguna fila quedó con el inquilino vacío del viejo
-- DEFAULT '', se le asigna el único nutricionista existente. Con más de uno
-- esto sería ambiguo y la migración debe fallar antes de adivinar.
DO $$
DECLARE unico TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "pacientes" WHERE "nutricionistaId" = '') THEN
    SELECT "id" INTO unico FROM "nutricionistas";
    IF unico IS NULL OR (SELECT count(*) FROM "nutricionistas") <> 1 THEN
      RAISE EXCEPTION 'Hay filas con nutricionistaId vacío y no hay un único inquilino al que asignarlas.';
    END IF;
    UPDATE "pacientes" SET "nutricionistaId" = unico WHERE "nutricionistaId" = '';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Índices viejos (se reemplazan por compuestos con el inquilino adelante)
-- ---------------------------------------------------------------------------
-- DropIndex
DROP INDEX "actividades_fisicas_registroId_idx";

-- DropIndex
DROP INDEX "alertas_alimentarias_pacienteId_idx";

-- DropIndex
DROP INDEX "alertas_seguimiento_estado_idx";

-- DropIndex
DROP INDEX "alertas_seguimiento_nutricionistaId_idx";

-- DropIndex
DROP INDEX "alertas_seguimiento_pacienteId_tipo_estado_idx";

-- DropIndex
DROP INDEX "analisis_comida_pacienteId_creadoEn_idx";

-- DropIndex
DROP INDEX "archivos_laboratorioId_idx";

-- DropIndex
DROP INDEX "archivos_pacienteId_idx";

-- DropIndex
DROP INDEX "archivos_recetaId_idx";

-- DropIndex
DROP INDEX "asignaciones_material_pacienteId_idx";

-- DropIndex
DROP INDEX "asignaciones_plan_pacienteId_idx";

-- DropIndex
DROP INDEX "asignaciones_plan_planId_idx";

-- DropIndex
DROP INDEX "asignaciones_receta_pacienteId_idx";

-- DropIndex
DROP INDEX "axiomas_nutricionales_activo_idx";

-- DropIndex
DROP INDEX "axiomas_nutricionales_nutricionistaId_idx";

-- DropIndex
DROP INDEX "comidas_consumidas_registroId_idx";

-- DropIndex
DROP INDEX "comidas_plan_planId_idx";

-- DropIndex
DROP INDEX "competencias_nutricionistaId_idx";

-- DropIndex
DROP INDEX "competencias_pacienteId_fecha_idx";

-- DropIndex
DROP INDEX "consultas_ia_pacienteId_creadoEn_idx";

-- DropIndex
DROP INDEX "conversaciones_nutricionistaId_idx";

-- DropIndex
DROP INDEX "cuentas_conectadas_nutricionistaId_idx";

-- DropIndex
DROP INDEX "emails_enviados_creadoEn_idx";

-- DropIndex
DROP INDEX "emails_enviados_nutricionistaId_idx";

-- DropIndex
DROP INDEX "emails_enviados_plantillaClave_referenciaId_key";

-- DropIndex
DROP INDEX "equivalencias_plan_planId_idx";

-- DropIndex
DROP INDEX "estrategias_objetivoId_idx";

-- DropIndex
DROP INDEX "historial_objetivos_objetivoId_creadoEn_idx";

-- DropIndex
DROP INDEX "ingredientes_receta_recetaId_idx";

-- DropIndex
DROP INDEX "laboratorios_pacienteId_fecha_idx";

-- DropIndex
DROP INDEX "materiales_biblioteca_nutricionistaId_idx";

-- DropIndex
DROP INDEX "materiales_biblioteca_titulo_idx";

-- DropIndex
DROP INDEX "mensajes_conversacionId_creadoEn_idx";

-- DropIndex
DROP INDEX "mensajes_whatsapp_nutricionistaId_idx";

-- DropIndex
DROP INDEX "mensajes_whatsapp_pacienteId_creadoEn_idx";

-- DropIndex
DROP INDEX "metricas_dispositivo_nutricionistaId_idx";

-- DropIndex
DROP INDEX "metricas_dispositivo_pacienteId_fecha_idx";

-- DropIndex
DROP INDEX "objetivos_nutricionistaId_idx";

-- DropIndex
DROP INDEX "objetivos_pacienteId_estado_idx";

-- DropIndex
DROP INDEX "opciones_comida_comidaId_idx";

-- DropIndex
DROP INDEX "opciones_comida_recetaId_idx";

-- DropIndex
DROP INDEX "pacientes_apellido_nombre_idx";

-- DropIndex
DROP INDEX "pacientes_email_key";

-- DropIndex
DROP INDEX "pacientes_nutricionistaId_idx";

-- DropIndex
DROP INDEX "planes_nutricionales_esPlantilla_idx";

-- DropIndex
DROP INDEX "planes_nutricionales_nutricionistaId_idx";

-- DropIndex
DROP INDEX "recetas_nombre_idx";

-- DropIndex
DROP INDEX "recetas_nutricionistaId_idx";

-- DropIndex
DROP INDEX "recomendaciones_plan_planId_idx";

-- DropIndex
DROP INDEX "recordatorios_whatsapp_nutricionistaId_idx";

-- DropIndex
DROP INDEX "recordatorios_whatsapp_turnoId_creadoEn_idx";

-- DropIndex
DROP INDEX "sincronizaciones_turno_nutricionistaId_idx";

-- DropIndex
DROP INDEX "sincronizaciones_turno_turnoId_idx";

-- DropIndex
DROP INDEX "suplementos_nutricionistaId_idx";

-- DropIndex
DROP INDEX "suplementos_pacienteId_idx";

-- DropIndex
DROP INDEX "turnos_fecha_idx";

-- DropIndex
DROP INDEX "turnos_nutricionistaId_idx";

-- DropIndex
DROP INDEX "turnos_pacienteId_idx";

-- ---------------------------------------------------------------------------
-- 3. Columnas
-- ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "actividades_fisicas" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "alertas_alimentarias" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alertas_seguimiento" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alimentos_propios" ALTER COLUMN "nutricionistaId" DROP DEFAULT,
ALTER COLUMN "caloriasPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "proteinasPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "carbohidratosPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "grasasPor100" SET DATA TYPE DECIMAL(7,2);

-- AlterTable
ALTER TABLE "analisis_comida" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "antropometrias" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "asignaciones_material" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "asignaciones_plan" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "asignaciones_receta" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "axiomas_nutricionales" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "comidas_consumidas" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "comidas_plan" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "competencias" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "configuracion_consultorio" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "consultas_ia" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversaciones" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "credenciales_integracion" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cuentas_conectadas" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "emails_enviados" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "equivalencias_plan" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "estrategias" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "historial_objetivos" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "historias_clinicas" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ingredientes_receta" ADD COLUMN     "nutricionistaId" TEXT,
ALTER COLUMN "caloriasPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "proteinasPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "carbohidratosPor100" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "grasasPor100" SET DATA TYPE DECIMAL(7,2);

-- AlterTable
ALTER TABLE "laboratorios" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "materiales_biblioteca" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "mensajes" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "mensajes_whatsapp" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "metricas_dispositivo" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "objetivos" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "opciones_comida" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "pacientes" DROP COLUMN "activo",
ADD COLUMN     "archivadoEn" TIMESTAMP(3),
ADD COLUMN     "motivoArchivado" TEXT,
ADD COLUMN     "telefonoE164" TEXT,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "perfiles_deportivos" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "planes_nutricionales" ALTER COLUMN "proteinasMetaG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "carbohidratosMetaG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "grasasMetaG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "plantillas_email" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "recetas" ALTER COLUMN "calorias" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "proteinasG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "carbohidratosG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "grasasG" SET DATA TYPE DECIMAL(7,2),
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "recomendaciones_plan" ADD COLUMN     "nutricionistaId" TEXT;

-- AlterTable
ALTER TABLE "recordatorios_whatsapp" ALTER COLUMN "nutricionistaId" DROP DEFAULT,
ALTER COLUMN "usuarioId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "registros_diarios" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "retroalimentacion_insight" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sincronizaciones_turno" ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suplementos" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "turnos" ADD COLUMN     "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "nutricionistaId" DROP DEFAULT;


-- ---------------------------------------------------------------------------
-- 4. Backfill del inquilino en las tablas hijas
-- ---------------------------------------------------------------------------

-- Cada hija hereda el inquilino de su padre. El orden importa:
-- opciones_comida depende de que comidas_plan ya esté backfilleada.
UPDATE "comidas_consumidas" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "registros_diarios" p WHERE p."id" = h."registroId";
UPDATE "actividades_fisicas" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "registros_diarios" p WHERE p."id" = h."registroId";
UPDATE "comidas_plan" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "planes_nutricionales" p WHERE p."id" = h."planId";
UPDATE "equivalencias_plan" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "planes_nutricionales" p WHERE p."id" = h."planId";
UPDATE "recomendaciones_plan" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "planes_nutricionales" p WHERE p."id" = h."planId";
UPDATE "opciones_comida" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "comidas_plan" p WHERE p."id" = h."comidaId";
UPDATE "ingredientes_receta" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "recetas" p WHERE p."id" = h."recetaId";
UPDATE "estrategias" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "objetivos" p WHERE p."id" = h."objetivoId";
UPDATE "historial_objetivos" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "objetivos" p WHERE p."id" = h."objetivoId";
UPDATE "mensajes" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "conversaciones" p WHERE p."id" = h."conversacionId";
UPDATE "asignaciones_plan" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "pacientes" p WHERE p."id" = h."pacienteId";
UPDATE "asignaciones_receta" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "pacientes" p WHERE p."id" = h."pacienteId";
UPDATE "asignaciones_material" h SET "nutricionistaId" = p."nutricionistaId"
  FROM "pacientes" p WHERE p."id" = h."pacienteId";

-- archivos tiene arco exclusivo: el dueño puede ser cualquiera de los cinco.
UPDATE "archivos" a SET "nutricionistaId" = COALESCE(
  (SELECT p."nutricionistaId"  FROM "pacientes"             p  WHERE p."id" = a."pacienteId"),
  (SELECT l."nutricionistaId"  FROM "laboratorios"          l  WHERE l."id" = a."laboratorioId"),
  (SELECT r."nutricionistaId"  FROM "recetas"               r  WHERE r."id" = a."recetaId"),
  (SELECT m."nutricionistaId"  FROM "materiales_biblioteca" m  WHERE m."id" = a."materialId"),
  (SELECT rd."nutricionistaId" FROM "comidas_consumidas" cc
     JOIN "registros_diarios" rd ON rd."id" = cc."registroId"
    WHERE cc."id" = a."comidaConsumidaId")
);

-- Un archivo sin ningún dueño es basura en el bucket (es justo lo que barre
-- el job limpiarArchivosHuerfanos): no puede quedarse, porque el CHECK de más
-- abajo exige exactamente un dueño.
DELETE FROM "archivos" WHERE "nutricionistaId" IS NULL;

-- Ya no puede haber hijas sin inquilino.
ALTER TABLE "archivos" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "mensajes" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "comidas_consumidas" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "actividades_fisicas" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "comidas_plan" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "opciones_comida" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "equivalencias_plan" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "recomendaciones_plan" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "ingredientes_receta" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "estrategias" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "historial_objetivos" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "asignaciones_plan" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "asignaciones_receta" ALTER COLUMN "nutricionistaId" SET NOT NULL;
ALTER TABLE "asignaciones_material" ALTER COLUMN "nutricionistaId" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Índices nuevos
-- ---------------------------------------------------------------------------
-- CreateIndex
CREATE INDEX "actividades_fisicas_nutricionistaId_registroId_idx" ON "actividades_fisicas"("nutricionistaId", "registroId");

-- CreateIndex
CREATE INDEX "alertas_alimentarias_nutricionistaId_pacienteId_idx" ON "alertas_alimentarias"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "alertas_seguimiento_nutricionistaId_estado_idx" ON "alertas_seguimiento"("nutricionistaId", "estado");

-- CreateIndex
CREATE INDEX "alertas_seguimiento_nutricionistaId_pacienteId_tipo_estado_idx" ON "alertas_seguimiento"("nutricionistaId", "pacienteId", "tipo", "estado");

-- CreateIndex
CREATE INDEX "analisis_comida_nutricionistaId_pacienteId_creadoEn_idx" ON "analisis_comida"("nutricionistaId", "pacienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "archivos_nutricionistaId_pacienteId_idx" ON "archivos"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "archivos_nutricionistaId_laboratorioId_idx" ON "archivos"("nutricionistaId", "laboratorioId");

-- CreateIndex
CREATE INDEX "archivos_nutricionistaId_recetaId_idx" ON "archivos"("nutricionistaId", "recetaId");

-- CreateIndex
CREATE INDEX "asignaciones_material_nutricionistaId_pacienteId_idx" ON "asignaciones_material"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "asignaciones_plan_nutricionistaId_pacienteId_idx" ON "asignaciones_plan"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "asignaciones_plan_nutricionistaId_planId_idx" ON "asignaciones_plan"("nutricionistaId", "planId");

-- CreateIndex
CREATE INDEX "asignaciones_plan_nutricionistaId_activa_fechaFin_idx" ON "asignaciones_plan"("nutricionistaId", "activa", "fechaFin");

-- CreateIndex
CREATE INDEX "asignaciones_receta_nutricionistaId_pacienteId_idx" ON "asignaciones_receta"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "axiomas_nutricionales_nutricionistaId_activo_idx" ON "axiomas_nutricionales"("nutricionistaId", "activo");

-- CreateIndex
CREATE INDEX "comidas_consumidas_nutricionistaId_registroId_idx" ON "comidas_consumidas"("nutricionistaId", "registroId");

-- CreateIndex
CREATE INDEX "comidas_plan_nutricionistaId_planId_idx" ON "comidas_plan"("nutricionistaId", "planId");

-- CreateIndex
CREATE INDEX "competencias_nutricionistaId_pacienteId_fecha_idx" ON "competencias"("nutricionistaId", "pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "consultas_ia_nutricionistaId_pacienteId_creadoEn_idx" ON "consultas_ia"("nutricionistaId", "pacienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "conversaciones_nutricionistaId_ultimoMensajeEn_idx" ON "conversaciones"("nutricionistaId", "ultimoMensajeEn");

-- CreateIndex
CREATE UNIQUE INDEX "credenciales_integracion_whatsappPhoneNumberId_key" ON "credenciales_integracion"("whatsappPhoneNumberId");

-- CreateIndex
CREATE INDEX "emails_enviados_nutricionistaId_creadoEn_idx" ON "emails_enviados"("nutricionistaId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "emails_enviados_nutricionistaId_plantillaClave_referenciaId_key" ON "emails_enviados"("nutricionistaId", "plantillaClave", "referenciaId");

-- CreateIndex
CREATE INDEX "equivalencias_plan_nutricionistaId_planId_idx" ON "equivalencias_plan"("nutricionistaId", "planId");

-- CreateIndex
CREATE INDEX "estrategias_nutricionistaId_objetivoId_idx" ON "estrategias"("nutricionistaId", "objetivoId");

-- CreateIndex
CREATE INDEX "historial_objetivos_nutricionistaId_objetivoId_creadoEn_idx" ON "historial_objetivos"("nutricionistaId", "objetivoId", "creadoEn");

-- CreateIndex
CREATE INDEX "ingredientes_receta_nutricionistaId_recetaId_idx" ON "ingredientes_receta"("nutricionistaId", "recetaId");

-- CreateIndex
CREATE INDEX "laboratorios_nutricionistaId_pacienteId_fecha_idx" ON "laboratorios"("nutricionistaId", "pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "materiales_biblioteca_nutricionistaId_titulo_idx" ON "materiales_biblioteca"("nutricionistaId", "titulo");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_biblioteca_nutricionistaId_id_key" ON "materiales_biblioteca"("nutricionistaId", "id");

-- CreateIndex
CREATE INDEX "mensajes_nutricionistaId_conversacionId_creadoEn_idx" ON "mensajes"("nutricionistaId", "conversacionId", "creadoEn");

-- CreateIndex
CREATE INDEX "mensajes_whatsapp_nutricionistaId_pacienteId_creadoEn_idx" ON "mensajes_whatsapp"("nutricionistaId", "pacienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "metricas_dispositivo_nutricionistaId_pacienteId_fecha_idx" ON "metricas_dispositivo"("nutricionistaId", "pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "objetivos_nutricionistaId_pacienteId_estado_idx" ON "objetivos"("nutricionistaId", "pacienteId", "estado");

-- CreateIndex
CREATE INDEX "opciones_comida_nutricionistaId_comidaId_idx" ON "opciones_comida"("nutricionistaId", "comidaId");

-- CreateIndex
CREATE INDEX "opciones_comida_nutricionistaId_recetaId_idx" ON "opciones_comida"("nutricionistaId", "recetaId");

-- CreateIndex
CREATE INDEX "pacientes_nutricionistaId_apellido_nombre_idx" ON "pacientes"("nutricionistaId", "apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_nutricionistaId_id_key" ON "pacientes"("nutricionistaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_nutricionistaId_email_key" ON "pacientes"("nutricionistaId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_nutricionistaId_telefonoE164_key" ON "pacientes"("nutricionistaId", "telefonoE164");

-- CreateIndex
CREATE INDEX "planes_nutricionales_nutricionistaId_esPlantilla_archivado_idx" ON "planes_nutricionales"("nutricionistaId", "esPlantilla", "archivado");

-- CreateIndex
CREATE UNIQUE INDEX "planes_nutricionales_nutricionistaId_id_key" ON "planes_nutricionales"("nutricionistaId", "id");

-- CreateIndex
CREATE INDEX "recetas_nutricionistaId_nombre_idx" ON "recetas"("nutricionistaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "recetas_nutricionistaId_id_key" ON "recetas"("nutricionistaId", "id");

-- CreateIndex
CREATE INDEX "recomendaciones_plan_nutricionistaId_planId_idx" ON "recomendaciones_plan"("nutricionistaId", "planId");

-- CreateIndex
CREATE INDEX "recordatorios_whatsapp_nutricionistaId_turnoId_creadoEn_idx" ON "recordatorios_whatsapp"("nutricionistaId", "turnoId", "creadoEn");

-- CreateIndex
CREATE INDEX "registros_diarios_nutricionistaId_fecha_idx" ON "registros_diarios"("nutricionistaId", "fecha");

-- CreateIndex
CREATE INDEX "sincronizaciones_turno_nutricionistaId_turnoId_idx" ON "sincronizaciones_turno"("nutricionistaId", "turnoId");

-- CreateIndex
CREATE INDEX "suplementos_nutricionistaId_pacienteId_idx" ON "suplementos"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "turnos_nutricionistaId_pacienteId_idx" ON "turnos"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "turnos_nutricionistaId_fecha_idx" ON "turnos"("nutricionistaId", "fecha");

-- CreateIndex
CREATE INDEX "turnos_nutricionistaId_estado_fecha_idx" ON "turnos"("nutricionistaId", "estado", "fecha");

-- ---------------------------------------------------------------------------
-- 6. Claves foráneas
-- ---------------------------------------------------------------------------
-- AddForeignKey
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suplementos" ADD CONSTRAINT "suplementos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_deportivos" ADD CONSTRAINT "perfiles_deportivos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencias" ADD CONSTRAINT "competencias_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_seguimiento" ADD CONSTRAINT "alertas_seguimiento_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios_whatsapp" ADD CONSTRAINT "recordatorios_whatsapp_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios_whatsapp" ADD CONSTRAINT "recordatorios_whatsapp_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios_whatsapp" ADD CONSTRAINT "recordatorios_whatsapp_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios_whatsapp" ADD CONSTRAINT "recordatorios_whatsapp_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_whatsapp" ADD CONSTRAINT "mensajes_whatsapp_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_diarios" ADD CONSTRAINT "registros_diarios_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_dispositivo" ADD CONSTRAINT "metricas_dispositivo_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciales_integracion" ADD CONSTRAINT "credenciales_integracion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retroalimentacion_insight" ADD CONSTRAINT "retroalimentacion_insight_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimentos_propios" ADD CONSTRAINT "alimentos_propios_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comidas_consumidas" ADD CONSTRAINT "comidas_consumidas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_fisicas" ADD CONSTRAINT "actividades_fisicas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historias_clinicas" ADD CONSTRAINT "historias_clinicas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_alimentarias" ADD CONSTRAINT "alertas_alimentarias_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratorios" ADD CONSTRAINT "laboratorios_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antropometrias" ADD CONSTRAINT "antropometrias_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredientes_receta" ADD CONSTRAINT "ingredientes_receta_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_receta" ADD CONSTRAINT "asignaciones_receta_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_nutricionales" ADD CONSTRAINT "planes_nutricionales_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_nutricionales" ADD CONSTRAINT "planes_nutricionales_planOrigenId_fkey" FOREIGN KEY ("planOrigenId") REFERENCES "planes_nutricionales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comidas_plan" ADD CONSTRAINT "comidas_plan_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_comida" ADD CONSTRAINT "opciones_comida_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equivalencias_plan" ADD CONSTRAINT "equivalencias_plan_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones_plan" ADD CONSTRAINT "recomendaciones_plan_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrategias" ADD CONSTRAINT "estrategias_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_objetivos" ADD CONSTRAINT "historial_objetivos_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales_biblioteca" ADD CONSTRAINT "materiales_biblioteca_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_material" ADD CONSTRAINT "asignaciones_material_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_plan" ADD CONSTRAINT "asignaciones_plan_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantillas_email" ADD CONSTRAINT "plantillas_email_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_enviados" ADD CONSTRAINT "emails_enviados_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_conectadas" ADD CONSTRAINT "cuentas_conectadas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sincronizaciones_turno" ADD CONSTRAINT "sincronizaciones_turno_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas_ia" ADD CONSTRAINT "consultas_ia_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_comida" ADD CONSTRAINT "analisis_comida_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_consultorio" ADD CONSTRAINT "configuracion_consultorio_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_consultorio" ADD CONSTRAINT "configuracion_consultorio_logoArchivoId_fkey" FOREIGN KEY ("logoArchivoId") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "axiomas_nutricionales" ADD CONSTRAINT "axiomas_nutricionales_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Restricciones que Prisma no puede declarar en el schema y por eso van acá.
-- Si algún día se regenera el schema desde la base, NO se pierden: viven en
-- esta migración y en las siguientes.
-- ===========================================================================

-- [C-5] No solapamiento de turnos, garantizado por el motor.
--
-- Hasta ahora la regla se evaluaba leyendo en memoria y escribiendo después,
-- sin transacción: dos altas concurrentes producían turnos superpuestos.
-- `fecha` (DATE) y `hora` (TEXT) siguen siendo el dato —no cambia nada en la
-- entidad ni en la UI—; el rango se deriva de ellos como columna generada.
--
-- El rango es `tsrange` (hora local de pared) y no `tstzrange` a propósito:
--   1. una columna generada exige una expresión IMMUTABLE, y `AT TIME ZONE`
--      es STABLE (depende de la base de datos de husos horarios);
--   2. para detectar dos turnos superpuestos en UNA agenda, comparar la hora
--      de pared es exactamente la semántica correcta, y encima es inmune a
--      cambios de huso o de DST.
-- La hora se descompone con aritmética en vez de con `"hora"::time` porque
-- `time_in` es STABLE (su parseo depende de DateStyle) y una columna generada
-- exige IMMUTABLE. El CHECK de formato garantiza que el substring siempre
-- tenga algo válido que convertir.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "turnos" ADD CONSTRAINT "turnos_hora_formato"
  CHECK ("hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

ALTER TABLE "turnos" ADD COLUMN "periodo" tsrange
  GENERATED ALWAYS AS (
    tsrange(
      "fecha"
        + make_interval(hours => substring("hora" from 1 for 2)::int,
                        mins  => substring("hora" from 4 for 2)::int),
      "fecha"
        + make_interval(hours => substring("hora" from 1 for 2)::int,
                        mins  => substring("hora" from 4 for 2)::int + "duracionMinutos"),
      '[)'
    )
  ) STORED;

-- Los turnos CANCELADOS liberan el horario, así que quedan fuera del EXCLUDE.
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_sin_solapamiento"
  EXCLUDE USING gist (
    "nutricionistaId" WITH =,
    "periodo"         WITH &&
  ) WHERE ("estado" <> 'CANCELADO');

-- [M-1] El arco exclusivo de archivos ahora se cumple, no solo se documenta.
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_un_solo_dueno" CHECK (
  (("pacienteId"        IS NOT NULL)::int
 + ("laboratorioId"     IS NOT NULL)::int
 + ("comidaConsumidaId" IS NOT NULL)::int
 + ("recetaId"          IS NOT NULL)::int
 + ("materialId"        IS NOT NULL)::int) = 1
);

-- [M-7] "Un paciente tiene un solo plan activo": la regla de negocio, en la base.
CREATE UNIQUE INDEX "asignaciones_plan_una_activa_uk"
  ON "asignaciones_plan" ("pacienteId") WHERE "activa";

-- [C-4] Un inquilino vacío es un inquilino inexistente.
ALTER TABLE "nutricionistas" ADD CONSTRAINT "nutricionistas_id_no_vacio"
  CHECK (length(trim("id")) > 0);

-- [A-3] Formato del teléfono normalizado (E.164 sin "+").
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_telefono_e164_formato"
  CHECK ("telefonoE164" IS NULL OR "telefonoE164" ~ '^[1-9][0-9]{7,14}$');

-- [M-8] No leídos: índice parcial, se mantiene chico porque solo indexa lo pendiente.
CREATE INDEX "mensajes_no_leidos_idx" ON "mensajes" ("nutricionistaId", "conversacionId", "autorId")
  WHERE "leidoEn" IS NULL;

-- [M-14] Purga de tokens de recuperación vencidos.
CREATE INDEX "tokens_recuperacion_expira_idx" ON "tokens_recuperacion" ("expiraEn")
  WHERE "usadoEn" IS NULL;

-- [M-5] Filtro por etiqueta: el `has` de Prisma se traduce al operador @>.
CREATE INDEX "recetas_etiquetas_gin"    ON "recetas"               USING GIN ("etiquetas");
CREATE INDEX "materiales_etiquetas_gin" ON "materiales_biblioteca" USING GIN ("etiquetas");

-- [M-6] Búsqueda de pacientes por texto parcial (ILIKE '%x%' no usa un btree).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "pacientes_busqueda_trgm" ON "pacientes"
  USING GIN (("nombre" || ' ' || "apellido" || ' ' || "email") gin_trgm_ops);

-- [A-4] Listado de pacientes vigentes (el archivado es la excepción, no la regla).
CREATE INDEX "pacientes_vigentes_idx" ON "pacientes" ("nutricionistaId", "apellido", "nombre")
  WHERE "archivadoEn" IS NULL;
