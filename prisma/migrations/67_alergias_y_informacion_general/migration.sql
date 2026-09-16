-- Migración 67 — Alergias como texto, e "información general" en las dos fichas
--
-- 1) ALERGIAS E INTOLERANCIAS. Vivían en `alertas_alimentarias`: una fila por
--    alergia, con tipo (ALERGIA/INTOLERANCIA/RESTRICCION) y severidad
--    (LEVE/MODERADA/SEVERA). En la consulta no se anotan así: se escribe "no
--    tolera lácteos, celiaquía diagnosticada en 2019", una frase donde el
--    matiz está en las palabras y no en un enum de tres valores. Pasa a ser un
--    campo de texto más de la historia clínica, al lado de la medicación.
--
--    La tabla `alertas_alimentarias` NO se toca: sigue alimentando los badges
--    del encabezado de la ficha y las restricciones que la app le pasa a la IA.
--    Lo que cambia es dónde se cargan de ahora en más.
--
-- 2) CONTEXTO → INFORMACIÓN GENERAL. Es un RENOMBRE de columna, no un alta +
--    baja: el texto que cada paciente ya tenía cargado se conserva tal cual.
--    "Contexto (trabajo, horarios, entorno)" era un campo temático más; el
--    campo que hacía falta es el CAJÓN DE SASTRE —lo que la IA lee en el
--    documento y no coincide con ningún otro campo—, y lo que hoy hay escrito
--    en contexto es exactamente esa clase de dato. Mismo criterio que la
--    migración 50 con "antecedentesPersonales".
--
-- 3) El mismo cajón de sastre en las EVOLUCIONES, que no lo tenía: hasta ahora
--    un rótulo del cuaderno que no era ninguno de los siete campos fijos se
--    descartaba en silencio al leer el documento.

ALTER TABLE "historias_clinicas"
  RENAME COLUMN "contexto" TO "informacionGeneral";

ALTER TABLE "historias_clinicas" ADD COLUMN "alergiasIntolerancias" TEXT;

ALTER TABLE "evoluciones" ADD COLUMN "informacionGeneral" TEXT;
