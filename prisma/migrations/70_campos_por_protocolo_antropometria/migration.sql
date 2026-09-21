-- Qué medidas pide el formulario de antropometría en cada protocolo, elegido
-- por el consultorio. Hasta ahora los dos protocolos mostraban el mismo juego
-- de campos cableado en el formulario.
--
-- Arrancan VACÍOS a propósito: el mapeador resuelve el vacío contra
-- `CAMPOS_PROTOCOLO_POR_DEFECTO` al leer, así que las filas existentes siguen
-- viendo exactamente el formulario de hoy sin backfill, y la lista de medidas
-- no queda congelada en SQL —donde nadie la mantendría al sumar un sitio—.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "camposDosComponentes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "camposCincoComponentes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
