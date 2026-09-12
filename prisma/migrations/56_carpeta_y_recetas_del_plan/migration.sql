-- Carpeta del paciente y recetas vinculadas al plan (migración 56).
--
-- "Crear plan desde la ficha del paciente" necesita reencontrar la MISMA
-- carpeta en cada alta siguiente, y hacerlo por nombre de texto es frágil (dos
-- pacientes homónimos, un cambio de apellido). `grupos_plan.pacienteId` es esa
-- referencia: única por paciente, SET NULL si el paciente se borra —la carpeta
-- y sus planes quedan, solo deja de ser "la carpeta de alguien"—.
ALTER TABLE "grupos_plan" ADD COLUMN "pacienteId" TEXT;

CREATE UNIQUE INDEX "grupos_plan_pacienteId_key" ON "grupos_plan" ("pacienteId");

ALTER TABLE "grupos_plan"
  ADD CONSTRAINT "grupos_plan_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Un plan en PDF/Word no tiene franjas de las que colgar una receta vía
-- `opciones_comida.recetaId`: esta es la manera de vincularle recetas de
-- todos modos. Tabla de vínculo pura (sin ella no queda nada que decir), por
-- eso las dos FKs son CASCADE, igual que `asignaciones_receta`.
CREATE TABLE "recetas_del_plan" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "recetaId" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recetas_del_plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recetas_del_plan_planId_recetaId_key"
  ON "recetas_del_plan" ("planId", "recetaId");
CREATE INDEX "recetas_del_plan_nutricionistaId_planId_idx"
  ON "recetas_del_plan" ("nutricionistaId", "planId");
CREATE INDEX "recetas_del_plan_nutricionistaId_recetaId_idx"
  ON "recetas_del_plan" ("nutricionistaId", "recetaId");

ALTER TABLE "recetas_del_plan"
  ADD CONSTRAINT "recetas_del_plan_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recetas_del_plan"
  ADD CONSTRAINT "recetas_del_plan_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_nutricionales" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recetas_del_plan"
  ADD CONSTRAINT "recetas_del_plan_recetaId_fkey"
  FOREIGN KEY ("recetaId") REFERENCES "recetas" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
