-- Fase 3: Recetario + Planes Nutricionales v2.
-- Crea el recetario (recetas + asignaciones) y el nuevo modelo de planes
-- (plan → franjas → opciones, equivalencias, recomendaciones, asignaciones),
-- agrega Archivo.recetaId, y COPIA los datos del módulo Dietas al de Planes
-- reutilizando los mismos ids. Las tablas de Dietas se ELIMINAN en la
-- migración de cierre de fase (6_fase3_drop_dietas), no acá: así el copiado
-- es verificable antes de perder el origen.

-- ===========================================================================
-- 1. DDL (idéntico al diff de Prisma schema → base)
-- ===========================================================================

-- CreateEnum
CREATE TYPE "TipoRecomendacionPlan" AS ENUM ('NUTRICIONAL', 'SALUD');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "recetaId" TEXT;

-- CreateTable
CREATE TABLE "recetas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "porciones" INTEGER,
    "preparacion" TEXT,
    "ingredientes" TEXT[],
    "etiquetas" TEXT[],
    "calorias" INTEGER,
    "proteinasG" DECIMAL(6,1),
    "carbohidratosG" DECIMAL(6,1),
    "grasasG" DECIMAL(6,1),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_receta" (
    "id" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_nutricionales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esPlantilla" BOOLEAN NOT NULL DEFAULT false,
    "planOrigenId" TEXT,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "caloriasMeta" INTEGER,
    "proteinasMetaG" DECIMAL(6,1),
    "carbohidratosMetaG" DECIMAL(6,1),
    "grasasMetaG" DECIMAL(6,1),
    "contactosUtiles" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_nutricionales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comidas_plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horaDesde" TEXT,
    "horaHasta" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "comidas_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones_comida" (
    "id" TEXT NOT NULL,
    "comidaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "contenido" TEXT NOT NULL,
    "recetaId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "opciones_comida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equivalencias_plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "equivalencias_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendaciones_plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tipo" "TipoRecomendacionPlan" NOT NULL DEFAULT 'NUTRICIONAL',
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recomendaciones_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_plan" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recetas_nombre_idx" ON "recetas"("nombre");

-- CreateIndex
CREATE INDEX "asignaciones_receta_pacienteId_idx" ON "asignaciones_receta"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_receta_recetaId_pacienteId_key" ON "asignaciones_receta"("recetaId", "pacienteId");

-- CreateIndex
CREATE INDEX "planes_nutricionales_esPlantilla_idx" ON "planes_nutricionales"("esPlantilla");

-- CreateIndex
CREATE INDEX "comidas_plan_planId_idx" ON "comidas_plan"("planId");

-- CreateIndex
CREATE INDEX "opciones_comida_comidaId_idx" ON "opciones_comida"("comidaId");

-- CreateIndex
CREATE INDEX "opciones_comida_recetaId_idx" ON "opciones_comida"("recetaId");

-- CreateIndex
CREATE INDEX "equivalencias_plan_planId_idx" ON "equivalencias_plan"("planId");

-- CreateIndex
CREATE INDEX "recomendaciones_plan_planId_idx" ON "recomendaciones_plan"("planId");

-- CreateIndex
CREATE INDEX "asignaciones_plan_pacienteId_idx" ON "asignaciones_plan"("pacienteId");

-- CreateIndex
CREATE INDEX "asignaciones_plan_planId_idx" ON "asignaciones_plan"("planId");

-- CreateIndex
CREATE INDEX "archivos_recetaId_idx" ON "archivos"("recetaId");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_receta" ADD CONSTRAINT "asignaciones_receta_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_receta" ADD CONSTRAINT "asignaciones_receta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comidas_plan" ADD CONSTRAINT "comidas_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_comida" ADD CONSTRAINT "opciones_comida_comidaId_fkey" FOREIGN KEY ("comidaId") REFERENCES "comidas_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_comida" ADD CONSTRAINT "opciones_comida_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "recetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equivalencias_plan" ADD CONSTRAINT "equivalencias_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendaciones_plan" ADD CONSTRAINT "recomendaciones_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_plan" ADD CONSTRAINT "asignaciones_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_plan" ADD CONSTRAINT "asignaciones_plan_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- 2. Copiado de datos Dietas → Planes (reutilizando los mismos ids)
-- ===========================================================================

-- 2a. Cada dieta se convierte en un plan PLANTILLA (mismo id, mismo nombre).
INSERT INTO "planes_nutricionales"
    ("id", "nombre", "descripcion", "esPlantilla", "archivado", "creadoEn", "actualizadoEn")
SELECT
    d."id",
    d."nombre",
    d."descripcion",
    true,           -- las dietas existentes pasan a ser plantillas reutilizables
    false,
    d."creadoEn",
    d."creadoEn"
FROM "dietas" d;

-- 2b. Cada tipo de comida distinto dentro de una dieta se vuelve una franja
--     (ComidaPlan) con horario por defecto. Id determinístico md5(dietaId:tipo)
--     para poder enganchar las opciones sin tabla temporal.
INSERT INTO "comidas_plan"
    ("id", "planId", "nombre", "horaDesde", "horaHasta", "orden")
SELECT
    md5(c."dietaId" || ':' || c."tipo"::text),
    c."dietaId",
    CASE c."tipo"::text
        WHEN 'DESAYUNO' THEN 'Desayuno'
        WHEN 'ALMUERZO' THEN 'Almuerzo'
        WHEN 'MERIENDA' THEN 'Merienda'
        WHEN 'CENA'     THEN 'Cena'
        ELSE c."tipo"::text
    END,
    CASE c."tipo"::text
        WHEN 'DESAYUNO' THEN '08:00'
        WHEN 'ALMUERZO' THEN '12:30'
        WHEN 'MERIENDA' THEN '17:00'
        WHEN 'CENA'     THEN '21:00'
        ELSE NULL
    END,
    CASE c."tipo"::text
        WHEN 'DESAYUNO' THEN '09:00'
        WHEN 'ALMUERZO' THEN '13:30'
        WHEN 'MERIENDA' THEN '17:30'
        WHEN 'CENA'     THEN '22:00'
        ELSE NULL
    END,
    CASE c."tipo"::text
        WHEN 'DESAYUNO' THEN 1
        WHEN 'ALMUERZO' THEN 2
        WHEN 'MERIENDA' THEN 3
        WHEN 'CENA'     THEN 4
        ELSE 5
    END
FROM (SELECT DISTINCT "dietaId", "tipo" FROM "comidas") c;

-- 2c. Cada comida vieja pasa a ser una opción numerada de su franja (mismo id).
--     Las calorías, si existían, se anexan al texto del contenido.
INSERT INTO "opciones_comida"
    ("id", "comidaId", "numero", "contenido", "orden")
SELECT
    c."id",
    md5(c."dietaId" || ':' || c."tipo"::text),
    ROW_NUMBER() OVER (PARTITION BY c."dietaId", c."tipo" ORDER BY c."id"),
    c."descripcion"
        || CASE WHEN c."calorias" IS NOT NULL
                THEN ' (~' || c."calorias"::text || ' kcal)'
                ELSE '' END,
    ROW_NUMBER() OVER (PARTITION BY c."dietaId", c."tipo" ORDER BY c."id") - 1
FROM "comidas" c;

-- 2d. Las asignaciones dieta→paciente pasan a asignaciones plan→paciente
--     (mismo id; el plan tiene el mismo id que la dieta de origen).
INSERT INTO "asignaciones_plan"
    ("id", "planId", "pacienteId", "fechaInicio", "fechaFin", "activa", "creadoEn")
SELECT
    a."id",
    a."dietaId",
    a."pacienteId",
    a."fechaInicio",
    a."fechaFin",
    a."activa",
    CURRENT_TIMESTAMP
FROM "asignaciones_dieta" a;
