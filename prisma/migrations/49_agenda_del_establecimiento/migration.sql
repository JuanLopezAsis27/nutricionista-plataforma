-- La agenda pasa a ser del establecimiento (migración 49).
--
-- La 48 creó los establecimientos y COPIÓ la agenda del consultorio a la sede
-- principal, dejando las dos vivas: el código todavía leía
-- `configuracion_consultorio`. Ahora `agendaConsultorio.ts` valida contra el
-- establecimiento del turno, `lib/agenda.ts` arma las franjas con el mismo
-- dato, y la pantalla de Configuración → Turnos se convirtió en Configuración
-- → Establecimientos. Las columnas viejas ya no las lee nadie.
--
-- Se borran en vez de dejarlas por las dudas porque tener el mismo dato en dos
-- tablas es una invitación a que alguien edite la copia equivocada y no
-- entienda por qué la agenda no cambia. El valor no se pierde: está en
-- `establecimientos`, adonde lo llevó la 48.
--
-- Lo que se QUEDA en `configuracion_consultorio` es lo que describe al
-- profesional, que es uno solo por más sedes que tenga: membrete, matrícula,
-- logo, apariencia del PDF y prefijo telefónico de WhatsApp.

ALTER TABLE "configuracion_consultorio"
  DROP COLUMN "turnoDuracionMinutos",
  DROP COLUMN "turnoPasoMinutos",
  DROP COLUMN "atencionHoraDesde",
  DROP COLUMN "atencionHoraHasta",
  DROP COLUMN "diasAtencion";
