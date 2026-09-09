-- Migración 28 — Las credenciales de integración pasan de columnas a filas
--
-- [A-6] de audits/AUDIT_MODELO_DATOS.md: `credenciales_integracion` era una
-- tabla ancha con un juego de columnas por proveedor. Las fases 15, 16 y 26
-- agregaron ocho columnas de secretos entre las tres, y cada integración nueva
-- era otro ALTER TABLE más un cambio en el DTO, el servicio y la UI.
--
-- Queda partida en dos:
--   * `credenciales_proveedor`  — una fila por secreto, con su fecha de rotación
--   * `preferencias_integracion` — lo que no es secreto (modelo de IA, criterios)
--
-- La interfaz de dominio (ICredencialesIntegracionRepositorio) no cambia, así
-- que los DTOs, los servicios y la UI de configuración quedan intactos.

-- ---------------------------------------------------------------------------
-- 1. Estructura nueva
-- ---------------------------------------------------------------------------
-- CreateEnum
CREATE TYPE "ProveedorIntegracion" AS ENUM ('ANTHROPIC', 'OPENROUTER', 'FATSECRET', 'WHATSAPP');

-- CreateTable
CREATE TABLE "credenciales_proveedor" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "proveedor" "ProveedorIntegracion" NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "rotadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credenciales_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_integracion" (
    "nutricionistaId" TEXT NOT NULL,
    "proveedorIA" TEXT,
    "modeloIA" TEXT,
    "excluirMarcas" BOOLEAN NOT NULL DEFAULT false,
    "requiereMacros" BOOLEAN NOT NULL DEFAULT false,
    "maxCaloriasPor100" DOUBLE PRECISION,
    "excluirTexto" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_integracion_pkey" PRIMARY KEY ("nutricionistaId")
);

-- CreateIndex
CREATE INDEX "credenciales_proveedor_proveedor_clave_valor_idx" ON "credenciales_proveedor"("proveedor", "clave", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "credenciales_proveedor_nutricionistaId_proveedor_clave_key" ON "credenciales_proveedor"("nutricionistaId", "proveedor", "clave");

-- AddForeignKey
ALTER TABLE "credenciales_proveedor" ADD CONSTRAINT "credenciales_proveedor_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_integracion" ADD CONSTRAINT "preferencias_integracion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Los secretos pasan de columnas a filas
-- ---------------------------------------------------------------------------
--
-- Los valores ya venían cifrados con la misma clave (AES-256-GCM,
-- TOKENS_SECRET): se copian tal cual, no hace falta re-cifrar nada.
--
-- La clave de IA vivía en una única columna reutilizada por los dos
-- proveedores, así que se le asigna el que el inquilino tenía elegido.
INSERT INTO "credenciales_proveedor" ("id", "nutricionistaId", "proveedor", "clave", "valor", "rotadoEn", "creadoEn")
SELECT gen_random_uuid()::text, c."nutricionistaId", v.proveedor::"ProveedorIntegracion", v.clave, v.valor, c."actualizadoEn", c."creadoEn"
FROM "credenciales_integracion" c
CROSS JOIN LATERAL (VALUES
  (CASE WHEN c."proveedorIA" = 'OPENROUTER' THEN 'OPENROUTER' ELSE 'ANTHROPIC' END,
                 'API_KEY',         c."anthropicApiKeyCifrada"),
  ('FATSECRET',  'CLIENT_ID',       c."fatsecretClientIdCifrado"),
  ('FATSECRET',  'CLIENT_SECRET',   c."fatsecretClientSecretCifrado"),
  ('WHATSAPP',   'TOKEN',           c."whatsappTokenCifrado"),
  -- En claro a propósito: es lo que identifica al inquilino cuando entra un
  -- webhook, antes de poder descifrar nada suyo.
  ('WHATSAPP',   'PHONE_NUMBER_ID', c."whatsappPhoneNumberId"),
  ('WHATSAPP',   'VERIFY_TOKEN',    c."whatsappVerifyTokenCifrado"),
  ('WHATSAPP',   'APP_SECRET',      c."whatsappAppSecretCifrado")
) AS v(proveedor, clave, valor)
WHERE v.valor IS NOT NULL;

-- Lo que no es secreto (modelo de IA y criterios de ingredientes) sale de la
-- tabla de credenciales: no tenía por qué compartir fila con los tokens.
INSERT INTO "preferencias_integracion" (
  "nutricionistaId", "proveedorIA", "modeloIA",
  "excluirMarcas", "requiereMacros", "maxCaloriasPor100", "excluirTexto",
  "creadoEn", "actualizadoEn")
SELECT c."nutricionistaId", c."proveedorIA", c."anthropicModelo",
       c."criterioExcluirMarcas", c."criterioRequiereMacros",
       c."criterioMaxCaloriasPor100", c."criterioExcluirTexto",
       c."creadoEn", c."actualizadoEn"
FROM "credenciales_integracion" c;

-- ---------------------------------------------------------------------------
-- 3. Fuera la tabla vieja
-- ---------------------------------------------------------------------------
-- DropForeignKey
ALTER TABLE "credenciales_integracion" DROP CONSTRAINT "credenciales_integracion_nutricionistaId_fkey";

-- DropTable
DROP TABLE "credenciales_integracion";

-- ---------------------------------------------------------------------------
-- 4. Limpieza: los DEFAULT de `actualizadoEn` solo hacían falta para poder
--    agregar la columna NOT NULL sobre filas existentes en la migración 27.
--    Prisma siempre manda el valor, así que el default sobra.
-- ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "actividades_fisicas" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alertas_alimentarias" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "alertas_seguimiento" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "antropometrias" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "comidas_consumidas" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "competencias" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "estrategias" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "laboratorios" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suplementos" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "turnos" ALTER COLUMN "actualizadoEn" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "materiales_etiquetas_gin" RENAME TO "materiales_biblioteca_etiquetas_idx";

-- RenameIndex
ALTER INDEX "recetas_etiquetas_gin" RENAME TO "recetas_etiquetas_idx";

-- RenameIndex
ALTER INDEX "retroalimentacion_insight_nutricionistaId_pacienteId_tipoInsigh" RENAME TO "retroalimentacion_insight_nutricionistaId_pacienteId_tipoIn_key";
