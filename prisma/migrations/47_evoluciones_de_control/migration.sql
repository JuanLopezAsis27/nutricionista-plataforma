-- Evoluciones de control (migración 47).
--
-- Es la 47 y no la 46 porque ese número lo tomó `46_chats_del_asistente_del_paciente`,
-- que vive en la rama improvement/patient-ui y ya está aplicada en desarrollo.
--
-- El repaso cualitativo de una consulta: cumplimiento de la dieta,
-- entrenamiento, deposiciones, orina, descanso, si está indispuesta y cómo se
-- percibe. Es la contracara de `antropometrias` —las dos son "una por
-- consulta"— pero aquella guarda lo que se midió y esta lo que el paciente
-- contó.
--
-- Los campos son TEXT y no números ni enums a propósito: en la consulta se
-- anota "50%, 10 días no respetó por viaje" o "normales o constipada", y un
-- porcentaje solo perdería el motivo, que es la mitad del dato.
--
-- Dos piezas para los campos extra, igual que en la historia clínica
-- (migración 43):
--   * `campos_evolucion`: la definición del CONSULTORIO, que aparece en todas
--     sus evoluciones.
--   * `evoluciones.camposPersonalizados`: los VALORES de esa consulta,
--     incluidos los campos sueltos que nunca tuvieron definición.

CREATE TABLE "evoluciones" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "pacienteId" TEXT NOT NULL,
  "fecha" DATE NOT NULL,
  "cumplimientoDieta" TEXT,
  "entrenamiento" TEXT,
  "deposiciones" TEXT,
  "orina" TEXT,
  "descanso" TEXT,
  "indispuesta" TEXT,
  "sePercibe" TEXT,
  "camposPersonalizados" JSONB NOT NULL DEFAULT '[]',
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evoluciones_pkey" PRIMARY KEY ("id")
);

-- Una evolución por paciente y fecha, como la medición: es el repaso de ESA
-- consulta. Es además lo que hace que releer el mismo documento con la IA no
-- duplique lo ya cargado.
CREATE UNIQUE INDEX "evoluciones_pacienteId_fecha_key"
  ON "evoluciones" ("pacienteId", "fecha");
CREATE INDEX "evoluciones_pacienteId_fecha_idx"
  ON "evoluciones" ("pacienteId", "fecha");

ALTER TABLE "evoluciones"
  ADD CONSTRAINT "evoluciones_pacienteId_fkey"
  FOREIGN KEY ("pacienteId") REFERENCES "pacientes" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evoluciones"
  ADD CONSTRAINT "evoluciones_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "campos_evolucion" (
  "id" TEXT NOT NULL,
  "nutricionistaId" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "campos_evolucion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campos_evolucion_nutricionistaId_nombre_key"
  ON "campos_evolucion" ("nutricionistaId", "nombre");
CREATE UNIQUE INDEX "campos_evolucion_nutricionistaId_clave_key"
  ON "campos_evolucion" ("nutricionistaId", "clave");
CREATE INDEX "campos_evolucion_nutricionistaId_idx"
  ON "campos_evolucion" ("nutricionistaId");

ALTER TABLE "campos_evolucion"
  ADD CONSTRAINT "campos_evolucion_nutricionistaId_fkey"
  FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
