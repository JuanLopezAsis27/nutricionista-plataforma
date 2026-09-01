import type { IInterpretadorHistoriaClinica } from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { CamposHistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: sugerir los campos de la historia clínica a partir de una foto
 * ya subida. No persiste nada; el formulario se precarga y el profesional
 * guarda (o no) como cualquier otra edición.
 */
export class InterpretarHistoriaClinica {
  constructor(
    private readonly interpretador: IInterpretadorHistoriaClinica,
    private readonly archivos: IArchivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    archivoId: string;
  }): Promise<Partial<CamposHistoriaClinica>> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const archivo = await this.archivos.obtenerPorId(datos.archivoId);
    if (!archivo) {
      throw new ErrorValidacion("El archivo no existe.");
    }
    const dueno = await this.archivos.obtenerDueno(datos.archivoId);
    if (dueno?.pacienteId !== datos.pacienteId) {
      throw new ErrorValidacion("El archivo no pertenece a este paciente.");
    }

    return this.interpretador.interpretar({
      clave: archivo.clave,
      mimeType: archivo.mimeType,
    });
  }
}
