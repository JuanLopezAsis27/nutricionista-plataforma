-- Migración 94 — Planificación deportiva.
--
-- Un módulo para planificar la nutrición de una COMPETENCIA, empezando por
-- las carreras (running y trail running): distancia, desnivel, duración
-- estimada, hora de largada, objetivos por hora y la línea de tiempo de
-- ingestas —qué se toma y a qué minuto de carrera—, con alimentos COPIADOS de
-- la base de alimentos como en el plan semanal (migración 85).
--
-- Lo común a cualquier deporte vive en `planificaciones_deportivas` (nombre,
-- carpeta, ingestas); lo propio de cada uno, en una tabla 1 a 1
-- (`planificaciones_carrera`). Un deporte nuevo es un valor más del enum y
-- otra tabla de detalle, sin tocar la línea de tiempo.
--
-- Se gestionan como los planes: carpetas (la del paciente se arma sola al
-- crear desde su ficha, como en la migración 56) y asignaciones a pacientes,
-- cada una con una competencia opcional de su calendario.

-- CreateEnum
CREATE TYPE "TipoPlanificacionDeportiva" AS ENUM ('CARRERA');

-- CreateEnum
CREATE TYPE "ModalidadCarrera" AS ENUM ('CALLE', 'TRAIL');

-- CreateTable
CREATE TABLE "planificaciones_deportivas" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoPlanificacionDeportiva" NOT NULL,
    "grupoId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planificaciones_deportivas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planificaciones_carrera" (
    "planificacionId" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "modalidad" "ModalidadCarrera" NOT NULL DEFAULT 'CALLE',
    "distanciaKm" DECIMAL(6,2) NOT NULL,
    "duracionEstimadaMin" INTEGER NOT NULL,
    "desnivelPositivoM" INTEGER,
    "desnivelNegativoM" INTEGER,
    "horaLargada" TEXT,
    "temperaturaEstimadaC" DECIMAL(4,1),
    "carbohidratosObjetivoGH" DECIMAL(6,1),
    "liquidosObjetivoMlH" INTEGER,
    "sodioObjetivoMgH" INTEGER,
    "puestosAbastecimiento" TEXT,
    "estrategiaPrevia" TEXT,
    "recuperacion" TEXT,

    CONSTRAINT "planificaciones_carrera_pkey" PRIMARY KEY ("planificacionId")
);

-- CreateTable
CREATE TABLE "ingestas_planificacion" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "planificacionId" TEXT NOT NULL,
    "minuto" INTEGER NOT NULL,
    "km" DECIMAL(6,2),
    "notas" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ingestas_planificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alimentos_ingesta" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "ingestaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidadGramos" DECIMAL(8,1),
    "caloriasPor100" DECIMAL(7,2),
    "proteinasPor100" DECIMAL(7,2),
    "carbohidratosPor100" DECIMAL(7,2),
    "grasasPor100" DECIMAL(7,2),
    "unidadBase" "UnidadBaseAlimento" NOT NULL DEFAULT 'GRAMO',
    "medidas" JSONB NOT NULL DEFAULT '[]',
    "medida" TEXT,
    "cantidadMedida" DECIMAL(8,2),
    "cantidadPorMedida" DECIMAL(8,1),
    "fuente" TEXT,
    "referenciaExterna" TEXT,
    "alimentoOrigenId" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "alimentos_ingesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos_planificacion" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "pacienteId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_planificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_planificacion" (
    "id" TEXT NOT NULL,
    "nutricionistaId" TEXT NOT NULL,
    "planificacionId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "competenciaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_planificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planificaciones_deportivas_nutricionistaId_grupoId_idx" ON "planificaciones_deportivas"("nutricionistaId", "grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "planificaciones_deportivas_nutricionistaId_nombre_key" ON "planificaciones_deportivas"("nutricionistaId", "nombre");

-- CreateIndex
CREATE INDEX "planificaciones_carrera_nutricionistaId_idx" ON "planificaciones_carrera"("nutricionistaId");

-- CreateIndex
CREATE INDEX "ingestas_planificacion_nutricionistaId_planificacionId_idx" ON "ingestas_planificacion"("nutricionistaId", "planificacionId");

-- CreateIndex
CREATE INDEX "alimentos_ingesta_nutricionistaId_ingestaId_idx" ON "alimentos_ingesta"("nutricionistaId", "ingestaId");

-- CreateIndex
CREATE INDEX "alimentos_ingesta_nutricionistaId_alimentoOrigenId_idx" ON "alimentos_ingesta"("nutricionistaId", "alimentoOrigenId");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_planificacion_pacienteId_key" ON "grupos_planificacion"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_planificacion_nutricionistaId_nombre_key" ON "grupos_planificacion"("nutricionistaId", "nombre");

-- CreateIndex
CREATE INDEX "asignaciones_planificacion_nutricionistaId_pacienteId_idx" ON "asignaciones_planificacion"("nutricionistaId", "pacienteId");

-- CreateIndex
CREATE INDEX "asignaciones_planificacion_competenciaId_idx" ON "asignaciones_planificacion"("competenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_planificacion_planificacionId_pacienteId_key" ON "asignaciones_planificacion"("planificacionId", "pacienteId");

-- AddForeignKey
ALTER TABLE "planificaciones_deportivas" ADD CONSTRAINT "planificaciones_deportivas_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificaciones_deportivas" ADD CONSTRAINT "planificaciones_deportivas_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_planificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificaciones_carrera" ADD CONSTRAINT "planificaciones_carrera_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "planificaciones_deportivas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planificaciones_carrera" ADD CONSTRAINT "planificaciones_carrera_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestas_planificacion" ADD CONSTRAINT "ingestas_planificacion_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "planificaciones_deportivas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestas_planificacion" ADD CONSTRAINT "ingestas_planificacion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimentos_ingesta" ADD CONSTRAINT "alimentos_ingesta_ingestaId_fkey" FOREIGN KEY ("ingestaId") REFERENCES "ingestas_planificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alimentos_ingesta" ADD CONSTRAINT "alimentos_ingesta_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_planificacion" ADD CONSTRAINT "grupos_planificacion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos_planificacion" ADD CONSTRAINT "grupos_planificacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_planificacion" ADD CONSTRAINT "asignaciones_planificacion_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "planificaciones_deportivas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_planificacion" ADD CONSTRAINT "asignaciones_planificacion_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_planificacion" ADD CONSTRAINT "asignaciones_planificacion_competenciaId_fkey" FOREIGN KEY ("competenciaId") REFERENCES "competencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_planificacion" ADD CONSTRAINT "asignaciones_planificacion_nutricionistaId_fkey" FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La carrera tiene que existir para que haya algo que planificar.
ALTER TABLE "planificaciones_carrera"
  ADD CONSTRAINT "planificaciones_carrera_valores_validos"
  CHECK ("distanciaKm" > 0 AND "duracionEstimadaMin" > 0);
