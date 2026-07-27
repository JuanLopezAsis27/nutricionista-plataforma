-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "ultimoMensajeTexto" TEXT,
    "ultimoMensajeEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas_ia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultas_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analisis_comida" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "archivoId" TEXT,
    "resultado" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analisis_comida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_pacienteId_key" ON "conversaciones"("pacienteId");

-- CreateIndex
CREATE INDEX "mensajes_conversacionId_creadoEn_idx" ON "mensajes"("conversacionId", "creadoEn");

-- CreateIndex
CREATE INDEX "consultas_ia_pacienteId_creadoEn_idx" ON "consultas_ia"("pacienteId", "creadoEn");

-- CreateIndex
CREATE INDEX "analisis_comida_pacienteId_creadoEn_idx" ON "analisis_comida"("pacienteId", "creadoEn");

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas_ia" ADD CONSTRAINT "consultas_ia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analisis_comida" ADD CONSTRAINT "analisis_comida_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

