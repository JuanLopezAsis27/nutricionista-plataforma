-- Migración 66 — Un plan en PDF puede ser VARIOS documentos
--
-- La migración 37 separó bien las dos modalidades, pero dejó la misma
-- limitación que ya había traído la 36 por otro camino: `archivoPrincipalId`
-- es UNA columna, así que el plan subido era exactamente UN archivo. En el
-- consultorio no siempre lo es: el plan de la semana viene en un PDF, las
-- equivalencias en otro y la lista de compras en un tercero, y los tres SON el
-- plan —no material de apoyo—. Con un solo campo, dos de los tres terminaban
-- de anexo abajo, que es justo la confusión que la 37 vino a arreglar.
--
-- La pregunta "¿este archivo es el plan o lo acompaña?" es de CADA ARCHIVO, no
-- del plan: por eso la respuesta pasa a vivir en la fila del archivo
-- (`archivos.esDocumentoDelPlan`) y no en una columna del plan que solo puede
-- nombrar a uno.
--
-- Efecto lateral buscado: desaparece el fallback "si el principal ya no está,
-- mostrar el primer archivo que haya". Existía porque la FK era SET NULL y un
-- plan podía quedar apuntando a nada teniendo anexos; con la marca en la fila,
-- borrar un documento lo saca de la lista y ningún anexo asciende a plan solo.

ALTER TABLE "archivos" ADD COLUMN "esDocumentoDelPlan" BOOLEAN NOT NULL DEFAULT false;

-- Migración de datos, en dos pasos porque son dos situaciones distintas.

-- 1. El principal declarado de cada plan pasa a ser su (único) documento.
UPDATE "archivos" a
SET "esDocumentoDelPlan" = true
FROM "planes_nutricionales" p
WHERE p."archivoPrincipalId" = a."id";

-- 2. Los planes en PDF cuyo principal se había borrado (FK SET NULL) venían
-- mostrando el PRIMER archivo del plan, por el fallback de la entidad. Esa
-- elección implícita se materializa acá: sin esto, al irse el fallback esos
-- planes quedarían sin nada que mostrar aunque el archivo siga estando.
UPDATE "archivos" a
SET "esDocumentoDelPlan" = true
WHERE a."id" = (
  SELECT a2."id"
  FROM "archivos" a2
  WHERE a2."planId" = a."planId"
  ORDER BY a2."creadoEn" ASC, a2."id" ASC
  LIMIT 1
)
AND EXISTS (
  SELECT 1 FROM "planes_nutricionales" p
  WHERE p."id" = a."planId"
    AND p."modalidad" = 'PDF'
    AND p."archivoPrincipalId" IS NULL
);

ALTER TABLE "planes_nutricionales" DROP CONSTRAINT "planes_nutricionales_archivoPrincipalId_fkey";
ALTER TABLE "planes_nutricionales" DROP COLUMN "archivoPrincipalId";
