-- Migración 72 — Bioimpedancia, y la fuerza de prensión con su nombre.
--
-- 1) Bioimpedancia
--
-- Una sección nueva en la ficha del paciente, hermana de la antropometría: se
-- cargan mediciones por fecha, se miran en un dashboard y se plantean metas.
-- Lo que se carga es lo que informa la balanza: peso, kg de músculo, kg de
-- grasa, % muscular y % graso.
--
-- Es OTRA fuente y por eso son tablas propias, no columnas nuevas de
-- `antropometrias` ni variables nuevas de `objetivos_composicion`: el % graso
-- de la balanza (resistencia eléctrica, sensible a la hidratación) y el de una
-- ecuación de pliegues son números de métodos distintos, y una meta que
-- mezclara las dos series dibujaría saltos que son el cambio de método y no
-- del paciente. Lo que sí comparten es la regla de proyección, que vive en el
-- dominio.
--
-- Nada es derivado: el equipo ya calculó la composición y el profesional
-- anota lo que ve. Los porcentajes se guardan tal cual, porque recalcularlos
-- desde los kg daría otro número que el que el paciente vio en la balanza.

CREATE TYPE "VariableBioimpedancia" AS ENUM (
  'PESO',
  'MASA_MUSCULAR_KG',
  'MASA_GRASA_KG',
  'PORCENTAJE_MUSCULAR',
  'PORCENTAJE_GRASA'
);

CREATE TABLE "bioimpedancias" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "fecha" DATE NOT NULL,
  "pesoKg" DECIMAL(5,2) NOT NULL,
  "masaMuscularKg" DECIMAL(5,2),
  "masaGrasaKg" DECIMAL(5,2),
  "porcentajeMuscular" DECIMAL(4,1),
  "porcentajeGrasa" DECIMAL(4,1),
  "observaciones" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bioimpedancias_pkey" PRIMARY KEY ("id")
);

-- Una por paciente y fecha, como la antropometría y la evolución.
CREATE UNIQUE INDEX "bioimpedancias_pacienteId_fecha_key"
  ON "bioimpedancias" ("pacienteId", "fecha");

ALTER TABLE "bioimpedancias"
  ADD CONSTRAINT "bioimpedancias_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bioimpedancias"
  ADD CONSTRAINT "bioimpedancias_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "objetivos_bioimpedancia" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "variable" "VariableBioimpedancia" NOT NULL,
  "valorObjetivo" DECIMAL(7,2) NOT NULL,
  "fechaObjetivo" DATE,
  "estado" "EstadoObjetivo" NOT NULL DEFAULT 'EN_CURSO',
  "notas" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "objetivos_bioimpedancia_pkey" PRIMARY KEY ("id")
);

-- Una sola meta vigente por paciente y variable. Acá no hay ecuación en la
-- clave (a diferencia de `objetivos_composicion`), así que no hace falta el
-- índice parcial por los NULL.
CREATE UNIQUE INDEX "objetivos_bioimpedancia_pacienteId_variable_key"
  ON "objetivos_bioimpedancia" ("pacienteId", "variable");
CREATE INDEX "objetivos_bioimpedancia_nutricionistaId_pacienteId_idx"
  ON "objetivos_bioimpedancia" ("nutricionistaId", "pacienteId");

ALTER TABLE "objetivos_bioimpedancia"
  ADD CONSTRAINT "objetivos_bioimpedancia_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "objetivos_bioimpedancia"
  ADD CONSTRAINT "objetivos_bioimpedancia_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Fuerza de PRENSIÓN
--
-- La migración 52 la llamó bien en su comentario («fuerza de prensión») pero
-- las columnas nacieron como `fuerzaPresion…`, y la pantalla heredó la
-- palabra equivocada: la dinamometría de mano mide la fuerza de PRENSIÓN
-- (apretar), no una presión. Se renombra todo junto —columnas, código y
-- etiquetas— para que el nombre mal escrito no siga vivo en ningún lado.
-- RENAME no toca los datos.

ALTER TABLE "antropometrias"
  RENAME COLUMN "fuerzaPresionDerecha" TO "fuerzaPrensionDerecha";
ALTER TABLE "antropometrias"
  RENAME COLUMN "fuerzaPresionIzquierda" TO "fuerzaPrensionIzquierda";

-- Los prompts personalizados de la lectura de planillas nombran estas claves
-- en su texto. El esquema JSON que se le manda al modelo ya usa las nuevas,
-- pero un prompt que siga pidiendo `fuerzaPresionDerecha` contradice al
-- esquema en la misma llamada.
UPDATE "prompts_ia"
   SET "texto" = replace(
                   replace("texto", 'fuerzaPresion', 'fuerzaPrension'),
                   'fuerza de presión', 'fuerza de prensión')
 WHERE "texto" LIKE '%fuerzaPresion%' OR "texto" LIKE '%fuerza de presión%';
