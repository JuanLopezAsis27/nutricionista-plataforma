-- Migración 96 — La cafeína en la planificación deportiva.
--
-- La cafeína de los alimentos (migración 95) llega a la planificación como
-- llegan los macros: COPIADA en cada alimento de una ingesta
-- (`alimentos_ingesta.cafeinaPor100`, mg por 100 g/ml). Un plan entregado es un
-- documento: corregir la cafeína del gel en la lista no cambia la estrategia
-- de una carrera ya planificada.
--
-- Para darla en mg/kg hace falta el peso del deportista
-- (`planificaciones_deportivas.pesoReferenciaKg`). Es de la planificación y no
-- se lee del paciente en cada vista porque una planificación general se asigna
-- a varios: al crearla desde la ficha arranca con el último peso del paciente,
-- y se edita como cualquier otro dato.

ALTER TABLE "alimentos_ingesta" ADD COLUMN "cafeinaPor100" DECIMAL(7,2);

ALTER TABLE "planificaciones_deportivas" ADD COLUMN "pesoReferenciaKg" DECIMAL(5,2);

ALTER TABLE "alimentos_ingesta"
  ADD CONSTRAINT "alimentos_ingesta_cafeina_no_negativa"
  CHECK ("cafeinaPor100" IS NULL OR "cafeinaPor100" >= 0);

ALTER TABLE "planificaciones_deportivas"
  ADD CONSTRAINT "planificaciones_deportivas_peso_razonable"
  CHECK ("pesoReferenciaKg" IS NULL OR ("pesoReferenciaKg" >= 20 AND "pesoReferenciaKg" <= 300));
