-- CreateEnum
CREATE TYPE "AmbitoAxioma" AS ENUM ('SUENO', 'HIDRATACION', 'ACTIVIDAD', 'PESO', 'MACRO', 'GENERAL');

-- CreateEnum
CREATE TYPE "OperadorAxioma" AS ENUM ('MAYOR_IGUAL', 'MENOR_IGUAL', 'ENTRE', 'INFORMATIVO');

-- AlterTable
ALTER TABLE "comidas_consumidas" ADD COLUMN     "porcion" TEXT;

-- CreateTable
CREATE TABLE "configuracion_consultorio" (
    "id" TEXT NOT NULL,
    "turnoDuracionMinutos" INTEGER NOT NULL DEFAULT 30,
    "turnoPasoMinutos" INTEGER NOT NULL DEFAULT 15,
    "atencionHoraDesde" TEXT,
    "atencionHoraHasta" TEXT,
    "diasAtencion" INTEGER[],
    "nombreProfesional" TEXT,
    "matricula" TEXT,
    "logoArchivoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "axiomas_nutricionales" (
    "id" TEXT NOT NULL,
    "ambito" "AmbitoAxioma" NOT NULL,
    "parametro" TEXT NOT NULL,
    "operador" "OperadorAxioma" NOT NULL,
    "valor" DOUBLE PRECISION,
    "valorMax" DOUBLE PRECISION,
    "unidad" TEXT,
    "texto" TEXT NOT NULL,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "axiomas_nutricionales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "axiomas_nutricionales_activo_idx" ON "axiomas_nutricionales"("activo");

