-- Migración 31 — Plantillas de carga de mediciones
--
-- El perfil ISAK completo son 25 medidas; en la consulta real se toman seis.
-- Pedir las 25 y dejar 19 vacías es ruido en cada carga, así que el
-- profesional arma sus propias plantillas: parte de una de fábrica, destilda
-- lo que no usa y guarda el resto.
--
-- `campos` va como text[] y no como tabla hija: es una LISTA de nombres sin
-- atributos propios, que solo se lee entera. Normalizarla daría una tabla de
-- join de dos columnas que nunca se consulta por campo.
--
-- La regla de que la plantilla alcance para calcular algo NO está acá: vive en
-- el dominio (`PlantillaAntropometrica`), donde puede explicar qué falta.

-- CreateTable
CREATE TABLE "plantillas_antropometricas" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "campos" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_antropometricas_pkey" PRIMARY KEY ("id")
);

-- Dos plantillas con el mismo nombre en el mismo consultorio serían
-- indistinguibles en el selector del formulario.
-- CreateIndex
CREATE UNIQUE INDEX "plantillas_antropometricas_nutricionistaId_nombre_key" ON "plantillas_antropometricas"("nutricionistaId", "nombre");

-- CreateIndex
CREATE INDEX "plantillas_antropometricas_nutricionistaId_idx" ON "plantillas_antropometricas"("nutricionistaId");

-- AddForeignKey
ALTER TABLE "plantillas_antropometricas" ADD CONSTRAINT "plantillas_antropometricas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
