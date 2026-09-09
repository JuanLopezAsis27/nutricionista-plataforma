-- El asistente del PACIENTE pasa a tener chats guardados (migración 46).
--
-- El portal guardaba cada pregunta y su respuesta sueltas en `consultas_ia`,
-- sin hilo que las uniera. Eso dejaba dos agujeros: el modelo recibía cada
-- pregunta aislada —así que un «¿y con qué lo acompaño?» no tenía a qué
-- referirse— y la pantalla no tenía chats que ofrecer, solo una lista plana
-- que crecía para siempre.
--
-- `conversaciones_ia` ya resolvía las dos cosas para el profesional. Acá se le
-- suma `pacienteId`: NULL sigue siendo el chat analítico del consultorio y con
-- valor es el chat de ese paciente en su portal. Es la misma conversación con
-- el mismo modelo de turnos; separarlas en dos tablas habría duplicado tabla,
-- entidad, repositorio y casos de uso para cambiar una columna.
--
-- Las consultas ya guardadas NO se pierden: se convierten en un chat por
-- paciente antes de borrar la tabla, y cada pregunta y cada respuesta quedan
-- como los dos turnos que siempre fueron. Si esa copia fallara, la migración
-- entera se revierte y `consultas_ia` queda intacta.

ALTER TABLE "conversaciones_ia" ADD COLUMN "pacienteId" TEXT;

ALTER TABLE "conversaciones_ia"
  ADD CONSTRAINT "conversaciones_ia_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- El índice pasa a llevar el paciente: las dos listas que existen ahora son
-- «los chats del consultorio» (pacienteId IS NULL) y «los de este paciente».
DROP INDEX "conversaciones_ia_nutricionistaId_actualizadoEn_idx";
CREATE INDEX "conversaciones_ia_nutricionistaId_pacienteId_actualizadoEn_idx"
  ON "conversaciones_ia" ("nutricionistaId", "pacienteId", "actualizadoEn");

-- --- Las consultas viejas se convierten en un chat por paciente -------------

-- Un chat por (consultorio, paciente), titulado con su PRIMERA pregunta —el
-- mismo criterio que usa la entidad al abrir uno nuevo, cortado a 80
-- caracteres—. `creadoEn` y `actualizadoEn` toman las puntas de la serie para
-- que el chat quede ordenado donde corresponde y no arriba de todo.
CREATE TEMP TABLE "chats_migrados" AS
SELECT
  gen_random_uuid()::text AS "id",
  c."nutricionistaId",
  c."pacienteId",
  left(
    (ARRAY_AGG(c."pregunta" ORDER BY c."creadoEn", c."id"))[1],
    80
  ) AS "titulo",
  MIN(c."creadoEn") AS "creadoEn",
  MAX(c."creadoEn") AS "actualizadoEn"
FROM "consultas_ia" c
GROUP BY c."nutricionistaId", c."pacienteId";

INSERT INTO "conversaciones_ia"
  ("id", "nutricionistaId", "pacienteId", "titulo", "creadoEn", "actualizadoEn")
SELECT "id", "nutricionistaId", "pacienteId", "titulo", "creadoEn", "actualizadoEn"
FROM "chats_migrados";

-- Cada consulta son DOS turnos: la pregunta y la respuesta. La respuesta va un
-- milisegundo después para que el orden por `creadoEn` —el que usa el
-- repositorio al releer el chat— no las pueda intercalar al revés.
INSERT INTO "mensajes_ia"
  ("id", "nutricionistaId", "conversacionId", "rol", "contenido", "creadoEn")
SELECT
  gen_random_uuid()::text,
  c."nutricionistaId",
  ch."id",
  'USUARIO'::"RolMensajeIA",
  c."pregunta",
  c."creadoEn"
FROM "consultas_ia" c
JOIN "chats_migrados" ch
  ON ch."nutricionistaId" = c."nutricionistaId"
 AND ch."pacienteId" = c."pacienteId";

INSERT INTO "mensajes_ia"
  ("id", "nutricionistaId", "conversacionId", "rol", "contenido", "creadoEn")
SELECT
  gen_random_uuid()::text,
  c."nutricionistaId",
  ch."id",
  'ASISTENTE'::"RolMensajeIA",
  c."respuesta",
  c."creadoEn" + INTERVAL '1 millisecond'
FROM "consultas_ia" c
JOIN "chats_migrados" ch
  ON ch."nutricionistaId" = c."nutricionistaId"
 AND ch."pacienteId" = c."pacienteId";

DROP TABLE "consultas_ia";
