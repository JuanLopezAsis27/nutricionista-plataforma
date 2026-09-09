-- Recuperación de contraseña: token de un solo uso (se guarda solo el hash).
-- No es tabla de inquilino (los usuarios son globales; el flujo corre global).
CREATE TABLE "tokens_recuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tokens_recuperacion_tokenHash_key" ON "tokens_recuperacion"("tokenHash");

CREATE INDEX "tokens_recuperacion_usuarioId_idx" ON "tokens_recuperacion"("usuarioId");

ALTER TABLE "tokens_recuperacion" ADD CONSTRAINT "tokens_recuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
