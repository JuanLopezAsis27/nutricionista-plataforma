import type { Paciente } from "../entidades/Paciente";

/** Criterios opcionales de paginación y búsqueda para listar pacientes. */
export interface FiltroPacientes {
  busqueda?: string;
  limite?: number;
  desplazamiento?: number;
  /** Por defecto los listados solo traen pacientes vigentes (no archivados). */
  incluirArchivados?: boolean;
  /** Filtra por si ya se le mandó (o no) el email de bienvenida. */
  bienvenida?: "enviada" | "no_enviada";
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
  /**
   * @param esperadoEn Bloqueo optimista: el `actualizadoEn` que el cliente
   * leyó. Cuando viene, la escritura solo entra si la fila sigue en esa
   * versión; si otro la tocó, lanza `ErrorEdicionConcurrente` en vez de pisar
   * sus cambios. La condición va en el WHERE del UPDATE y no en un chequeo
   * previo: entre leer y escribir hay una ventana, y el motor es el único que
   * no la tiene. Omitirlo es escribir sin guardia, que es lo correcto para las
   * mutaciones de un solo campo que no salen de un formulario (archivar,
   * marcar la bienvenida).
   */
  actualizar(paciente: Paciente, esperadoEn?: Date): Promise<Paciente>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<Paciente | null>;
  /**
   * Varios pacientes por id, en UNA consulta, **archivados incluidos**, igual
   * que `obtenerPorId`. Es para resolver nombres de algo que ya apunta a ellos
   * (los turnos de una semana): archivar a alguien no borra sus turnos viejos,
   * y esos tienen que seguir diciendo de quién son. Los ids que no existen
   * simplemente no vuelven; el orden no está garantizado.
   */
  obtenerPorIds(ids: readonly string[]): Promise<Paciente[]>;
  /**
   * Las fichas con ese teléfono (E.164 sin "+"), de la más antigua a la más
   * nueva. Pueden ser varias desde la migración 81: dos hermanos con el
   * teléfono de la madre. Cuál recibe un WhatsApp lo decide
   * `elegirFichaDelTelefono`.
   */
  listarPorTelefonoE164(telefonoE164: string): Promise<Paciente[]>;
  /**
   * Lo mismo para varios números en UNA consulta (la bandeja de Mensajes
   * agrupa por número compartido). Mismo orden: la más antigua primero.
   */
  listarPorTelefonosE164(telefonos: readonly string[]): Promise<Paciente[]>;
  /**
   * Las fichas del consultorio con ese email de contacto. Puede haber varias
   * (migración 79: hermanos con el de la madre); el formulario lo avisa.
   */
  listarPorEmail(email: string): Promise<Paciente[]>;
  listar(filtro?: FiltroPacientes): Promise<Paciente[]>;
  contar(filtro?: FiltroPacientes): Promise<number>;
}
