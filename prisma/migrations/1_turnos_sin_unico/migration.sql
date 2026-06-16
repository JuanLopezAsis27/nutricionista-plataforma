-- Elimina la restricción única (fecha, hora) en turnos.
-- La regla de no solapamiento ahora la valida el dominio (ignorando los turnos
-- CANCELADOS), de modo que un turno cancelado libera el horario.
DROP INDEX "turnos_fecha_hora_key";
