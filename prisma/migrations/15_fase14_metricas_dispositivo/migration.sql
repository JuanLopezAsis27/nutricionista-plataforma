-- Fase 14: métricas de dispositivos (wearables). Datos diarios importados de
-- Apple Watch / Health Connect, con opt-in por día (columna `incluir`).

CREATE TYPE "FuenteMetrica" AS ENUM ('APPLE_WATCH', 'HEALTH_CONNECT', 'MANUAL');

CREATE TABLE "metricas_dispositivo" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "fuente" "FuenteMetrica" NOT NULL DEFAULT 'MANUAL',
    "pasos" INTEGER,
    "minutosActividad" INTEGER,
    "caloriasActivas" INTEGER,
    "frecuenciaCardiacaReposo" INTEGER,
    "horasSueno" DECIMAL(3,1),
    "incluir" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "metricas_dispositivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "metricas_dispositivo_pacienteId_fecha_fuente_key"
    ON "metricas_dispositivo"("pacienteId", "fecha", "fuente");
CREATE INDEX "metricas_dispositivo_pacienteId_fecha_idx"
    ON "metricas_dispositivo"("pacienteId", "fecha");
CREATE INDEX "metricas_dispositivo_nutricionistaId_idx"
    ON "metricas_dispositivo"("nutricionistaId");

ALTER TABLE "metricas_dispositivo"
    ADD CONSTRAINT "metricas_dispositivo_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
