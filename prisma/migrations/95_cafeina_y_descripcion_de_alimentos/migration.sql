-- Migración 95 — Cafeína y descripción de los alimentos.
--
-- Las dos listas de alimentos (la de cada consultorio y la de la plataforma)
-- suman:
--
--   * `cafeinaPor100`: miligramos de cafeína por 100 g, o por 100 ml si el
--     alimento se mide en mililitros. Es la misma convención que los macros
--     (migración 90): un gel de 40 g con 40 mg de cafeína son 100 mg/100 g.
--     Null es SIN DATO, no 0: casi ningún alimento lo informa.
--   * `descripcion`: texto libre (qué es, cómo se toma, qué trae).
--
-- Las dos son opcionales y llegan también por la planilla de Excel, en sus
-- columnas «Cafeína (mg)» y «Descripción».

ALTER TABLE "alimentos_propios"
  ADD COLUMN "cafeinaPor100" DECIMAL(7,2),
  ADD COLUMN "descripcion" TEXT;

ALTER TABLE "alimentos_base"
  ADD COLUMN "cafeinaPor100" DECIMAL(7,2),
  ADD COLUMN "descripcion" TEXT;

ALTER TABLE "alimentos_propios"
  ADD CONSTRAINT "alimentos_propios_cafeina_no_negativa"
  CHECK ("cafeinaPor100" IS NULL OR "cafeinaPor100" >= 0);

ALTER TABLE "alimentos_base"
  ADD CONSTRAINT "alimentos_base_cafeina_no_negativa"
  CHECK ("cafeinaPor100" IS NULL OR "cafeinaPor100" >= 0);
