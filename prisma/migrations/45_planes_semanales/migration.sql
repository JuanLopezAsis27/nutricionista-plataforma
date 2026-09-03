-- Planes semanales de referencia (migración 45).
--
-- Un `PlanNutricional` describe un DÍA TIPO: franjas con opciones que valen
-- para cualquier día. Lo que faltaba era la SEMANA —qué se come el lunes al
-- mediodía, que no es lo del martes—, que es como el profesional entrega el
-- menú y como el paciente lo lee.
--
-- No es una modalidad más del plan: son dos cosas que conviven. El plan fija
-- los macros diarios y el semanal es una manera concreta de alcanzarlos, así
-- que el total de cada día se compara contra las metas del plan ASIGNADO al
-- paciente y no contra metas propias (que serían la misma cuenta consigo
-- misma).
--
-- Las alternativas de una celda (tres almuerzos posibles para el lunes) son
-- filas de `comidas_semanales` con el mismo (franjaId, dia) y distinto `orden`.
-- La de orden 0 es la principal: es la única que suma al total del día, porque
-- las otras son intercambiables con ella y sumarlas triplicaría ese lunes.

CREATE TYPE "DiaSemana" AS ENUM (
  'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'
);

CREATE TABLE "planes_semanales" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "planes_semanales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "franjas_plan_semanal" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "planSemanalId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "horaDesde" TEXT,
  "horaHasta" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "franjas_plan_semanal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comidas_semanales" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "franjaId" TEXT NOT NULL,
  "dia" "DiaSemana" NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "descripcion" TEXT,
  "recetaId" TEXT,
  "porciones" DECIMAL(6,2),
  CONSTRAINT "comidas_semanales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "items_comida_semanal" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "comidaId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "cantidadGramos" DECIMAL(8,1),
  "caloriasPor100" DECIMAL(7,2),
  "proteinasPor100" DECIMAL(7,2),
  "carbohidratosPor100" DECIMAL(7,2),
  "grasasPor100" DECIMAL(7,2),
  "fuente" TEXT,
  "referenciaExterna" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "items_comida_semanal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asignaciones_plan_semanal" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "planSemanalId" TEXT,
  "nombrePlan" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "fechaInicio" DATE NOT NULL,
  "fechaFin" DATE,
  "finalizadaEn" DATE,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asignaciones_plan_semanal_pkey" PRIMARY KEY ("id")
);

-- El par (nutricionistaId, id) es lo que permite las FK compuestas y el
-- filtrado por inquilino; el nombre único es lo que hace elegible al plan en
-- la lista de asignación.
CREATE UNIQUE INDEX "planes_semanales_nutricionistaId_id_key"
  ON "planes_semanales" ("nutricionistaId", "id");
CREATE UNIQUE INDEX "planes_semanales_nutricionistaId_nombre_key"
  ON "planes_semanales" ("nutricionistaId", "nombre");
CREATE INDEX "planes_semanales_nutricionistaId_nombre_idx"
  ON "planes_semanales" ("nutricionistaId", "nombre");

CREATE INDEX "franjas_plan_semanal_nutricionistaId_planSemanalId_idx"
  ON "franjas_plan_semanal" ("nutricionistaId", "planSemanalId");

CREATE INDEX "comidas_semanales_nutricionistaId_franjaId_dia_orden_idx"
  ON "comidas_semanales" ("nutricionistaId", "franjaId", "dia", "orden");
CREATE INDEX "comidas_semanales_nutricionistaId_recetaId_idx"
  ON "comidas_semanales" ("nutricionistaId", "recetaId");

CREATE INDEX "items_comida_semanal_nutricionistaId_comidaId_idx"
  ON "items_comida_semanal" ("nutricionistaId", "comidaId");

CREATE INDEX "asignaciones_plan_semanal_nutricionistaId_pacienteId_idx"
  ON "asignaciones_plan_semanal" ("nutricionistaId", "pacienteId");
CREATE INDEX "asignaciones_plan_semanal_nutricionistaId_planSemanalId_idx"
  ON "asignaciones_plan_semanal" ("nutricionistaId", "planSemanalId");
CREATE INDEX "asignaciones_plan_semanal_nutricionistaId_activa_idx"
  ON "asignaciones_plan_semanal" ("nutricionistaId", "activa");

ALTER TABLE "planes_semanales"
  ADD CONSTRAINT "planes_semanales_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "franjas_plan_semanal"
  ADD CONSTRAINT "franjas_plan_semanal_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "franjas_plan_semanal"
  ADD CONSTRAINT "franjas_plan_semanal_planSemanalId_fkey"
  FOREIGN KEY ("planSemanalId") REFERENCES "planes_semanales" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comidas_semanales"
  ADD CONSTRAINT "comidas_semanales_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comidas_semanales"
  ADD CONSTRAINT "comidas_semanales_franjaId_fkey"
  FOREIGN KEY ("franjaId") REFERENCES "franjas_plan_semanal" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
-- SET NULL y no CASCADE: borrar una receta del recetario no puede llevarse
-- puesta la comida de un menú que ya se le entregó al paciente.
ALTER TABLE "comidas_semanales"
  ADD CONSTRAINT "comidas_semanales_recetaId_fkey"
  FOREIGN KEY ("recetaId") REFERENCES "recetas" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "items_comida_semanal"
  ADD CONSTRAINT "items_comida_semanal_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items_comida_semanal"
  ADD CONSTRAINT "items_comida_semanal_comidaId_fkey"
  FOREIGN KEY ("comidaId") REFERENCES "comidas_semanales" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asignaciones_plan_semanal"
  ADD CONSTRAINT "asignaciones_plan_semanal_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
-- SET NULL, igual que en las asignaciones de plan (migración 38): el historial
-- del paciente es suyo y no se va con el plan que se borró.
ALTER TABLE "asignaciones_plan_semanal"
  ADD CONSTRAINT "asignaciones_plan_semanal_planSemanalId_fkey"
  FOREIGN KEY ("planSemanalId") REFERENCES "planes_semanales" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asignaciones_plan_semanal"
  ADD CONSTRAINT "asignaciones_plan_semanal_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
