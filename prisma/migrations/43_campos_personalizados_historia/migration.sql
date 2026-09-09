-- Campos personalizados de la historia clínica (migración 43).
--
-- Dos piezas para las dos formas de campo extra que admite la historia:
--   * `campos_historia_clinica`: la definición del CONSULTORIO, que aparece en
--     todos sus pacientes (mismo modelo que `plantillas_antropometricas`).
--   * `historias_clinicas.camposPersonalizados`: los VALORES de ese paciente,
--     incluidos los campos sueltos que se cargan en una historia puntual y no
--     tienen definición.
--
-- El valor guarda la etiqueta junto al texto para que la historia se siga
-- leyendo si después se borra la definición del campo.

ALTER TABLE "historias_clinicas"
  ADD COLUMN "camposPersonalizados" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "campos_historia_clinica" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campos_historia_clinica_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campos_historia_clinica_nutricionistaId_nombre_key"
  ON "campos_historia_clinica" ("nutricionistaId", "nombre");
CREATE UNIQUE INDEX "campos_historia_clinica_nutricionistaId_clave_key"
  ON "campos_historia_clinica" ("nutricionistaId", "clave");
CREATE INDEX "campos_historia_clinica_nutricionistaId_idx"
  ON "campos_historia_clinica" ("nutricionistaId");

ALTER TABLE "campos_historia_clinica"
  ADD CONSTRAINT "campos_historia_clinica_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
