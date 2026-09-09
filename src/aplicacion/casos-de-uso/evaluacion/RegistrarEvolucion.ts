import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import {
  Evolucion,
  type DatosNuevaEvolucion,
} from "@/dominio/entidades/Evolucion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorEvolucionDuplicada } from "@/dominio/errores/ErrorEvolucionDuplicada";

/** Datos de entrada: la evolución + ids de fotos ya subidas al bucket. */
export interface DatosRegistrarEvolucion extends DatosNuevaEvolucion {
  fotoIds?: string[];
}

/**
 * Caso de uso: registrar la evolución de control de una consulta.
 *
 * Regla: una sola evolución por paciente y fecha, igual que la medición. Es el
 * repaso de ESA consulta, y dos repasos del mismo día serían el mismo dato
 * partido en dos fichas que después nadie sabe cuál leer.
 */
export class RegistrarEvolucion {
  constructor(
    private readonly evoluciones: IEvolucionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly archivos: IArchivoRepositorio,
  ) {}

  async ejecutar(datos: DatosRegistrarEvolucion): Promise<Evolucion> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const evolucion = Evolucion.crear(datos, crypto.randomUUID());

    if (
      await this.evoluciones.existeEnFecha(datos.pacienteId, evolucion.fecha)
    ) {
      throw new ErrorEvolucionDuplicada(evolucion.fecha);
    }

    const creada = await this.evoluciones.crear(evolucion);

    // Las fotos se suben antes (módulo Archivos) y acá solo se vinculan a la
    // evolución, igual que las fotos de una receta.
    for (const fotoId of datos.fotoIds ?? []) {
      await this.archivos.vincularDueno(fotoId, { evolucionId: creada.id });
    }

    return creada;
  }
}
