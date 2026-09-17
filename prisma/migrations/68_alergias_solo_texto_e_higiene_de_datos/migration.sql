-- Migración 68 — Alergias solo como texto, e higiene del modelo de datos
--
-- 1) ADIÓS A `alertas_alimentarias`. Desde la migración 67 las alergias se
--    cargan como texto en `historias_clinicas.alergiasIntolerancias`, pero la
--    tabla vieja seguía alimentando los badges de la ficha y el contexto de la
--    IA. Eran dos fuentes para el mismo dato clínico: una alergia cargada como
--    texto NO le llegaba al asistente, y una fila vieja ya no se podía editar
--    ni borrar desde ninguna pantalla. Queda una sola: el texto.
--
--    Antes de borrar la tabla se VUELCAN sus filas al texto, para no perder
--    nada. Cada fila se escribe como una línea legible:
--
--        Alergia: Maní (severidad severa). Le da urticaria
--
--    y solo se agrega si el texto del paciente no la nombra todavía: el alta
--    desde una ficha escribía cada alergia en los dos lados, y sin ese filtro
--    esos pacientes la tendrían repetida. Si el paciente no tenía historia
--    clínica, se le crea una con solo ese campo.
--
-- 2) ÍNDICES DUPLICADOS. `evoluciones (pacienteId, fecha)` y
--    `planes_semanales (nutricionistaId, nombre)` tenían un índice idéntico al
--    de su restricción única, y `archivos (nutricionistaId, pacienteId)` es el
--    prefijo de `(nutricionistaId, pacienteId, fechaProgreso)`. Las consultas
--    usan los que quedan; los quitados solo encarecían cada escritura.
--
-- 3) `sincronizaciones_turno.turnoId` pasa a ser FK con CASCADE. Era texto
--    suelto, y borrar un turno (o un paciente, que arrastra sus turnos) dejaba
--    la fila huérfana para siempre. Las que ya estaban huérfanas se borran
--    primero: si no, la FK no se podría crear.
--
-- 4) CHECK de medidas antropométricas positivas. El dominio ya exige rangos
--    (peso 20–400, pliegues 1–80…), pero nada impedía que una escritura por
--    fuera de la app guardara un peso negativo. Un NULL pasa el CHECK (en SQL,
--    NULL > 0 no es falso), así que las medidas que no se tomaron no molestan.
--
--    Queda SOLO si todas las filas existentes lo cumplen. `NOT VALID` no
--    alcanzaba: Postgres revisa la fila entera en cada UPDATE, así que una
--    medición histórica con un 0 no se habría podido volver a editar ni para
--    corregirle las observaciones. Si alguna fila no lo cumple, la migración
--    sigue sin el CHECK (avisa con un NOTICE) en vez de romper la app o frenar
--    el despliegue.

-- 1a) Lo que hay que volcar, ya armado como texto por paciente.
CREATE TEMP TABLE "alergias_a_volcar" AS
SELECT
  a."pacienteId",
  a."nutricionistaId",
  string_agg(
    CASE a."tipo"::text
      WHEN 'ALERGIA' THEN 'Alergia'
      WHEN 'INTOLERANCIA' THEN 'Intolerancia'
      ELSE 'Restricción'
    END
    || ': ' || trim(a."descripcion")
    || ' (severidad ' || lower(a."severidad"::text) || ')'
    || COALESCE('. ' || NULLIF(trim(a."notas"), ''), ''),
    E'\n' ORDER BY a."creadoEn", a."id"
  ) AS "texto"
FROM "alertas_alimentarias" a
LEFT JOIN "historias_clinicas" h ON h."pacienteId" = a."pacienteId"
WHERE h."alergiasIntolerancias" IS NULL
   OR strpos(lower(h."alergiasIntolerancias"), lower(trim(a."descripcion"))) = 0
GROUP BY a."pacienteId", a."nutricionistaId";

