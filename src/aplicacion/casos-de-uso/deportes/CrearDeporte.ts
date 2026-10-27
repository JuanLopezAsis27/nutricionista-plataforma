import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import { Deporte } from "@/dominio/entidades/Deporte";
import { ErrorDeporteDuplicado } from "@/dominio/errores/ErrorDeporteDuplicado";

/**
 * Caso de uso: sumar un deporte a la lista de la plataforma (solo el
 * SUPERADMIN, migración 97). Lo ven al instante todos los consultorios.
 */
export class CrearDeporte {
  constructor(private readonly deportes: IDeporteRepositorio) {}

  async ejecutar(nombre: string): Promise<Deporte> {
    const deporte = Deporte.crear({ nombre }, crypto.randomUUID());
    await verificarNombreLibre(deporte, this.deportes);
    return this.deportes.crear(deporte);
  }
}

/** El índice único es la garantía dura; esto da el mensaje entendible. */
export async function verificarNombreLibre(
  deporte: Deporte,
  deportes: IDeporteRepositorio,
): Promise<void> {
  if (await deportes.existeNombre(deporte.claveNombre, deporte.id)) {
    throw new ErrorDeporteDuplicado(deporte.nombre);
  }
}
