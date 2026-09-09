-- CreateEnum
CREATE TYPE "NivelDeportivo" AS ENUM ('RECREATIVO', 'AMATEUR', 'COMPETITIVO', 'ELITE');

-- CreateEnum
CREATE TYPE "FaseTemporada" AS ENUM ('PRETEMPORADA', 'COMPETENCIA', 'TRANSICION', 'DESCANSO');

-- CreateEnum
CREATE TYPE "ImportanciaCompetencia" AS ENUM ('A', 'B', 'C');

-- CreateTable
CREATE TABLE "perfiles_deportivos" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "pacienteId" TEXT NOT NULL,
    "deporte" TEXT NOT NULL,
    "disciplina" TEXT,
    "nivel" "NivelDeportivo" NOT NULL DEFAULT 'AMATEUR',
    "fase" "FaseTemporada" NOT NULL DEFAULT 'PRETEMPORADA',
    "diasEntrenamientoSemana" INTEGER,
    "horasSemana" DECIMAL(4,1),
    "pesoCategoriaKg" DECIMAL(5,2),
    "posicion" TEXT,
    "objetivo" TEXT,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_deportivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencias" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "pacienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "lugar" TEXT,
    "objetivo" TEXT,
    "resultado" TEXT,
    "importancia" "ImportanciaCompetencia" NOT NULL DEFAULT 'B',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_deportivos_pacienteId_key" ON "perfiles_deportivos"("pacienteId");

-- CreateIndex
CREATE INDEX "perfiles_deportivos_nutricionistaId_idx" ON "perfiles_deportivos"("nutricionistaId");

-- CreateIndex
CREATE INDEX "competencias_pacienteId_fecha_idx" ON "competencias"("pacienteId", "fecha");

-- CreateIndex
CREATE INDEX "competencias_nutricionistaId_idx" ON "competencias"("nutricionistaId");

-- AddForeignKey
ALTER TABLE "perfiles_deportivos" ADD CONSTRAINT "perfiles_deportivos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencias" ADD CONSTRAINT "competencias_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


