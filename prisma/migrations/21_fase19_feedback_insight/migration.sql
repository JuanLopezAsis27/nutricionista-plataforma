-- Fase 19: loop de feedback — correcciones del profesional sobre los insights.
CREATE TABLE "retroalimentacion_insight" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "pacienteId" TEXT NOT NULL,
    "tipoInsight" TEXT NOT NULL,
    "util" BOOLEAN NOT NULL,
    "detalle" TEXT NOT NULL,
    "comentario" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "retroalimentacion_insight_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retroalimentacion_insight_nutricionistaId_pacienteId_tipoInsight_key" ON "retroalimentacion_insight"("nutricionistaId", "pacienteId", "tipoInsight");
