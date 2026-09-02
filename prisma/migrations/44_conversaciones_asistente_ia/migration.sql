-- Chats del profesional con el asistente analítico (migración 44).
--
-- El asistente no recordaba nada —cada pregunta viajaba sola al modelo— y las
-- consultas no quedaban registradas. Guardar los turnos resuelve las dos cosas:
-- son el historial que se puede releer Y el contexto de la próxima pregunta.
--
-- Es del CONSULTORIO, no de un paciente: una consulta analítica puede cruzar
-- varios. El historial por paciente del portal sigue en `consultas_ia`.

CREATE TYPE "RolMensajeIA" AS ENUM ('USUARIO', 'ASISTENTE');

CREATE TABLE "conversaciones_ia" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversaciones_ia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mensajes_ia" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "conversacionId" TEXT NOT NULL,
  "rol" "RolMensajeIA" NOT NULL,
  "contenido" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mensajes_ia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversaciones_ia_nutricionistaId_actualizadoEn_idx"
  ON "conversaciones_ia" ("nutricionistaId", "actualizadoEn");
CREATE INDEX "mensajes_ia_conversacionId_creadoEn_idx"
  ON "mensajes_ia" ("conversacionId", "creadoEn");

ALTER TABLE "conversaciones_ia"
  ADD CONSTRAINT "conversaciones_ia_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Borrar la conversación se lleva sus turnos: no son nada por separado.
ALTER TABLE "mensajes_ia"
  ADD CONSTRAINT "mensajes_ia_conversacionId_fkey"
  FOREIGN KEY ("conversacionId") REFERENCES "conversaciones_ia" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mensajes_ia"
  ADD CONSTRAINT "mensajes_ia_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
