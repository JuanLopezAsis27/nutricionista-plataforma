-- Las claves de IA pasan de cada consultorio a la PLATAFORMA.
--
-- Hasta acá cada nutricionista cargaba su propia clave de Anthropic, OpenRouter
-- u OpenAI. Ahora las carga el SUPERADMIN una sola vez para todos, y lo único
-- que queda por consultorio son los prompts (`prompts_ia`).
--
-- Las claves por consultorio se BORRAN, no se migran: son de cuentas ajenas a
-- la plataforma, y copiar la de un profesional como clave global haría que
-- todos los consultorios gastaran a cuenta de él.

CREATE TABLE "configuracion_ia_global" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "claveAnthropic" TEXT,
    "claveOpenRouter" TEXT,
    "claveOpenAI" TEXT,
    "proveedorIA" TEXT,
    "modeloIA" TEXT,
    "proveedorTranscripcion" TEXT,
    "modeloTranscripcion" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_ia_global_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registros_uso_ia" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT,
    "capacidad" TEXT NOT NULL,
    "proveedor" "ProveedorIntegracion" NOT NULL,
    "modelo" TEXT NOT NULL,
    "operacion" TEXT NOT NULL,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "costoUsd" DOUBLE PRECISION,
    "exito" BOOLEAN NOT NULL,
    "error" TEXT,
    "duracionMs" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_uso_ia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registros_uso_ia_creadoEn_idx" ON "registros_uso_ia"("creadoEn");
CREATE INDEX "registros_uso_ia_nutricionistaId_creadoEn_idx" ON "registros_uso_ia"("nutricionistaId", "creadoEn");

ALTER TABLE "registros_uso_ia"
  ADD CONSTRAINT "registros_uso_ia_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Las claves de IA y de voz a texto de cada consultorio. WhatsApp se queda:
-- esa sí es una cuenta del profesional.
DELETE FROM "credenciales_proveedor"
WHERE "proveedor" IN ('ANTHROPIC', 'OPENROUTER', 'OPENAI');

ALTER TABLE "preferencias_integracion"
  DROP COLUMN "proveedorIA",
  DROP COLUMN "modeloIA",
  DROP COLUMN "proveedorTranscripcion",
  DROP COLUMN "modeloTranscripcion";
