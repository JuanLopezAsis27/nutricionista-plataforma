-- Fase 0: modelo Archivo (metadatos de objetos en el bucket S3-compatible).
-- Las FKs hacia los dueños (laboratorio, receta, etc.) se agregan en las fases
-- que introducen cada dueño.

CREATE TABLE "archivos" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombreOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "titulo" TEXT,
    "categoria" TEXT,
    "subidoPorId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "archivos_clave_key" ON "archivos"("clave");
