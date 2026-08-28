-- Migración 29 — Composición corporal (perfil ISAK completo + objetivos)
--
-- `antropometrias` guardaba peso, talla, 8 pliegues y 6 circunferencias: lo
-- justo para la Σ de pliegues y la curva de peso. El fraccionamiento en 5
-- masas de Kerr, el somatotipo de Heath & Carter y el perfil Phantom que ahora
-- calcula el dominio necesitan además la talla sentado, los 6 diámetros óseos
-- y 5 perímetros más.
--
-- Todo lo nuevo es NULLABLE a propósito: las mediciones históricas siguen
-- siendo válidas y el cálculo degrada por bloques (informa qué falta medir en
-- vez de fallar).
--
-- `sexo` va en el paciente porque no cambia entre consultas; `nivelActividad`
-- va en la medición porque sí cambia. Ninguna de las dos es obligatoria: sin
-- sexo no hay fraccionamiento ni metabolismo, y el dominio lo informa.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
-- CreateEnum
CREATE TYPE "SexoBiologico" AS ENUM ('MASCULINO', 'FEMENINO');

-- CreateEnum
CREATE TYPE "NivelActividadFisica" AS ENUM ('SEDENTARIA', 'LIVIANA', 'MODERADA', 'INTENSA', 'EXTREMADA');

-- CreateEnum
CREATE TYPE "VariableComposicion" AS ENUM ('PESO', 'MASA_ADIPOSA_KG', 'MASA_ADIPOSA_PORCENTAJE', 'MASA_MUSCULAR_KG', 'MASA_MUSCULAR_PORCENTAJE', 'SUMATORIA_6_PLIEGUES', 'IMC', 'INDICE_CINTURA_CADERA', 'PERIMETRO_CINTURA');

-- ---------------------------------------------------------------------------
-- 2. Sexo biológico del paciente
-- ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "pacientes" ADD COLUMN "sexo" "SexoBiologico";

-- ---------------------------------------------------------------------------
-- 3. Perfil ISAK completo en la medición
-- ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "antropometrias"
    ADD COLUMN "tallaSentadoCm" DECIMAL(5,1),
    ADD COLUMN "nivelActividad" "NivelActividadFisica",
    ADD COLUMN "diamBiacromial" DECIMAL(4,1),
    ADD COLUMN "diamToraxTransverso" DECIMAL(4,1),
    ADD COLUMN "diamToraxAnteroposterior" DECIMAL(4,1),
    ADD COLUMN "diamBiiliocrestideo" DECIMAL(4,1),
    ADD COLUMN "diamHumeral" DECIMAL(4,1),
    ADD COLUMN "diamFemoral" DECIMAL(4,1),
    ADD COLUMN "circCabeza" DECIMAL(5,1),
    ADD COLUMN "circAntebrazo" DECIMAL(5,1),
    ADD COLUMN "circMusloMaximo" DECIMAL(5,1),
    ADD COLUMN "circMusloMedial" DECIMAL(5,1),
    ADD COLUMN "circPantorrilla" DECIMAL(5,1);

-- ---------------------------------------------------------------------------
-- 4. Objetivos de composición corporal
-- ---------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "objetivos_composicion" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "variable" "VariableComposicion" NOT NULL,
    "valorObjetivo" DECIMAL(7,2) NOT NULL,
    "fechaObjetivo" DATE,
    "estado" "EstadoObjetivo" NOT NULL DEFAULT 'EN_CURSO',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objetivos_composicion_pkey" PRIMARY KEY ("id")
);

-- Una sola meta por paciente y variable: dos objetivos contradictorios sobre
-- la misma variable no tienen sentido clínico y romperían la proyección.
-- CreateIndex
CREATE UNIQUE INDEX "objetivos_composicion_pacienteId_variable_key" ON "objetivos_composicion"("pacienteId", "variable");

-- CreateIndex
CREATE INDEX "objetivos_composicion_nutricionistaId_pacienteId_estado_idx" ON "objetivos_composicion"("nutricionistaId", "pacienteId", "estado");

-- AddForeignKey
ALTER TABLE "objetivos_composicion" ADD CONSTRAINT "objetivos_composicion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos_composicion" ADD CONSTRAINT "objetivos_composicion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
