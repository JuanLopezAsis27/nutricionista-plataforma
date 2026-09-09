-- Migración 30 — Modelo de 2 componentes (grasa por pliegues)
--
-- Hasta acá la antropometría solo sabía fraccionar en 5 masas (Kerr), que
-- exige el perfil ISAK completo: 6 diámetros, 11 perímetros y 6 pliegues. En
-- la práctica el profesional carga los 6 pliegues y poco más, con lo cual ese
-- modelo casi nunca se resolvía.
--
-- Se suma el modelo de 2 componentes (masa grasa / masa libre de grasa), que
-- sale con esos mismos 6 pliegues: Yuhasz-Carter, Faulkner, sus variantes con
-- el ajuste de Kerr para sedentarios, Withers (atletas) y Durnin & Womersley
-- (población general).
--
-- Los dos modelos CONVIVEN. `protocolo` no restringe el cálculo —el dominio
-- computa siempre todo lo que las medidas permitan— sino que dice cuál
-- destacar. Nunca se mezclan en una misma serie: la masa adiposa de Kerr es
-- grasa subcutánea de un modelo anatómico y el % graso de las ecuaciones es
-- grasa total estimada por densitometría.
--
-- El default es DOS_COMPONENTES porque es el flujo real de la consulta; las
-- mediciones históricas quedan ahí y no cambian de significado (ninguna tenía
-- el perfil completo para las 5 masas).

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
-- CreateEnum
CREATE TYPE "ProtocoloComposicion" AS ENUM ('CINCO_COMPONENTES', 'DOS_COMPONENTES');

-- CreateEnum
CREATE TYPE "MetodoGrasa" AS ENUM ('YUHASZ_CARTER', 'YUHASZ_CARTER_KERR', 'FAULKNER', 'FAULKNER_KERR', 'WITHERS', 'DURNIN_WOMERSLEY');

-- ---------------------------------------------------------------------------
-- 2. Protocolo y método destacado en la medición
-- ---------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "antropometrias"
    ADD COLUMN "protocolo" "ProtocoloComposicion" NOT NULL DEFAULT 'DOS_COMPONENTES',
    ADD COLUMN "metodoGrasa" "MetodoGrasa";

-- ---------------------------------------------------------------------------
-- 3. Método fijado en los objetivos de porcentaje graso
-- ---------------------------------------------------------------------------
-- Un objetivo de % graso se ata a UNA ecuación: comparar un valor de Yuhasz
-- contra uno de Durnin & Womersley no mide progreso, mide el cambio de fórmula.
-- AlterTable
ALTER TABLE "objetivos_composicion" ADD COLUMN "metodoGrasa" "MetodoGrasa";

-- AlterEnum
ALTER TYPE "VariableComposicion" ADD VALUE 'PORCENTAJE_GRASA';
ALTER TYPE "VariableComposicion" ADD VALUE 'MASA_GRASA_KG';
