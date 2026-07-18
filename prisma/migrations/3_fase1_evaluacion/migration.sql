-- Fase 1: Evaluación Integral.
-- Historia clínica, alertas alimentarias, laboratorios (con adjuntos) y
-- antropometría (planilla del profesional). Suma dueños al modelo Archivo
-- (pacienteId, laboratorioId) y el flag Paciente.activo.

-- Enums
CREATE TYPE "TipoAlertaAlimentaria" AS ENUM ('ALERGIA', 'INTOLERANCIA', 'RESTRICCION');
CREATE TYPE "SeveridadAlerta" AS ENUM ('LEVE', 'MODERADA', 'SEVERA');

-- Paciente: flag de actividad (estadísticas y archivado lógico)
ALTER TABLE "pacientes" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- Historia clínica (1 a 1 con paciente)
CREATE TABLE "historias_clinicas" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "motivoConsulta" TEXT,
    "diagnosticos" TEXT,
    "medicacion" TEXT,
    "antecedentesPersonales" TEXT,
    "antecedentesFamiliares" TEXT,
    "habitos" TEXT,
    "contexto" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historias_clinicas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "historias_clinicas_pacienteId_key" ON "historias_clinicas"("pacienteId");

ALTER TABLE "historias_clinicas"
    ADD CONSTRAINT "historias_clinicas_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Alertas alimentarias
CREATE TABLE "alertas_alimentarias" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" "TipoAlertaAlimentaria" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" "SeveridadAlerta" NOT NULL DEFAULT 'MODERADA',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_alimentarias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alertas_alimentarias_pacienteId_idx" ON "alertas_alimentarias"("pacienteId");

ALTER TABLE "alertas_alimentarias"
    ADD CONSTRAINT "alertas_alimentarias_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Laboratorios
CREATE TABLE "laboratorios" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratorios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "laboratorios_pacienteId_fecha_idx" ON "laboratorios"("pacienteId", "fecha");

ALTER TABLE "laboratorios"
    ADD CONSTRAINT "laboratorios_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Antropometrías (planilla del profesional)
CREATE TABLE "antropometrias" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "pesoKg" DECIMAL(5,2) NOT NULL,
    "tallaCm" DECIMAL(5,1),
    "pliegueTricipital" DECIMAL(4,1),
    "pliegueSubescapular" DECIMAL(4,1),
    "pliegueSupraespinal" DECIMAL(4,1),
    "pliegueAbdominal" DECIMAL(4,1),
    "pliegueMuslo" DECIMAL(4,1),
    "plieguePantorrilla" DECIMAL(4,1),
    "pliegueBicipital" DECIMAL(4,1),
    "pliegueCrestaIliaca" DECIMAL(4,1),
    "circTorax" DECIMAL(5,1),
    "circCinturaMinima" DECIMAL(5,1),
    "circCinturaMaxima" DECIMAL(5,1),
    "circCadera" DECIMAL(5,1),
    "circBrazo" DECIMAL(5,1),
    "circBrazoContraido" DECIMAL(5,1),
    "kgGrasa" DECIMAL(5,2),
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "antropometrias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "antropometrias_pacienteId_fecha_key" ON "antropometrias"("pacienteId", "fecha");

ALTER TABLE "antropometrias"
    ADD CONSTRAINT "antropometrias_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Archivo: dueños de Fase 1
ALTER TABLE "archivos" ADD COLUMN "pacienteId" TEXT;
ALTER TABLE "archivos" ADD COLUMN "laboratorioId" TEXT;

CREATE INDEX "archivos_pacienteId_idx" ON "archivos"("pacienteId");
CREATE INDEX "archivos_laboratorioId_idx" ON "archivos"("laboratorioId");

ALTER TABLE "archivos"
    ADD CONSTRAINT "archivos_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "archivos"
    ADD CONSTRAINT "archivos_laboratorioId_fkey"
    FOREIGN KEY ("laboratorioId") REFERENCES "laboratorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
