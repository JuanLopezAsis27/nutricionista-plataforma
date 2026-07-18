-- Fase 4: Objetivos & Estrategias + Biblioteca.
-- Objetivo (con auditoria HistorialObjetivo escrita por los casos de uso),
-- Estrategia (motivo obligatorio), MaterialBiblioteca (ARCHIVO|ENLACE) con
-- asignaciones a pacientes, y Archivo.materialId (dueno 1 a 1).

-- CreateEnum
CREATE TYPE "PrioridadObjetivo" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoObjetivo" AS ENUM ('EN_CURSO', 'CUMPLIDO', 'ABANDONADO');

-- CreateEnum
CREATE TYPE "EstadoEstrategia" AS ENUM ('ACTIVA', 'LOGRADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "TipoEventoObjetivo" AS ENUM ('CREACION', 'ACTUALIZACION', 'CAMBIO_ESTADO', 'ESTRATEGIA_AGREGADA', 'ESTRATEGIA_CAMBIO_ESTADO', 'ESTRATEGIA_ELIMINADA');

-- CreateEnum
CREATE TYPE "TipoMaterial" AS ENUM ('ARCHIVO', 'ENLACE');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "materialId" TEXT;

-- CreateTable
CREATE TABLE "objetivos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "prioridad" "PrioridadObjetivo" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoObjetivo" NOT NULL DEFAULT 'EN_CURSO',
    "fechaObjetivo" DATE,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estrategias" (
    "id" TEXT NOT NULL,
    "objetivoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoEstrategia" NOT NULL DEFAULT 'ACTIVA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estrategias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_objetivos" (
    "id" TEXT NOT NULL,
    "objetivoId" TEXT NOT NULL,
    "tipo" "TipoEventoObjetivo" NOT NULL,
    "detalle" TEXT NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales_biblioteca" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMaterial" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "url" TEXT,
    "categoria" TEXT,
    "etiquetas" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materiales_biblioteca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_material" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objetivos_pacienteId_estado_idx" ON "objetivos"("pacienteId", "estado");

-- CreateIndex
CREATE INDEX "estrategias_objetivoId_idx" ON "estrategias"("objetivoId");

-- CreateIndex
CREATE INDEX "historial_objetivos_objetivoId_creadoEn_idx" ON "historial_objetivos"("objetivoId", "creadoEn");

-- CreateIndex
CREATE INDEX "materiales_biblioteca_titulo_idx" ON "materiales_biblioteca"("titulo");

-- CreateIndex
CREATE INDEX "asignaciones_material_pacienteId_idx" ON "asignaciones_material"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_material_materialId_pacienteId_key" ON "asignaciones_material"("materialId", "pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "archivos_materialId_key" ON "archivos"("materialId");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales_biblioteca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estrategias" ADD CONSTRAINT "estrategias_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_objetivos" ADD CONSTRAINT "historial_objetivos_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_material" ADD CONSTRAINT "asignaciones_material_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales_biblioteca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_material" ADD CONSTRAINT "asignaciones_material_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
