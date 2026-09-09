-- Migración 34 — Un archivo puede estar sin dueño MIENTRAS se lo sube
--
-- La migración 27 agregó `archivos_un_solo_dueno` exigiendo EXACTAMENTE un
-- dueño. La intención era buena —un archivo no puede pertenecer a dos cosas a
-- la vez— pero el conteo `= 1` prohibió un paso que la app da siempre:
--
--   1. el profesional sube las fotos de una receta que TODAVÍA NO EXISTE,
--   2. guarda la receta, y recién ahí los archivos se vinculan
--      (`vincularDueno`, con los ids que junta `CrearReceta`).
--
-- En el paso 1 no hay `recetaId` que poner, porque la receta se crea en el
-- paso 2. Lo mismo pasa con los materiales de biblioteca y con los adjuntos de
-- laboratorio. El resultado era que adjuntar cualquier archivo fallaba con un
-- 23514 y el archivo quedaba en el bucket sin fila (la compensación de
-- `SubirArchivo` lo borra, pero el profesional solo veía "error de Prisma").
--
-- El resto del modelo ya asumía que el huérfano existe: `obtenerDueno`
-- documenta "todas las FKs en null si está huérfano" y `DuenoArchivo` tiene
-- todos sus campos opcionales. El `= 1` era la pieza que no encajaba.
--
-- Queda `<= 1`, que es el invariante que de verdad importa: un archivo no
-- pertenece a dos dueños. Estar sin dueño pasa a ser un estado TRANSITORIO y
-- legítimo, y el barrido de huérfanos del worker se encarga de los que quedan
-- colgados cuando alguien abandona el formulario a mitad de camino.

ALTER TABLE "archivos" DROP CONSTRAINT "archivos_un_solo_dueno";

ALTER TABLE "archivos" ADD CONSTRAINT "archivos_un_solo_dueno" CHECK (
  (("pacienteId"        IS NOT NULL)::int
 + ("laboratorioId"     IS NOT NULL)::int
 + ("comidaConsumidaId" IS NOT NULL)::int
 + ("recetaId"          IS NOT NULL)::int
 + ("materialId"        IS NOT NULL)::int) <= 1
);

-- ---------------------------------------------------------------------------
-- Margen para volver a avisar
--
-- El envío manual omite a quien ya recibió el aviso, pero "ya recibió" no
-- puede ser para siempre: un turno que se agendó con tres semanas y se
-- reprograma dos veces necesita más de un aviso, y hasta ahora la única forma
-- de mandarlo era tildar "reenviar", que apaga la protección por completo para
-- TODO el lote.
--
-- Con el margen, la regla pasa a ser temporal: se omite a quien recibió un
-- aviso hace menos de N horas, y pasado ese plazo se lo puede volver a avisar
-- sin desactivar nada. El default de 24 h es lo que separa dos avisos
-- consecutivos de cualquier programación razonable.
ALTER TABLE "configuracion_recordatorios"
  ADD COLUMN "horasEntreAvisos" INTEGER NOT NULL DEFAULT 24;
