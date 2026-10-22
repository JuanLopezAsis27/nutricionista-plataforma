-- Las metas por día del plan semanal pasan de JSON a tabla (ver
-- docs/PLANES-SEMANALES.md, «Las metas son del plan semanal»).
--
-- En la migración 91 vivían en `planes_semanales.metasPorDia` (JSONB). Para la
-- base eso era un texto con forma: aceptaba un día que no existe, el mismo día
-- dos veces o un número negativo, y la única defensa era la entidad. Con una
-- tabla, la base controla lo que puede controlar:
--
--   - el día es el enum `DiaSemana`;
--   - una fila por plan y día (índice único);
--   - ningún valor negativo y al menos una meta por fila (CHECK);
--   - borrar el plan se lleva sus metas (FK en cascada).
--
-- Y en `planes_semanales`, que con POR_DIA las metas generales queden vacías
-- (CHECK). Lo único que queda en la entidad es la regla entre tablas —con
-- GENERAL no hay filas por día—, que la base solo podría asegurar con un
-- trigger; el repositorio la cumple porque borra las filas y las vuelve a
-- crear en la misma transacción que actualiza el plan.
--
-- (Se omite a propósito `ALTER TABLE "turnos" ALTER COLUMN "periodo" DROP
-- DEFAULT`, que `migrate diff` propone siempre; ver la migración 64.)

-- CreateTable
CREATE TABLE "metas_dia_plan_semanal" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "planSemanalId" TEXT NOT NULL,
    "dia" "DiaSemana" NOT NULL,
    "caloriasMeta" INTEGER,
    "proteinasMetaG" DECIMAL(7,2),
    "carbohidratosMetaG" DECIMAL(7,2),
    "grasasMetaG" DECIMAL(7,2),

    CONSTRAINT "metas_dia_plan_semanal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metas_dia_plan_semanal_nutricionistaId_planSemanalId_idx" ON "metas_dia_plan_semanal"("nutricionistaId", "planSemanalId");

-- CreateIndex
CREATE UNIQUE INDEX "metas_dia_plan_semanal_planSemanalId_dia_key" ON "metas_dia_plan_semanal"("planSemanalId", "dia");

-- AddForeignKey
ALTER TABLE "metas_dia_plan_semanal" ADD CONSTRAINT "metas_dia_plan_semanal_planSemanalId_fkey" FOREIGN KEY ("planSemanalId") REFERENCES "planes_semanales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas_dia_plan_semanal" ADD CONSTRAINT "metas_dia_plan_semanal_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Los datos que ya estaban en el JSON (solo de los planes con metas por día).
-- Se leen con la misma desconfianza que tenía el repositorio: un elemento que
-- no es un objeto, un día que no existe o un valor que no es un número no
-- negativo se descarta, y un día que queda sin ningún valor no se copia.
-- El inquilino se copia del plan, como en el resto de las hijas.
INSERT INTO "metas_dia_plan_semanal"
  ("id", "nutricionistaId", "planSemanalId", "dia",
   "caloriasMeta", "proteinasMetaG", "carbohidratosMetaG", "grasasMetaG")
SELECT
  gen_random_uuid()::text,
  d."nutricionistaId",
  d."planSemanalId",
  d."dia"::"DiaSemana",
  d."calorias",
  d."proteinas",
  d."carbohidratos",
  d."grasas"
FROM (
  SELECT DISTINCT ON (p."id", e->>'dia')
    p."nutricionistaId",
    p."id" AS "planSemanalId",
    e->>'dia' AS "dia",
    CASE WHEN jsonb_typeof(e->'calorias') = 'number'
          AND (e->>'calorias')::numeric BETWEEN 0 AND 2147483647
         THEN round((e->>'calorias')::numeric)::integer END AS "calorias",
    CASE WHEN jsonb_typeof(e->'proteinasG') = 'number'
          AND (e->>'proteinasG')::numeric BETWEEN 0 AND 99999.99
         THEN round((e->>'proteinasG')::numeric, 2) END AS "proteinas",
    CASE WHEN jsonb_typeof(e->'carbohidratosG') = 'number'
          AND (e->>'carbohidratosG')::numeric BETWEEN 0 AND 99999.99
         THEN round((e->>'carbohidratosG')::numeric, 2) END AS "carbohidratos",
    CASE WHEN jsonb_typeof(e->'grasasG') = 'number'
          AND (e->>'grasasG')::numeric BETWEEN 0 AND 99999.99
         THEN round((e->>'grasasG')::numeric, 2) END AS "grasas"
  FROM "planes_semanales" p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p."metasPorDia") = 'array'
         THEN p."metasPorDia" ELSE '[]'::jsonb END
  ) AS e
  WHERE p."modoMetas" = 'POR_DIA'
    AND jsonb_typeof(e) = 'object'
    AND e->>'dia' IN ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')
  ORDER BY p."id", e->>'dia'
) d
WHERE num_nonnulls(d."calorias", d."proteinas", d."carbohidratos", d."grasas") > 0;

-- AlterTable
ALTER TABLE "planes_semanales" DROP COLUMN "metasPorDia";

-- Lo que la base garantiza de las metas. Solo el piso: el tope de cada valor
-- es un control de carga (el DTO), no una regla del dominio.
ALTER TABLE "metas_dia_plan_semanal"
  ADD CONSTRAINT "metas_dia_plan_semanal_no_negativas" CHECK (
    ("caloriasMeta" IS NULL OR "caloriasMeta" >= 0)
    AND ("proteinasMetaG" IS NULL OR "proteinasMetaG" >= 0)
    AND ("carbohidratosMetaG" IS NULL OR "carbohidratosMetaG" >= 0)
    AND ("grasasMetaG" IS NULL OR "grasasMetaG" >= 0)
  ),
  -- Una fila sin ningún valor no es una meta: el día va sin fila.
  ADD CONSTRAINT "metas_dia_plan_semanal_con_alguna_meta" CHECK (
    num_nonnulls("caloriasMeta", "proteinasMetaG", "carbohidratosMetaG", "grasasMetaG") > 0
  );

ALTER TABLE "planes_semanales"
  ADD CONSTRAINT "planes_semanales_metas_no_negativas" CHECK (
    ("caloriasMeta" IS NULL OR "caloriasMeta" >= 0)
    AND ("proteinasMetaG" IS NULL OR "proteinasMetaG" >= 0)
    AND ("carbohidratosMetaG" IS NULL OR "carbohidratosMetaG" >= 0)
    AND ("grasasMetaG" IS NULL OR "grasasMetaG" >= 0)
  ),
  -- Con metas por día, las generales no rigen: si quedaran cargadas, volverían
  -- a regir con solo cambiar el modo.
  ADD CONSTRAINT "planes_semanales_metas_segun_modo" CHECK (
    "modoMetas" = 'GENERAL'
    OR num_nulls("caloriasMeta", "proteinasMetaG", "carbohidratosMetaG", "grasasMetaG") = 4
  );
