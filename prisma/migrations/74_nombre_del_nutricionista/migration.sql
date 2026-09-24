-- Migración 74 — El nombre del profesional pasa a la tabla de inquilinos.
--
-- Vivía en `configuracion_consultorio."nombreProfesional"`, nullable y en una
-- fila que un consultorio puede no tener: la base no podía garantizar que
-- todo nutricionista tuviera nombre, y el alta lo escribía en un paso aparte
-- (el aprovisionamiento) que podía fallar dejando la cuenta sin él. Es
-- IDENTIDAD del inquilino, no una preferencia de configuración.
--
-- 1) Se agrega `nutricionistas.nombre`.
-- 2) Se rellena con el que ya estaba cargado en la configuración.
-- 3) Los que no tenían ninguno reciben uno PROVISIONAL, «Nutricionista», que el
--    profesional corrige en Configuración. Es lo que ya veían sus pacientes
--    («tu nutricionista») y no inventa un nombre de persona.
-- 4) NOT NULL, y se borra la columna vieja: dos fuentes del mismo dato
--    terminan diciendo cosas distintas.

ALTER TABLE "nutricionistas" ADD COLUMN "nombre" TEXT;

UPDATE "nutricionistas" n
SET "nombre" = TRIM(c."nombreProfesional")
FROM "configuracion_consultorio" c
WHERE c."nutricionistaId" = n."id"
  AND NULLIF(TRIM(c."nombreProfesional"), '') IS NOT NULL;

UPDATE "nutricionistas" SET "nombre" = 'Nutricionista' WHERE "nombre" IS NULL;

ALTER TABLE "nutricionistas" ALTER COLUMN "nombre" SET NOT NULL;

ALTER TABLE "configuracion_consultorio" DROP COLUMN "nombreProfesional";
