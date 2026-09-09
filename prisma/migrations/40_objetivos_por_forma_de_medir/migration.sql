-- Migración 40 — Un objetivo por FORMA DE MEDIR, no uno por variable
--
-- El módulo tiene tres formas de medir lo mismo y hasta acá el objetivo solo
-- podía apoyarse en dos de ellas, y con una sola meta por variable:
--
--   1. El fraccionamiento de Kerr exponía únicamente la masa adiposa y la
--      muscular. Las otras tres —ósea, residual y piel— se calculaban, se
--      dibujaban en el donut y no se podían plantear como meta.
--   2. Las ecuaciones de pliegues sí dejaban elegir cuál se sigue, pero el
--      índice único era `(pacienteId, variable)`: con una meta de % graso por
--      Yuhasz cargada, plantear otra por Durnin & Womersley PISABA la primera.
--      Son dos metas distintas sobre dos formas de medir distintas, no una
--      contradicción.

-- ---------------------------------------------------------------------------
-- 1. Las cinco masas del fraccionamiento, completas
--
-- Los valores se agregan al final del enum y no se reordena ni renombra nada:
-- el orden de un enum de Postgres es su orden de comparación, y las metas ya
-- cargadas lo usan.
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_OSEA_KG';
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_OSEA_PORCENTAJE';
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_RESIDUAL_KG';
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_RESIDUAL_PORCENTAJE';
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_PIEL_KG';
ALTER TYPE "VariableComposicion" ADD VALUE IF NOT EXISTS 'MASA_PIEL_PORCENTAJE';

-- ---------------------------------------------------------------------------
-- 2. La unicidad pasa a incluir la ecuación
--
-- Son DOS índices y no uno, por una particularidad de Postgres que ya nos
-- mordió en los recordatorios: en un índice único los NULL NO colisionan entre
-- sí. Con `UNIQUE (pacienteId, variable, metodoGrasa)` a secas, las variables
-- que no llevan ecuación —peso, IMC, cintura, las cinco masas de Kerr— dejarían
-- de estar protegidas y se podrían cargar diez metas de peso para el mismo
-- paciente, sin que nada fallara hasta que el dashboard tuviera que elegir cuál
-- dibujar.
--
--   * el índice compuesto cubre las metas CON ecuación (una por ecuación);
--   * el índice parcial cubre las metas SIN ecuación (una por variable).
--
-- El antiduplicado es del motor y no del código a propósito: un leer-y-después-
-- escribir lo pasan dos pestañas abiertas al mismo tiempo.

DROP INDEX IF EXISTS "objetivos_composicion_pacienteId_variable_key";

CREATE UNIQUE INDEX "objetivos_composicion_pacienteId_variable_metodoGrasa_key"
  ON "objetivos_composicion" ("pacienteId", "variable", "metodoGrasa");

CREATE UNIQUE INDEX "objetivos_composicion_pacienteId_variable_sin_metodo_key"
  ON "objetivos_composicion" ("pacienteId", "variable")
  WHERE "metodoGrasa" IS NULL;
