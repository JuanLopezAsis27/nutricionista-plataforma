-- Migración 97 — El deporte del perfil deportivo pasa de texto libre a una
-- lista de la plataforma.
--
-- Hasta acá `perfiles_deportivos.deporte` era lo que tipeara el profesional
-- («Atletismo», «atletismo», «running calle»…). Ahora:
--
--   * los deportes viven en `deportes`, SIN inquilino, como
--     `categorias_alimento_base`: los administra el SUPERADMIN (crear,
--     renombrar, borrar) y los eligen todos los consultorios. No hay deportes
--     propios de un consultorio;
--   * el perfil apunta a uno (`deporteId`, obligatorio). RESTRICT: un deporte
--     en uso no se borra, se renombra.
--
-- Lo que ya estaba cargado no se pierde: cada texto distinto que no sea uno
-- de la lista inicial se convierte en un deporte más (el SUPERADMIN después
-- lo renombra si hace falta). Dos textos que solo difieren en mayúsculas,
-- tildes o espacios son el mismo deporte, con la escritura más usada.
--
-- `claveNombre` es la de `Deporte.claveNombre` (minúsculas, sin tildes ni
-- espacios de más). Acá se calcula con `translate`, que cubre los caracteres
-- del castellano; la app usa NFD, que da lo mismo para ellos.

-- 1. La lista de deportes -----------------------------------------------------

CREATE TABLE "deportes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "claveNombre" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deportes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deportes_claveNombre_key" ON "deportes"("claveNombre");

-- Las mayúsculas acentuadas van en el `translate` porque, con un locale `C`,
-- `lower()` no las toca («Á» queda «Á»).
CREATE FUNCTION pg_temp.clave_deporte(texto TEXT) RETURNS TEXT AS $$
  SELECT trim(regexp_replace(
    translate(lower(texto),
      'áàäâãåéèëêíìïîóòöôõúùüûñçýÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝ',
      'aaaaaaeeeeiiiiooooouuuuncyaaaaaaeeeeiiiiooooouuuuncy'),
    '\s+', ' ', 'g'))
$$ LANGUAGE SQL IMMUTABLE;

INSERT INTO "deportes" ("id", "nombre", "claveNombre", "actualizadoEn")
SELECT gen_random_uuid()::text, s.nombre, pg_temp.clave_deporte(s.nombre), CURRENT_TIMESTAMP
FROM (VALUES
  ('Atletismo'),
  ('Running'),
  ('Trail running'),
  ('Ciclismo de ruta'),
  ('Mountain bike'),
  ('Natación'),
  ('Aguas abiertas'),
  ('Triatlón'),
  ('Duatlón'),
  ('Fútbol'),
  ('Básquet'),
  ('Vóley'),
  ('Handball'),
  ('Hockey'),
  ('Rugby'),
  ('Tenis'),
  ('Pádel'),
  ('Boxeo'),
  ('Artes marciales mixtas'),
  ('Judo'),
  ('Taekwondo'),
  ('Karate'),
  ('Lucha'),
  ('Crossfit'),
  ('Musculación'),
  ('Fisicoculturismo'),
  ('Powerlifting'),
  ('Halterofilia'),
  ('Gimnasia artística'),
  ('Danza'),
  ('Remo'),
  ('Escalada'),
  ('Golf')
) AS s(nombre);

-- 2. Lo que ya estaba cargado y no está en la lista ---------------------------

INSERT INTO "deportes" ("id", "nombre", "claveNombre", "actualizadoEn")
SELECT gen_random_uuid()::text, t.nombre, t.clave, CURRENT_TIMESTAMP
FROM (
  SELECT
    pg_temp.clave_deporte(p."deporte") AS clave,
    mode() WITHIN GROUP (
      ORDER BY regexp_replace(trim(p."deporte"), '\s+', ' ', 'g')
    ) AS nombre
  FROM "perfiles_deportivos" p
  WHERE pg_temp.clave_deporte(p."deporte") <> ''
  GROUP BY pg_temp.clave_deporte(p."deporte")
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "deportes" d WHERE d."claveNombre" = t.clave
);

-- Un perfil con el deporte en blanco (la validación lo impedía, pero la base
-- no) va a «Otro», que solo se crea si hace falta.
INSERT INTO "deportes" ("id", "nombre", "claveNombre", "actualizadoEn")
SELECT gen_random_uuid()::text, 'Otro', 'otro', CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 FROM "perfiles_deportivos"
  WHERE pg_temp.clave_deporte("deporte") = ''
)
AND NOT EXISTS (SELECT 1 FROM "deportes" WHERE "claveNombre" = 'otro');

-- 3. El perfil pasa del texto a la lista --------------------------------------

ALTER TABLE "perfiles_deportivos" ADD COLUMN "deporteId" TEXT;

UPDATE "perfiles_deportivos" p
SET "deporteId" = d."id"
FROM "deportes" d
WHERE d."claveNombre" = COALESCE(
  NULLIF(pg_temp.clave_deporte(p."deporte"), ''),
  'otro'
);

ALTER TABLE "perfiles_deportivos" ALTER COLUMN "deporteId" SET NOT NULL;
ALTER TABLE "perfiles_deportivos" DROP COLUMN "deporte";

CREATE INDEX "perfiles_deportivos_deporteId_idx"
  ON "perfiles_deportivos"("deporteId");

ALTER TABLE "perfiles_deportivos"
  ADD CONSTRAINT "perfiles_deportivos_deporteId_fkey"
  FOREIGN KEY ("deporteId") REFERENCES "deportes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
