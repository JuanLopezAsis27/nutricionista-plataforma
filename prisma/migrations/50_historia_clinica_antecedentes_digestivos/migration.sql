-- Migración 50 — Reestructurar la Historia Clínica
--
-- "Antecedentes personales" se reorienta a un campo más específico que el
-- consultorio realmente usa: antecedentes de enfermedades digestivas y
-- deposiciones. Es un RENOMBRE de columna, no un alta + baja: el texto que
-- ya tenía cargado cada paciente se conserva tal cual, con su nuevo sentido.
--
-- `habitos` agrupaba actividad, sueño y consumo en un solo cajón. Se separan
-- "entrenamientos" y "descanso" como campos propios (columnas nuevas,
-- nullable como el resto): son la línea de base del paciente, y no
-- reemplazan el seguimiento consulta a consulta de `evoluciones.entrenamiento`
-- / `evoluciones.descanso`, que es otro dato con otra cadencia.

ALTER TABLE "historias_clinicas"
  RENAME COLUMN "antecedentesPersonales" TO "antecedentesDigestivos";

ALTER TABLE "historias_clinicas" ADD COLUMN "entrenamientos" TEXT;
ALTER TABLE "historias_clinicas" ADD COLUMN "descanso" TEXT;
