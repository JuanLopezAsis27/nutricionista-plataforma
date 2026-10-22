-- Metas propias del plan semanal (ver docs/PLANES-SEMANALES.md).
--
-- Hasta acá el plan semanal se comparaba contra las metas del plan
-- nutricional asignado al paciente, y con varios asignados solo contaba el
-- primero que declarara macros. Ahora cada plan semanal declara las suyas: las
-- mismas para los siete días (GENERAL) o unas por día (POR_DIA, en
-- "metasPorDia").
--
-- Los planes semanales que ya existían quedan SIN metas: no hay de dónde
-- sacarlas sin elegir uno de los planes del paciente, que es justo lo que se
-- vino a evitar. Hasta que el profesional las cargue, muestran los totales
-- sin semáforo.
--
-- (Se omite a propósito `ALTER TABLE "turnos" ALTER COLUMN "periodo" DROP
-- DEFAULT`, que `migrate diff` propone siempre por cómo Prisma introspecciona
-- la columna GENERADA `periodo`; ver la migración 64.)

-- CreateEnum
CREATE TYPE "ModoMetasPlanSemanal" AS ENUM ('GENERAL', 'POR_DIA');

-- AlterTable
ALTER TABLE "planes_semanales" ADD COLUMN     "caloriasMeta" INTEGER,
ADD COLUMN     "caloriasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
ADD COLUMN     "carbohidratosMetaG" DECIMAL(7,2),
ADD COLUMN     "carbohidratosMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
ADD COLUMN     "grasasMetaG" DECIMAL(7,2),
ADD COLUMN     "grasasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO',
ADD COLUMN     "metasPorDia" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "modoMetas" "ModoMetasPlanSemanal" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "proteinasMetaG" DECIMAL(7,2),
ADD COLUMN     "proteinasMetaTipo" "TipoMetaMacro" NOT NULL DEFAULT 'APROXIMADO';
