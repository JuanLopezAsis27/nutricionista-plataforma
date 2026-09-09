import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Laboratorio,
  type DatosNuevoLaboratorio,
} from "@/dominio/entidades/Laboratorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Datos de entrada: el estudio + ids de archivos ya subidos al bucket. */
export interface DatosRegistrarLaboratorio extends DatosNuevoLaboratorio {
  archivoIds?: string[];
}

/**
 * Caso de uso: registrar un laboratorio con sus adjuntos.
 * Los archivos se suben antes (módulo Archivos) y acá solo se vinculan.
 */
export class RegistrarLaboratorio {
  constructor(
    private readonly laboratorios: ILaboratorioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosRegistrarLaboratorio): Promise<Laboratorio> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const laboratorio = Laboratorio.crear(datos, crypto.randomUUID());
    return this.laboratorios.crear(laboratorio, datos.archivoIds ?? []);
  }
}
