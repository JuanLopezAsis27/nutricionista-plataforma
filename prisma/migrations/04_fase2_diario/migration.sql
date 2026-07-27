-- Fase 2: Diario del paciente.
-- Registro diario (peso autoreportado, agua, sueño, notas) con comidas
-- (foto opcional vía Archivo.comidaConsumidaId) y actividades físicas.

-- Enums
CREATE TYPE "CalidadSueno" AS ENUM ('MALA', 'REGULAR', 'BUENA');
CREATE TYPE "IntensidadActividad" AS ENUM ('BAJA', 'MODERADA', 'ALTA');

-- Registro diario (uno por paciente y fecha)
CREATE TABLE "registros_diarios" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "pesoKg" DECIMAL(5,2),
    "aguaMl" INTEGER,
    "horasSueno" DECIMAL(3,1),
    "calidadSueno" "CalidadSueno",
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_diarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registros_diarios_pacienteId_fecha_key"
    ON "registros_diarios"("pacienteId", "fecha");

ALTER TABLE "registros_diarios"
    ADD CONSTRAINT "registros_diarios_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comidas consumidas
CREATE TABLE "comidas_consumidas" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "franja" TEXT NOT NULL,
    "hora" TEXT,
    "descripcion" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comidas_consumidas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "comidas_consumidas_registroId_idx" ON "comidas_consumidas"("registroId");

ALTER TABLE "comidas_consumidas"
    ADD CONSTRAINT "comidas_consumidas_registroId_fkey"
    FOREIGN KEY ("registroId") REFERENCES "registros_diarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Actividades físicas
CREATE TABLE "actividades_fisicas" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL,
    "intensidad" "IntensidadActividad",
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actividades_fisicas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "actividades_fisicas_registroId_idx" ON "actividades_fisicas"("registroId");

ALTER TABLE "actividades_fisicas"
    ADD CONSTRAINT "actividades_fisicas_registroId_fkey"
    FOREIGN KEY ("registroId") REFERENCES "registros_diarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Archivo: dueño de Fase 2 (foto de comida, 1 a 1)
ALTER TABLE "archivos" ADD COLUMN "comidaConsumidaId" TEXT;

CREATE UNIQUE INDEX "archivos_comidaConsumidaId_key" ON "archivos"("comidaConsumidaId");

ALTER TABLE "archivos"
    ADD CONSTRAINT "archivos_comidaConsumidaId_fkey"
    FOREIGN KEY ("comidaConsumidaId") REFERENCES "comidas_consumidas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
