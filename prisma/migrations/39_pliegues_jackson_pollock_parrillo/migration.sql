-- Migración 39 — Tres sitios de pliegue que el perfil ISAK no tiene
--
-- El perfil ISAK son ocho pliegues y hasta acá la tabla tenía exactamente
-- esos. Alcanzan para Yuhasz/Carter, Faulkner, Withers y Durnin & Womersley,
-- pero NO para las dos familias de ecuaciones más difundidas fuera del ámbito
-- ISAK:
--
--   * Jackson & Pollock de 7 sitios pide PECTORAL y AXILAR MEDIO;
--   * Parrillo (9 sitios) pide PECTORAL y LUMBAR.
--
-- Son sitios de medición distintos, no sinónimos de ninguno de los ocho: el
-- pectoral se toma en la diagonal entre axila y pezón, el axilar medio sobre
-- la línea axilar media a la altura del xifoides y el lumbar sobre los
-- erectores, a la altura de la cresta ilíaca. Sustituir uno por otro
-- desplazaría el resultado de la ecuación sin que nada avise.
--
-- Nullable, como los otros ocho: solo el peso es obligatorio en una medición,
-- y las ecuaciones que no tienen sus sitios se informan en `faltantes` con el
-- detalle de qué medir. Decimal(4,1) es el mismo tipo que el resto de los
-- pliegues (hasta 999,9 mm, décima de milímetro: la resolución del plicómetro).

ALTER TABLE "antropometrias" ADD COLUMN "plieguePectoral"   DECIMAL(4,1);
ALTER TABLE "antropometrias" ADD COLUMN "pliegueAxilarMedio" DECIMAL(4,1);
ALTER TABLE "antropometrias" ADD COLUMN "pliegueLumbar"     DECIMAL(4,1);

-- Las ecuaciones nuevas también son valores elegibles como "ecuación
-- destacada" de una medición y como ecuación fijada de un objetivo de grasa
-- (`ObjetivoComposicion.metodoGrasa`), así que entran al enum.
--
-- Los valores existentes no se tocan: una serie histórica NUNCA cambia de
-- ecuación, y renombrar o reordenar el enum es exactamente cómo se rompería.
ALTER TYPE "MetodoGrasa" ADD VALUE IF NOT EXISTS 'JACKSON_POLLOCK_7';
ALTER TYPE "MetodoGrasa" ADD VALUE IF NOT EXISTS 'JACKSON_POLLOCK_4';
ALTER TYPE "MetodoGrasa" ADD VALUE IF NOT EXISTS 'PARRILLO';
