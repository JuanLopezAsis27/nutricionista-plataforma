-- Migración 62 — System prompts de IA personalizables por consultorio
--
-- Cada funcionalidad de IA (los dos asistentes, la foto de comida, el resumen
-- de consulta y las tres lecturas de documentos) le habla al modelo con un
-- system prompt propio que hasta acá vivía escrito adentro de su adaptador.
-- Eso los volvía intocables: el consultorio que quiere sus propios títulos en
-- el resumen de la ficha, o que la lectura de planillas conozca la jerga de
-- sus rótulos, no tenía dónde decirlo.
--
-- Solo se guarda lo REESCRITO: sin fila, la funcionalidad usa el texto de
-- fábrica del catálogo. Copiar el texto de fábrica al dar de alta cada
-- consultorio habría dejado a todos clavados en la redacción del día que se
-- registraron, sin recibir nunca una mejora de la app.
--
-- `clave` es texto y no un enum de Postgres a propósito: la lista de
-- funcionalidades la manda el catálogo del código, y sumar una no debería
-- exigir una migración.
CREATE TABLE "prompts_ia" (
    "nutricionistaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompts_ia_pkey" PRIMARY KEY ("nutricionistaId","clave")
);

-- RESTRICT en nutricionista, como el resto de las tablas de inquilino.
ALTER TABLE "prompts_ia" ADD CONSTRAINT "prompts_ia_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
