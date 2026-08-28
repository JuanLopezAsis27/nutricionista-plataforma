import type { Paciente } from "../entidades/Paciente";

/** Criterios opcionales de paginación y búsqueda para listar pacientes. */
export interface FiltroPacientes {
  busqueda?: string;
  limite?: number;
  desplazamiento?: number;
  /** Por defecto los listados solo traen pacientes vigentes (no archivados). */
  incluirArchivados?: boolean;
}

/**
 * Contrato del repositorio de Paciente (puerto de salida del dominio).
 *
 * El dominio depende de esta interfaz, nunca de su implementación con Prisma
 * (DIP). Una interfaz específica por entidad evita métodos que no apliquen
 * a Paciente (ISP).
 */
export interface IPacienteRepositorio {
  crear(paciente: Paciente): Promise<Paciente>;
  actualizar(paciente: Paciente): Promise<Paciente>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Paciente | null>;
  obtenerPorEmail(email: string): Promise<Paciente | null>;
  /**
   * Busca por la forma canónica del teléfono (E.164 sin "+"). Es la consulta
   * que usa la ingesta de WhatsApp: va por índice único, no recorre la tabla.
   */
  obtenerPorTelefonoE164(telefonoE164: string): Promise<Paciente | null>;
  listar(filtro?: FiltroPacientes): Promise<Paciente[]>;
  contar(filtro?: FiltroPacientes): Promise<number>;
}