-- 1b) Pacientes que ya tenían historia: se agrega al final de lo que hubiera.
UPDATE "historias_clinicas" h
SET
  "alergiasIntolerancias" = CASE
    WHEN NULLIF(trim(h."alergiasIntolerancias"), '') IS NULL THEN v."texto"
    ELSE h."alergiasIntolerancias" || E'\n' || v."texto"
  END,
  "actualizadoEn" = CURRENT_TIMESTAMP
FROM "alergias_a_volcar" v
WHERE h."pacienteId" = v."pacienteId";

-- 1c) Pacientes sin historia: se crea con ese único campo.
INSERT INTO "historias_clinicas" ("id", "nutricionistaId", "pacienteId", "alergiasIntolerancias", "actualizadoEn")
SELECT gen_random_uuid()::text, v."nutricionistaId", v."pacienteId", v."texto", CURRENT_TIMESTAMP
FROM "alergias_a_volcar" v
WHERE NOT EXISTS (
  SELECT 1 FROM "historias_clinicas" h WHERE h."pacienteId" = v."pacienteId"
);

DROP TABLE "alergias_a_volcar";

-- 1d) La tabla y sus enums.
ALTER TABLE "alertas_alimentarias" DROP CONSTRAINT "alertas_alimentarias_pacienteId_fkey";
ALTER TABLE "alertas_alimentarias" DROP CONSTRAINT "alertas_alimentarias_nutricionistaId_fkey";
DROP TABLE "alertas_alimentarias";
DROP TYPE "TipoAlertaAlimentaria";
DROP TYPE "SeveridadAlerta";

-- 2) Índices duplicados.
DROP INDEX "archivos_nutricionistaId_pacienteId_idx";
DROP INDEX "evoluciones_pacienteId_fecha_idx";
DROP INDEX "planes_semanales_nutricionistaId_nombre_idx";

-- 3) FK de la sincronización con el turno (huérfanas primero).
DELETE FROM "sincronizaciones_turno" s
WHERE NOT EXISTS (SELECT 1 FROM "turnos" t WHERE t."id" = s."turnoId");

ALTER TABLE "sincronizaciones_turno" ADD CONSTRAINT "sincronizaciones_turno_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "turnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Medidas antropométricas positivas (kg de grasa y dinamometría admiten 0).
ALTER TABLE "antropometrias" ADD CONSTRAINT "antropometrias_medidas_positivas" CHECK (
  "pesoKg" > 0
  AND "tallaCm" > 0
  AND "tallaSentadoCm" > 0
  AND "diamBiacromial" > 0
  AND "diamToraxTransverso" > 0
  AND "diamToraxAnteroposterior" > 0
  AND "diamBiiliocrestideo" > 0
  AND "diamHumeral" > 0
  AND "diamFemoral" > 0
  AND "pliegueTricipital" > 0
  AND "pliegueSubescapular" > 0
  AND "pliegueSupraespinal" > 0
  AND "pliegueAbdominal" > 0
  AND "pliegueMuslo" > 0
  AND "plieguePantorrilla" > 0
  AND "pliegueBicipital" > 0
  AND "pliegueCrestaIliaca" > 0
  AND "pliegueAxilarMedio" > 0
  AND "pliegueLumbar" > 0
  AND "circTorax" > 0
  AND "circCinturaMinima" > 0
  AND "circCinturaMaxima" > 0
  AND "circCadera" > 0
  AND "circBrazo" > 0
  AND "circBrazoContraido" > 0
  AND "circCabeza" > 0
  AND "circAntebrazo" > 0
  AND "circMusloMaximo" > 0
  AND "circMusloMedial" > 0
  AND "circPantorrilla" > 0
  AND "kgGrasa" >= 0
  AND "fuerzaPresionDerecha" >= 0
  AND "fuerzaPresionIzquierda" >= 0
) NOT VALID;

DO $$
BEGIN
  ALTER TABLE "antropometrias" VALIDATE CONSTRAINT "antropometrias_medidas_positivas";
EXCEPTION WHEN check_violation THEN
  ALTER TABLE "antropometrias" DROP CONSTRAINT "antropometrias_medidas_positivas";
  RAISE NOTICE 'antropometrias_medidas_positivas no se agregó: hay mediciones existentes con medidas <= 0.';
END $$;
