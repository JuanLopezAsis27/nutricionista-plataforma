-- Migración 36 — El plan también puede ser un PDF
--
-- Hasta acá un plan nutricional era SOLO el plan estructurado: franjas de
-- comida, opciones, equivalencias y recomendaciones, cargadas una por una en
-- la app. Eso deja afuera cómo trabaja el profesional que ya arma sus planes
-- en Word o Canva: los tiene terminados y solo quiere que el paciente los vea.
-- Hoy la única salida era mandarlos por WhatsApp, fuera de la app.
--
-- El PDF entra como un dueño más del arco exclusivo de `archivos`, igual que
-- las fotos de una receta o el archivo de un material. No es una columna en
-- `planes_nutricionales` porque un plan no "tiene una ruta de archivo": tiene
-- un Archivo, con su clave en el bucket, su MIME, su tamaño y su borrado
-- compensado, que es exactamente lo que el módulo Archivos ya resuelve.
--
-- Es UNIQUE (1 a 1) a propósito: "el PDF del plan" es uno. Varios adjuntos
-- serían otra cosa —material de apoyo—, y eso ya existe en la biblioteca.
--
-- ON DELETE CASCADE: borrar el plan se lleva la fila del archivo. El objeto
-- del bucket lo levanta después el barrido semanal de huérfanos del worker,
-- que es como se limpian todos los demás.
--
-- El PDF NO reemplaza al plan estructurado: conviven. Un plan puede tener
-- comidas cargadas, un PDF, o las dos cosas, y la pantalla del paciente
-- muestra lo que haya. Lo que sí deja de valer es el plan vacío: la regla
-- "al menos una comida" pasa a ser "al menos una comida O un PDF" y vive en
-- la entidad, no acá (la subida y el guardado son dos pasos, y entre uno y
-- otro un CHECK no tendría cómo saberlo).

ALTER TABLE "archivos" ADD COLUMN "planId" TEXT;

ALTER TABLE "archivos" ADD CONSTRAINT "archivos_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "planes_nutricionales"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "archivos_planId_key" ON "archivos"("planId");

-- El invariante del arco exclusivo suma un dueño. Sigue siendo `<= 1` (ver
-- migración 34): estar sin dueño es un estado transitorio y legítimo, porque
-- el PDF se sube ANTES de que el plan exista y se vincula al guardarlo.
ALTER TABLE "archivos" DROP CONSTRAINT "archivos_un_solo_dueno";

ALTER TABLE "archivos" ADD CONSTRAINT "archivos_un_solo_dueno" CHECK (
  (("pacienteId"        IS NOT NULL)::int
 + ("laboratorioId"     IS NOT NULL)::int
 + ("comidaConsumidaId" IS NOT NULL)::int
 + ("recetaId"          IS NOT NULL)::int
 + ("materialId"        IS NOT NULL)::int
 + ("planId"            IS NOT NULL)::int) <= 1
);
