import type { IInterpretadorMediciones } from "@/dominio/servicios/IInterpretadorMediciones";
import type { MedicionesSugeridas } from "@/dominio/servicios/IInterpretadorMediciones";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: leer una planilla de evolución ya subida y sugerir las
 * mediciones que trae, para importarlas al historial del paciente.
 *
 * No persiste NADA. Devuelve lo que la IA reconoció; el profesional revisa
 * columna por columna y decide cuáles importar, que es la misma política que
 * la lectura de una ficha o de una historia clínica.
 */
export class InterpretarMediciones {
  constructor(
    private readonly interpretador: IInterpretadorMediciones,
    private readonly archivos: IArchivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    archivoId: string;
  }): Promise<MedicionesSugeridas> {
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
