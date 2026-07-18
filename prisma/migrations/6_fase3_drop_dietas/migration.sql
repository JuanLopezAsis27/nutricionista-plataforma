-- Fase 3 (cierre): eliminar el módulo Dietas, ya migrado a Planes en
-- 5_fase3_planes (mismos ids). Antes de romper nada se verifica que cada
-- dieta tenga su plan copiado; si falta alguno, la migración aborta.

DO $$
DECLARE
  faltantes int;
BEGIN
  SELECT count(*) INTO faltantes
  FROM "dietas" d
  WHERE NOT EXISTS (SELECT 1 FROM "planes_nutricionales" p WHERE p.id = d.id);

  IF faltantes > 0 THEN
    RAISE EXCEPTION
      'Copiado Dietas→Planes incompleto: % dieta(s) sin plan equivalente. Revisar 5_fase3_planes.',
      faltantes;
  END IF;
END $$;

DROP TABLE "asignaciones_dieta";
DROP TABLE "comidas";
DROP TABLE "dietas";
DROP TYPE "TipoComida";
