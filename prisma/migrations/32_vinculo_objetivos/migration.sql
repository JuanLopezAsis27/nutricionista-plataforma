-- Migración 32 — Vínculo entre el objetivo cualitativo y la meta numérica
--
-- Los dos modelos de objetivo son complementarios, no redundantes:
--
--   * `objetivos`             — el PLAN: qué se va a hacer y por qué. Lleva
--     estrategias con motivo obligatorio e historial auditable. Muchas cosas
--     importantes en nutrición no son un número (ordenar las cenas, sostener
--     la adherencia en vacaciones).
--   * `objetivos_composicion` — el RESULTADO esperado: "masa adiposa a 12 kg".
--     Medible y proyectable contra las antropometrías.
--
-- Estaban desconectados: un número sin plan no dice qué hacer el lunes, y un
-- plan sin número no se puede evaluar. Con el vínculo, el plan muestra el
-- progreso REAL medido en vez de una autoevaluación, y la meta numérica puede
-- listar las estrategias con las que se la persigue.
--
-- El vínculo es OPCIONAL en los dos sentidos y UNIQUE: una meta numérica se
-- persigue con un plan, no con tres compitiendo entre sí.
--
-- ON DELETE SET NULL y no CASCADE: borrar la meta numérica no puede llevarse
-- puesto el plan ni su historial, que es información clínica.

-- AlterTable
ALTER TABLE "objetivos" ADD COLUMN "objetivoComposicionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "objetivos_objetivoComposicionId_key" ON "objetivos"("objetivoComposicionId");

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_objetivoComposicionId_fkey" FOREIGN KEY ("objetivoComposicionId") REFERENCES "objetivos_composicion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
