-- Migración 85 — De qué alimento salió cada copia.
--
-- Cuando se elige un alimento, sus macros se COPIAN a la opción del plan, al
-- ingrediente de la receta o a la comida del plan semanal (migración 82): un
-- plan entregado no puede cambiar porque alguien edite o borre el alimento.
-- Lo que se perdía era saber DÓNDE se usa un alimento, para avisarlo antes de
-- editarlo o borrarlo.
--
-- `alimentoOrigenId` guarda el id del alimento de la lista de la que se copió
-- (propia o de la plataforma, según `fuente`). Es SOLO una referencia
-- informativa: sin FK, así borrar el alimento no toca estas filas ni exige un
-- SET NULL. Un id que ya no existe simplemente no cuenta.
--
-- Las filas anteriores quedan en NULL: no hay forma confiable de reconstruir
-- de qué alimento salieron (el nombre copiado se pudo editar), y adivinar
-- daría un "se usa en" falso. Los usos se cuentan desde esta migración.

ALTER TABLE "items_opcion_comida" ADD COLUMN "alimentoOrigenId" TEXT;
ALTER TABLE "ingredientes_receta" ADD COLUMN "alimentoOrigenId" TEXT;
ALTER TABLE "items_comida_semanal" ADD COLUMN "alimentoOrigenId" TEXT;
ALTER TABLE "ingredientes_receta_base" ADD COLUMN "alimentoOrigenId" TEXT;

CREATE INDEX "items_opcion_comida_nutricionistaId_alimentoOrigenId_idx"
  ON "items_opcion_comida"("nutricionistaId", "alimentoOrigenId");
CREATE INDEX "ingredientes_receta_nutricionistaId_alimentoOrigenId_idx"
  ON "ingredientes_receta"("nutricionistaId", "alimentoOrigenId");
CREATE INDEX "items_comida_semanal_nutricionistaId_alimentoOrigenId_idx"
  ON "items_comida_semanal"("nutricionistaId", "alimentoOrigenId");
CREATE INDEX "ingredientes_receta_base_alimentoOrigenId_idx"
  ON "ingredientes_receta_base"("alimentoOrigenId");
