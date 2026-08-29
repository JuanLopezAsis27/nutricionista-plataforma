-- Migración 33 — Recordatorios de turno multicanal (WhatsApp, email, calendario)
--
-- Hasta acá el recordatorio por WhatsApp era de a uno y a mano: el profesional
-- abría el chat desde la grilla de turnos y después declaraba si lo había
-- mandado. Esta migración lo convierte en un canal gobernado:
--
--   1. PLANTILLAS PROPIAS (`plantillas_whatsapp`). La Cloud API solo acepta
--      texto libre dentro de las 24 h desde el último mensaje del paciente, y
--      un recordatorio de turno casi siempre cae fuera de esa ventana. Ahí Meta
--      exige una plantilla APROBADA, identificada por nombre e idioma, con los
--      parámetros pasados POR POSICIÓN. Por eso la plantilla guarda las dos
--      caras: el texto en castellano (vista previa y enlace wa.me) y la clave
--      de Meta con el orden de sus variables.
--
--   2. PROGRAMACIÓN POR MEDIO (`configuracion_recordatorios`). Qué medios están
--      activos, cuáles salen solos y con cuánta anticipación. Los días antes
--      son un ARRAY y no un número porque el pedido es "uno 3 días antes y otro
--      1 día antes": la cantidad de avisos es la longitud del array.
--
--   3. ANTIDUPLICADO REAL. `recordatorios_whatsapp` gana `diasAntes` y un
--      UNIQUE (nutricionistaId, turnoId, diasAntes). Cada escalón de la
--      programación entra una sola vez por turno, garantizado por el motor y
--      no por un leer-y-después-escribir que dos procesos concurrentes pasan
--      los dos. Los envíos manuales llevan `diasAntes` NULL y en Postgres los
--      NULL no colisionan entre sí, así que insistir a mano sigue siendo
--      posible: lo que se corta es el duplicado por error, no la insistencia
--      deliberada.
--
--   4. SEGUIMIENTO HASTA LA RESPUESTA. El estado deja de ser "¿lo mandé?" para
--      ser toda la cadena: PREPARADO → ENVIADO → ENTREGADO → LEIDO →
--      RESPONDIDO → CONFIRMADO, con FALLIDO y DESCARTADO como salidas.
--
-- Sobre el renombre de CONFIRMADO: antes significaba "el profesional declaró
-- haberlo enviado" y ahora significa "el paciente confirmó que viene". Son
-- cosas distintas y el dato histórico corresponde a la primera, así que las
-- filas existentes se migran a ENVIADO. No es una conversión cosmética: dejar
-- el valor quieto habría hecho que todos los recordatorios viejos aparecieran
-- como turnos confirmados por el paciente.

-- CreateEnum
CREATE TYPE "OrigenRecordatorio" AS ENUM ('MANUAL', 'AUTOMATICO');

-- AlterEnum: se reemplaza el tipo entero para poder remapear CONFIRMADO → ENVIADO
CREATE TYPE "EstadoRecordatorioWhatsapp_new" AS ENUM ('PREPARADO', 'ENVIADO', 'ENTREGADO', 'LEIDO', 'RESPONDIDO', 'CONFIRMADO', 'DESCARTADO', 'FALLIDO');

ALTER TABLE "recordatorios_whatsapp" ALTER COLUMN "estado" DROP DEFAULT;

ALTER TABLE "recordatorios_whatsapp"
  ALTER COLUMN "estado" TYPE "EstadoRecordatorioWhatsapp_new"
  USING (
    CASE "estado"::text
      WHEN 'CONFIRMADO' THEN 'ENVIADO'
      ELSE "estado"::text
    END
  )::"EstadoRecordatorioWhatsapp_new";

DROP TYPE "EstadoRecordatorioWhatsapp";
ALTER TYPE "EstadoRecordatorioWhatsapp_new" RENAME TO "EstadoRecordatorioWhatsapp";

ALTER TABLE "recordatorios_whatsapp" ALTER COLUMN "estado" SET DEFAULT 'PREPARADO';

