-- Migración 77 — Mensajes de WhatsApp sin leer, y la bienvenida que no salió.

-- 1) Leído / no leído en WhatsApp.
--
-- El chat del portal siempre tuvo `leidoEn`; WhatsApp no, así que un mensaje
-- entrante no sumaba al contador de «Mensajes» ni a la bandeja: el paciente
-- escribía y nada en la app lo decía, salvo la campana. Solo importa en los
-- ENTRANTES (lo que el profesional tiene que leer); los salientes lo dejan en
-- NULL y no se cuentan.
ALTER TABLE "mensajes_whatsapp" ADD COLUMN "leidoEn" TIMESTAMP(3);

-- Lo que ya estaba se da por leído: sin esto, el día del despliegue la bandeja
-- amanecía con meses de mensajes «sin leer» que el profesional ya contestó.
UPDATE "mensajes_whatsapp"
   SET "leidoEn" = "creadoEn"
 WHERE "direccion" = 'ENTRANTE';

-- El contador se pregunta en cada pantalla (sidebar): índice parcial solo
-- sobre lo que falta leer, que es poco.
CREATE INDEX "mensajes_whatsapp_no_leidos_idx"
  ON "mensajes_whatsapp" ("nutricionistaId", "pacienteId")
  WHERE "direccion" = 'ENTRANTE' AND "leidoEn" IS NULL;

-- 2) Los avisos que vienen de WhatsApp abren el canal WhatsApp.
--
-- Enlazaban a `/dashboard/mensajes?paciente=…`, que abre el chat del PORTAL.
-- El texto de una notificación se congela (ver NOTIFICACIONES.md), pero el
-- enlace a una pantalla que muestra otra conversación es un error, no un
-- relato: se corrige también en las que ya estaban.
UPDATE "notificaciones"
   SET "enlace" = "enlace" || '&canal=whatsapp'
 WHERE "tipo" IN ('WHATSAPP_ENTRANTE', 'REPROGRAMACION_PEDIDA', 'CANCELACION_PEDIDA')
   AND "enlace" LIKE '/dashboard/mensajes?paciente=%'
   AND "enlace" NOT LIKE '%canal=%';

-- 3) La bienvenida que no se pudo mandar al dar de alta un paciente.
ALTER TYPE "TipoNotificacion" ADD VALUE 'BIENVENIDA_FALLIDA';
