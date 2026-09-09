import type { IInterpretadorFichaPaciente } from "@/dominio/servicios/IInterpretadorFichaPaciente";
import type { FichaPacienteSugerida } from "@/dominio/servicios/IInterpretadorFichaPaciente";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";

/**
 * Caso de uso: leer una ficha subida y sugerir con qué dar de alta al paciente.
 *
 * No persiste NADA. Devuelve lo que la IA reconoció para que el formulario de
 * alta se precargue y el profesional revise antes de guardar.
 *
 * El archivo tiene que estar huérfano: es el que se acaba de subir para dar de
 * alta a alguien que todavía no existe. Uno que ya pertenece a otro paciente no
 * se acepta —sería leer la ficha de una persona para crear otra—, y el arco de
 * dueños de `archivos` ya admite el huérfano temporal (migración 34).
 */
export class InterpretarFichaPaciente {
  constructor(
    private readonly interpretador: IInterpretadorFichaPaciente,
    private readonly archivos: IArchivoRepositorio,
    private readonly campos: ICampoHistoriaClinicaRepositorio,
  ) {}

  async ejecutar(datos: { archivoId: string }): Promise<FichaPacienteSugerida> {
    const archivo = await this.archivos.obtenerPorId(datos.archivoId);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(datos.archivoId);
    }

    const dueno = await this.archivos.obtenerDueno(datos.archivoId);
    if (dueno && Object.values(dueno).some((id) => id != null)) {
      throw new ErrorArchivoNoEncontrado(datos.archivoId);
    }

    // Los campos propios del consultorio se le describen a la IA para que los
    // busque en el documento, igual que los 7 fijos.
    const definidos = await this.campos.obtenerTodos();

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
