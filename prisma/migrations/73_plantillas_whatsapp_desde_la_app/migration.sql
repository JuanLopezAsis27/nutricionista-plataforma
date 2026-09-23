-- Migración 73 — Plantillas de WhatsApp creadas desde la app, con botones.
--
-- Hasta acá la plantilla de Meta se daba de alta a mano en el Administrador
-- de WhatsApp y en la app solo se anotaba su nombre. Ahora la app la manda a
-- revisión por la API de administración de Meta, le sigue el estado (en
-- revisión, aprobada, rechazada…) y le puede poner botones.
--
-- 1) Categoría: UTILITY para los avisos (recordatorios), MARKETING para lo
--    promocional. Meta la exige al dar de alta.
-- 2) Botones: JSONB y no una tabla. Son a lo sumo diez, se leen y se escriben
--    siempre junto con la plantilla, y su ORDEN es parte del contrato con Meta
--    (el índice identifica a cada botón al enviar). Un arreglo lo guarda tal
--    cual; una tabla necesitaría una columna de orden que hay que mantener.
-- 3) Estado de Meta: solo lo tienen las plantillas con nombre en Meta. NULL
--    es "nunca se consultó" (vinculada a mano), que la app trata como
--    aprobada, igual que antes de esta migración.
-- 4) `idMeta`: solo lo tienen las dadas de alta DESDE la app, y es lo que dice
--    que la app la administra (la edita y la borra en Meta).
-- 5) Notificación nueva: el paciente tocó "reprogramar" en un botón.

CREATE TYPE "CategoriaPlantillaMeta" AS ENUM ('UTILITY', 'MARKETING');

CREATE TYPE "EstadoPlantillaMeta" AS ENUM (
  'EN_REVISION',
  'APROBADA',
  'RECHAZADA',
  'PAUSADA',
  'DESHABILITADA'
);

ALTER TABLE "plantillas_whatsapp"
  ADD COLUMN "categoriaMeta" "CategoriaPlantillaMeta" NOT NULL DEFAULT 'UTILITY',
  ADD COLUMN "botones" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "idMeta" TEXT,
  ADD COLUMN "estadoMeta" "EstadoPlantillaMeta",
  ADD COLUMN "motivoEstadoMeta" TEXT;

ALTER TYPE "TipoNotificacion" ADD VALUE 'REPROGRAMACION_PEDIDA';
