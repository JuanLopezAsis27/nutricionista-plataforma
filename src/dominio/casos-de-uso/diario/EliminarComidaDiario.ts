import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "../../servicios/IAlmacenamientoArchivos";
import { ErrorRegistroDiarioNoEncontrado } from "../../errores/ErrorRegistroDiarioNoEncontrado";
import { ErrorAccesoDenegado } from "../../errores/ErrorAccesoDenegado";

/**
 * Caso de uso: eliminar una comida del diario (solo del propio paciente).
 * Si la comida tenía foto, la fila cae en cascada y el objeto del bucket se
 * elimina explícitamente.
 */
export class EliminarComidaDiario {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(pacienteId: string, comidaId: string): Promise<void> {
    const comida = await this.registros.obtenerComida(comidaId);
    if (!comida) {
      throw new ErrorRegistroDiarioNoEncontrado("esa comida en el diario");
    }
    if (comida.pacienteId !== pacienteId) {
      throw new ErrorAccesoDenegado("La comida pertenece a otro paciente.");
    }

    const fotos = await this.archivos.listarPorDueno({
      comidaConsumidaId: comidaId,
    });
    await this.registros.eliminarComida(comidaId);

    for (const foto of fotos) {
      await this.almacenamiento.eliminar(foto.clave);
    }
  }
}
