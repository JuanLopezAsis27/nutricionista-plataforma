import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import { ErrorArchivoInvalido } from "@/dominio/errores/ErrorArchivoInvalido";

/** Entrada del caso de uso. `archivoId` en null significa "quitar la foto". */
export interface EntradaCambiarFotoPerfil {
  usuarioId: string;
  archivoId: string | null;
}

/**
 * Caso de uso: elegir (o quitar) la foto de perfil de una cuenta.
 *
 * La imagen ya está en el bucket cuando esto corre: la subió el navegador por
 * `/api/archivos` con contexto `perfil`, porque los archivos nunca viajan por
 * tRPC. Acá se hacen las dos cosas que faltan.
 *
 * ## 1. Apuntar la cuenta a la imagen nueva
 *
 * Se comprueba que el archivo exista y que sea del contexto `perfil`. Lo
 * segundo no es formalismo: las otras imágenes que un paciente puede subir son
 * las fotos de comida de su diario, y aceptar una de esas como foto de perfil
 * haría que el borrado del paso 2 se llevara puesto un registro del diario.
 *
 * ## 2. Borrar la anterior
 *
 * Una foto de perfil reemplazada no le sirve a nadie, y si no se borra queda
 * para siempre: el barrido de huérfanos del worker limpia objetos del bucket
 * SIN fila de metadatos, y esta tiene fila. Sin este paso, cada cambio de foto
 * deja un archivo muerto que nada vuelve a mirar.
 *
 * El orden importa: primero se guarda el usuario apuntando a la foto nueva y
 * recién después se borra la vieja. Al revés, un fallo entre los dos pasos
 * dejaría a la cuenta apuntando a un archivo que ya no existe. Y el borrado va
 * fila → bucket, igual que `EliminarArchivo`: un objeto huérfano lo recoge la
 * limpieza semanal, una fila sin objeto rompe la imagen.
 */
export class CambiarFotoPerfil {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(entrada: EntradaCambiarFotoPerfil): Promise<void> {
    const usuario = await this.usuarios.obtenerPorId(entrada.usuarioId);
    if (!usuario) {
      throw new ErrorUsuarioNoEncontrado(entrada.usuarioId);
    }

    if (entrada.archivoId) {
      // El alcance de inquilino filtra esta lectura, así que un archivo de otro
      // consultorio no aparece y cae en "no encontrado".
      const nueva = await this.archivos.obtenerPorId(entrada.archivoId);
      if (!nueva) {
        throw new ErrorArchivoNoEncontrado(entrada.archivoId);
      }
      if (!nueva.esDeContexto("perfil")) {
        throw new ErrorArchivoInvalido(
          "Ese archivo no es una foto de perfil válida.",
        );
      }
    }

    const anteriorId = usuario.fotoPerfilId;
    if (anteriorId === entrada.archivoId) return;

    await this.usuarios.actualizar(
      usuario.cambiarFotoPerfil(entrada.archivoId),
    );

    if (anteriorId) {
      const anterior = await this.archivos.obtenerPorId(anteriorId);
      if (anterior) {
        await this.archivos.eliminar(anteriorId);
        await this.almacenamiento.eliminar(anterior.clave);
      }
    }
  }
}
