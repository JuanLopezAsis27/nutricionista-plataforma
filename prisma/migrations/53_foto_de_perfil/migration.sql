-- Migración 53 — Foto de perfil del usuario
--
-- La FK va en `usuarios` y NO en `archivos`, al revés que las fotos de receta o
-- de evolución. El arco exclusivo de `archivos` responde a "¿de qué cosa es
-- este archivo?" y sus dueños son entidades de contenido (una receta, un plan,
-- un laboratorio). Una foto de perfil no es un adjunto de la cuenta: es algo
-- que la cuenta TIENE, y por eso sigue el patrón del logo del membrete
-- (`configuracion_consultorio.logoArchivoId`).
--
-- Consecuencia buscada: la foto de perfil es un archivo SIN dueño. Eso es
-- legítimo desde la migración 34, que cambió el CHECK `archivos_un_solo_dueno`
-- de `= 1` a `<= 1`; y no la toca el barrido de huérfanos del worker, que
-- borra objetos del bucket sin fila de metadatos, no filas sin dueño.
--
-- SetNull: si el archivo se borra, la cuenta queda sin foto. Con CASCADE,
-- borrar una imagen se llevaría puesto al usuario.

ALTER TABLE "usuarios" ADD COLUMN "fotoPerfilId" TEXT;

-- Por acá entra la pregunta "¿este archivo es la foto de perfil de alguien?",
-- que es la que autoriza a un paciente a ver la foto de su nutricionista en el
-- chat (ver PuedeVerArchivoPaciente). Va con `nutricionistaId` adelante como el
-- resto de los índices de tablas de inquilino.
CREATE INDEX "usuarios_nutricionistaId_fotoPerfilId_idx"
  ON "usuarios" ("nutricionistaId", "fotoPerfilId");

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_fotoPerfilId_fkey"
  FOREIGN KEY ("fotoPerfilId") REFERENCES "archivos" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
