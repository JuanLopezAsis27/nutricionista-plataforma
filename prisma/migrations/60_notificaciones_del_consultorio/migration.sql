-- Migración 60 — Notificaciones persistidas del consultorio
--
-- El Centro de Notificaciones era un read-model puro: unía tres señales que ya
-- vivían en su propia tabla y que ya tenían dónde apoyar su estado (una alerta
-- se resuelve, un mensaje se lee, un correo falló).
--
-- Estas dos no lo tienen. Que el paciente confirme el turno no dejaba NINGÚN
-- registro —se mandaba un email al profesional y ahí moría—, y un WhatsApp
-- entrante se guarda pero sin noción de leído. Sin una tabla propia no hay
-- dónde anotar el "visto", que es lo que se pidió.
--
-- No se estiró `alertas_seguimiento` a propósito: aquella describe la
-- ADHERENCIA del paciente y la regenera un barrido automático. Estas son
-- hechos puntuales que ya pasaron y no se recalculan.
CREATE TYPE "TipoNotificacion" AS ENUM ('WHATSAPP_ENTRANTE', 'TURNO_CONFIRMADO');

CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "pacienteId" TEXT,
    "enlace" TEXT,
    "vistoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- El camino caliente de la campana: las no vistas del consultorio, más nuevas
-- primero.
CREATE INDEX "notificaciones_nutricionistaId_vistoEn_creadoEn_idx" ON "notificaciones"("nutricionistaId", "vistoEn", "creadoEn");

CREATE INDEX "notificaciones_pacienteId_idx" ON "notificaciones"("pacienteId");

-- CASCADE en paciente: borrada la ficha, sus avisos no significan nada.
-- RESTRICT en nutricionista, como el resto de las tablas de inquilino.
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
