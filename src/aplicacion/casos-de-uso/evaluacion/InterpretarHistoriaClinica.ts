import type { IInterpretadorHistoriaClinica } from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type { LecturaHistoriaClinica } from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ICampoEvolucionRepositorio } from "@/dominio/repositorios/ICampoEvolucionRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: sugerir los campos de la historia clínica y las evoluciones de
 * control a partir de un documento ya subido.
 *
 * No persiste nada; los formularios se precargan y el profesional guarda (o
 * no) como cualquier otra edición.
 *
 * Las dos lecturas van juntas porque el documento suele ser uno solo —la ficha
 * adelante, el seguimiento consulta a consulta atrás— y partirlo en dos
 * llamadas al modelo costaría el doble para leer el mismo archivo.
 */
export class InterpretarHistoriaClinica {
  constructor(
    private readonly interpretador: IInterpretadorHistoriaClinica,
    private readonly archivos: IArchivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly camposEvolucion: ICampoEvolucionRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    archivoId: string;
  }): Promise<LecturaHistoriaClinica> {
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

    // Los campos de evolución propios del consultorio se le describen a la IA
    // para que los busque en el documento, igual que los 7 fijos.
    const definidos = await this.camposEvolucion.obtenerTodos();

    return this.interpretador.interpretar(
      { clave: archivo.clave, mimeType: archivo.mimeType },
      definidos.map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.nombre,
        descripcion: campo.descripcion,
      })),
    );
  }
}
