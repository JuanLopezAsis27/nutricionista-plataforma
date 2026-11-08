-- Migración 99 — El sodio de los alimentos y de la planificación deportiva.
--
-- Las dos listas de alimentos (la de cada consultorio y la de la plataforma)
-- suman `sodioPor100`: miligramos de sodio por 100 g, o por 100 ml si el
-- alimento se mide en mililitros. Es la misma convención que la cafeína
-- (migración 95) y los macros (migración 90). Null es SIN DATO, no 0. Llega
-- también por la planilla de Excel, en su columna «Sodio (mg)».
--
-- A la planificación deportiva llega COPIADO en cada alimento de una ingesta
-- (`alimentos_ingesta.sodioPor100`), como la cafeína (migración 96): un plan
-- entregado es un documento, y corregir el sodio de la isotónica en la lista
-- no cambia la estrategia de una carrera ya planificada. Con eso el objetivo
-- de sodio por hora (`planificaciones_carrera.sodioObjetivoMgH`), que hasta
-- acá era informativo, se compara contra lo que suman las ingestas.
--
-- El tope (40.000 mg/100 g) es la sal de mesa, que es casi 40 % sodio: nada
-- que se coma tiene más, y un valor mayor es un error de tipeo (o la sal
-- cargada en gramos en vez del sodio en miligramos).

ALTER TABLE "alimentos_propios" ADD COLUMN "sodioPor100" DECIMAL(7,2);

ALTER TABLE "alimentos_base" ADD COLUMN "sodioPor100" DECIMAL(7,2);

ALTER TABLE "alimentos_ingesta" ADD COLUMN "sodioPor100" DECIMAL(7,2);

ALTER TABLE "alimentos_propios"
  ADD CONSTRAINT "alimentos_propios_sodio_no_negativo"
  CHECK ("sodioPor100" IS NULL OR "sodioPor100" >= 0);

ALTER TABLE "alimentos_base"
  ADD CONSTRAINT "alimentos_base_sodio_no_negativo"
  CHECK ("sodioPor100" IS NULL OR "sodioPor100" >= 0);

ALTER TABLE "alimentos_ingesta"
  ADD CONSTRAINT "alimentos_ingesta_sodio_no_negativo"
  CHECK ("sodioPor100" IS NULL OR "sodioPor100" >= 0);
