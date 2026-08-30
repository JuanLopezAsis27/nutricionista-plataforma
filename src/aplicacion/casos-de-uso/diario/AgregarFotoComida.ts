import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import { ErrorRegistroDiarioNoEncontrado } from "@/dominio/errores/ErrorRegistroDiarioNoEncontrado";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";

/**
 * Caso de uso: vincular una foto (ya subida al bucket) a una comida del
 * diario. Si la comida ya tenía foto, la anterior se elimina (fila + objeto).
 * Estas fotos son el insumo del futuro análisis nutricional con IA de visión.
 */
export class AgregarFotoComida {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async ejecutar(
    pacienteId: string,
    comidaId: string,
    archivoId: string,
  ): Promise<void> {
    const comida = await this.registros.obtenerComida(comidaId);
    if (!comida) {
      throw new ErrorRegistroDiarioNoEncontrado("esa comida en el diario");
    }
    if (comida.pacienteId !== pacienteId) {
      throw new ErrorAccesoDenegado("La comida pertenece a otro paciente.");
    }

    const archivo = await this.archivos.obtenerPorId(archivoId);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(archivoId);
    }

    // Reemplaza la foto anterior si existía.
    const anteriores = await this.archivos.listarPorDueno({
      comidaConsumidaId: comidaId,
    });
    for (const anterior of anteriores) {
      await this.archivos.eliminar(anterior.id);
      await this.almacenamiento.eliminar(anterior.clave);
    }

    await this.archivos.vincularDueno(archivoId, {
      comidaConsumidaId: comidaId,
    });
  }
}
