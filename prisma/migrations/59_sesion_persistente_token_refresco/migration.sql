-- Migración 59 — Sesión persistente con token de refresco
--
-- Permite emitir una sesión nueva sin volver a pedir la contraseña. Se guarda
-- SOLO el hash (SHA-256) del token, como en `tokens_recuperacion`, y tampoco es
-- tabla de inquilino: los usuarios son globales y el flujo corre con alcance
-- global, igual que el login.
--
-- `familia` es la cadena de rotaciones nacidas de un mismo login: cada canje
-- consume el token y emite otro de la misma familia. Si aparece un token ya
-- usado, es reutilización (señal de robo) y se revoca la familia entera.
CREATE TABLE "tokens_refresco" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "revocadoEn" TIMESTAMP(3),
    "dispositivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_refresco_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tokens_refresco_tokenHash_key" ON "tokens_refresco"("tokenHash");

CREATE INDEX "tokens_refresco_usuarioId_idx" ON "tokens_refresco"("usuarioId");

-- Por este índice entra la revocación de la cadena completa ante una
-- reutilización, que es el camino caliente de la detección de robo.
CREATE INDEX "tokens_refresco_familia_idx" ON "tokens_refresco"("familia");

ALTER TABLE "tokens_refresco" ADD CONSTRAINT "tokens_refresco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
