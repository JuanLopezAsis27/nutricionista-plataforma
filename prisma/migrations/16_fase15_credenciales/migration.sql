-- Fase 15: credenciales de integración por profesional (Claude, FatSecret),
-- guardadas cifradas. Una fila por inquilino.

CREATE TABLE "credenciales_integracion" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL DEFAULT '',
    "anthropicApiKeyCifrada" TEXT,
    "anthropicModelo" TEXT,
    "fatsecretClientIdCifrado" TEXT,
    "fatsecretClientSecretCifrado" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "credenciales_integracion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "credenciales_integracion_nutricionistaId_key"
    ON "credenciales_integracion"("nutricionistaId");
