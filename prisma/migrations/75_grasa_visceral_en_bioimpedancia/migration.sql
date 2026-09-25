-- Migración 75 — Nivel de grasa visceral en la bioimpedancia.
--
-- La balanza no informa la grasa visceral en kg ni en %: la informa como un
-- NIVEL, un entero de la escala del equipo (Tanita va de 1 a 59, Omron de 1 a
-- 30). Por eso es INTEGER y no DECIMAL como el resto de la tabla: un 8,5 no es
-- un valor que ninguna balanza muestre.
--
-- Opcional, como todo salvo el peso: hay equipos que no lo dan, y las
-- mediciones ya cargadas quedan sin él.
--
-- El rango fino (1 a 59) lo valida la entidad; el CHECK solo cierra la puerta
-- a un cero o un negativo, que no son un nivel en ninguna escala.

ALTER TABLE "bioimpedancias" ADD COLUMN "nivelGrasaVisceral" INTEGER;

ALTER TABLE "bioimpedancias"
  ADD CONSTRAINT "bioimpedancias_nivelGrasaVisceral_positivo"
  CHECK ("nivelGrasaVisceral" IS NULL OR "nivelGrasaVisceral" > 0);

-- Y se le pueden plantear metas, como a cualquier otra variable de la balanza.
-- ADD VALUE va al final: los valores del enum solo se agregan.
ALTER TYPE "VariableBioimpedancia" ADD VALUE 'GRASA_VISCERAL';
