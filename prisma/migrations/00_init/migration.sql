-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('NUTRICIONISTA', 'PACIENTE');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'COMPLETADO');

-- CreateEnum
CREATE TYPE "TipoComida" AS ENUM ('DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA');

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "duracionMinutos" INTEGER NOT NULL DEFAULT 30,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dietas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comidas" (
    "id" TEXT NOT NULL,
    "dietaId" TEXT NOT NULL,
    "tipo" "TipoComida" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "calorias" INTEGER,

    CONSTRAINT "comidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_dieta" (
    "id" TEXT NOT NULL,
    "dietaId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "asignaciones_dieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'PACIENTE',
    "pacienteId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_email_key" ON "pacientes"("email");

-- CreateIndex
CREATE INDEX "pacientes_apellido_nombre_idx" ON "pacientes"("apellido", "nombre");

-- CreateIndex
CREATE INDEX "turnos_pacienteId_idx" ON "turnos"("pacienteId");

-- CreateIndex
CREATE INDEX "turnos_fecha_idx" ON "turnos"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_fecha_hora_key" ON "turnos"("fecha", "hora");

-- CreateIndex
CREATE INDEX "comidas_dietaId_idx" ON "comidas"("dietaId");

-- CreateIndex
CREATE INDEX "asignaciones_dieta_pacienteId_idx" ON "asignaciones_dieta"("pacienteId");

-- CreateIndex
CREATE INDEX "asignaciones_dieta_dietaId_idx" ON "asignaciones_dieta"("dietaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_pacienteId_key" ON "usuarios"("pacienteId");

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comidas" ADD CONSTRAINT "comidas_dietaId_fkey" FOREIGN KEY ("dietaId") REFERENCES "dietas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_dieta" ADD CONSTRAINT "asignaciones_dieta_dietaId_fkey" FOREIGN KEY ("dietaId") REFERENCES "dietas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_dieta" ADD CONSTRAINT "asignaciones_dieta_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

