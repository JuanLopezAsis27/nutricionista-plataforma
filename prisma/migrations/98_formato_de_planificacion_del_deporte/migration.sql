-- Migración 98 — Cada deporte dice qué planificación deportiva le corresponde.
--
-- La lista de deportes (migración 97) suma `formatoPlanificacion`: el tipo de
-- planificación y, dentro del tipo, con qué arranca. Hoy hay dos, los dos de
-- carrera: de calle (running) y de trail. Null = todavía no hay
-- planificación para ese deporte, y la ficha del paciente no la ofrece.
--
-- Lo administra el SUPERADMIN junto con el resto de la lista. Acá se dejan
-- puestos los obvios: Running y Atletismo (que en la consulta suele ser
-- calle: maratón, 10K) → calle; Trail running → trail. Se busca por
-- `claveNombre`: si alguno ya se renombró, se completa desde /admin.

CREATE TYPE "FormatoPlanificacion" AS ENUM ('CARRERA_CALLE', 'CARRERA_TRAIL');

ALTER TABLE "deportes" ADD COLUMN "formatoPlanificacion" "FormatoPlanificacion";

UPDATE "deportes" SET "formatoPlanificacion" = 'CARRERA_CALLE'
WHERE "claveNombre" IN ('running', 'atletismo');

UPDATE "deportes" SET "formatoPlanificacion" = 'CARRERA_TRAIL'
WHERE "claveNombre" = 'trail running';