-- CreateTable
CREATE TABLE "plantillas_whatsapp" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "claveMeta" TEXT,
    "idiomaMeta" TEXT NOT NULL DEFAULT 'es_AR',
    "variablesMeta" TEXT[],
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_recordatorios" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "whatsappActivo" BOOLEAN NOT NULL DEFAULT true,
    "whatsappAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "whatsappDiasAntes" INTEGER[] DEFAULT ARRAY[3, 1]::INTEGER[],
    "emailActivo" BOOLEAN NOT NULL DEFAULT true,
    "emailAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "emailDiasAntes" INTEGER[] DEFAULT ARRAY[1]::INTEGER[],
    "calendarioActivo" BOOLEAN NOT NULL DEFAULT true,
    "calendarioInvitarPaciente" BOOLEAN NOT NULL DEFAULT true,
    "calendarioMinutosAntes" INTEGER[] DEFAULT ARRAY[1440, 60]::INTEGER[],
    "horaEnvio" TEXT NOT NULL DEFAULT '09:00',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_recordatorios_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "recordatorios_whatsapp"
    ADD COLUMN "origen" "OrigenRecordatorio" NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN "diasAntes" INTEGER,
    ADD COLUMN "plantillaId" TEXT,
    ADD COLUMN "error" TEXT,
    ADD COLUMN "respondidoEn" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_whatsapp_nutricionistaId_nombre_key" ON "plantillas_whatsapp"("nutricionistaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_recordatorios_nutricionistaId_key" ON "configuracion_recordatorios"("nutricionistaId");

-- CreateIndex
CREATE UNIQUE INDEX "recordatorios_whatsapp_nutricionistaId_turnoId_diasAntes_key" ON "recordatorios_whatsapp"("nutricionistaId", "turnoId", "diasAntes");

-- CreateIndex
CREATE INDEX "recordatorios_whatsapp_nutricionistaId_pacienteId_creadoEn_idx" ON "recordatorios_whatsapp"("nutricionistaId", "pacienteId", "creadoEn");

-- AddForeignKey
ALTER TABLE "plantillas_whatsapp" ADD CONSTRAINT "plantillas_whatsapp_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_recordatorios" ADD CONSTRAINT "configuracion_recordatorios_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recordatorios_whatsapp" ADD CONSTRAINT "recordatorios_whatsapp_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "plantillas_whatsapp"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Migración del texto del recordatorio: de un campo suelto a una plantilla
--
-- `configuracion_consultorio.whatsappPlantilla` guardaba el texto del
-- recordatorio. Con las plantillas propias eso pasa a ser una fila de
-- `plantillas_whatsapp`, y dejar las dos habría sido tener dos textos que
-- pueden discrepar: el que se edita en Configuración y el que efectivamente
-- sale. Se copia lo que cada consultorio tenía escrito —o el texto de fábrica,
-- si nunca lo tocó— y recién después se borra la columna.
--
-- Cada consultorio arranca con SU plantilla marcada como predeterminada,
-- porque sin predeterminada el barrido automático no manda nada.

INSERT INTO "plantillas_whatsapp" (
    "id", "nutricionistaId", "nombre", "cuerpo", "idiomaMeta", "variablesMeta",
    "predeterminada", "activa", "creadoEn", "actualizadoEn"
)
SELECT
    gen_random_uuid()::text,
    n."id",
    'Recordatorio de turno',
    COALESCE(
        NULLIF(TRIM(c."whatsappPlantilla"), ''),
        '¡Hola {{paciente}}! Te recuerdo tu turno del {{fecha}} a las {{hora}}. Si necesitás reprogramarlo, avisame por acá. ¡Nos vemos! {{profesional}}'
    ),
    'es_AR',
    ARRAY['paciente', 'fecha', 'hora', 'profesional'],
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "nutricionistas" n
LEFT JOIN "configuracion_consultorio" c ON c."nutricionistaId" = n."id";

-- AlterTable
ALTER TABLE "configuracion_consultorio" DROP COLUMN "whatsappPlantilla";

-- ---------------------------------------------------------------------------
-- Configuración de recordatorios para los consultorios que ya existen
--
-- La fila se crearía sola al primer guardado, pero sembrarla acá deja el
-- estado explícito en la base en vez de repartido entre la base y un default
-- del código: al abrir la pantalla, el profesional ve lo que efectivamente
-- rige. Los valores son los de `ConfiguracionRecordatorios.porDefecto()`.

INSERT INTO "configuracion_recordatorios" ("id", "nutricionistaId", "creadoEn", "actualizadoEn")
SELECT gen_random_uuid()::text, n."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "nutricionistas" n;
