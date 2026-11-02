import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  FORMATOS_PLANIFICACION,
  type FormatoPlanificacion,
} from "./PlanificacionDeportiva";

/** Largo máximo del nombre de un deporte (el del texto libre que reemplazó). */
export const LARGO_MAXIMO_NOMBRE_DEPORTE = 80;

/** Lo que guarda y muestra un perfil deportivo de su deporte. */
export interface ReferenciaDeporte {
  id: string;
  nombre: string;
  /**
   * Qué planificación le corresponde (migración 98); null = todavía ninguna.
   * Viaja con el perfil para que la ficha sepa qué ofrecer.
   */
  formatoPlanificacion: FormatoPlanificacion | null;
}

export interface PropiedadesDeporte {
  id: string;
  nombre: string;
  formatoPlanificacion: FormatoPlanificacion | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Deporte: uno de la lista de la PLATAFORMA («Atletismo»,
 * «Fútbol», «Trail running»), que es de donde sale el deporte de un perfil
 * deportivo (migración 97).
 *
 * Fue texto libre hasta ahí. Pasó a ser una lista porque cada profesional lo
 * escribía a su manera («running», «Running calle», «atletismo»), y porque
 * una lista es lo que permite atar a cada deporte la planificación que le
 * corresponde (`formatoPlanificacion`, migración 98). La administra SOLO el
 * SUPERADMIN: no hay deportes propios de un consultorio.
 *
 * Invariantes: nombre obligatorio y corto; el formato, uno de la lista o
 * ninguno. La unicidad del nombre (sin mayúsculas, tildes ni espacios de más,
 * `claveNombre`) la verifica el caso de uso y la sostiene un índice único.
 */
export class Deporte {
  private constructor(private readonly props: PropiedadesDeporte) {}

  static crear(
    datos: {
      nombre: string;
      formatoPlanificacion?: FormatoPlanificacion | null;
    },
    id: string,
    ahora: Date = new Date(),
  ): Deporte {
    return new Deporte({
      id,
      nombre: nombreValido(datos.nombre),
      formatoPlanificacion: formatoValido(datos.formatoPlanificacion),
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesDeporte): Deporte {
    return new Deporte(props);
  }

  /** Copia con otro nombre. Los perfiles lo llevan por id: cambia en todos. */
  renombrar(nombre: string, ahora: Date = new Date()): Deporte {
    return new Deporte({
      ...this.props,
      nombre: nombreValido(nombre),
      actualizadoEn: ahora,
    });
  }

  /**
   * Copia con otra planificación (o ninguna). No toca las planificaciones ya
   * hechas: decide con qué ARRANCA la próxima de quien hace este deporte.
   */
  conFormato(
    formato: FormatoPlanificacion | null,
    ahora: Date = new Date(),
  ): Deporte {
    return new Deporte({
      ...this.props,
      formatoPlanificacion: formatoValido(formato),
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get formatoPlanificacion(): FormatoPlanificacion | null {
    return this.props.formatoPlanificacion;
  }

  /** «Fútbol» y «futbol » son el mismo deporte. */
  get claveNombre(): string {
    return claveNombreDeporte(this.props.nombre);
  }

  get referencia(): ReferenciaDeporte {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      formatoPlanificacion: this.props.formatoPlanificacion,
    };
  }

  aPrimitivos(): PropiedadesDeporte {
    return { ...this.props };
  }
}

/**
 * La clave de unicidad del nombre de un deporte: minúsculas, sin tildes ni
 * espacios de más. La migración 97 la calcula igual en SQL.
 */
export function claveNombreDeporte(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function nombreValido(nombre: string | undefined): string {
  const limpio = (nombre ?? "").trim().replace(/\s+/g, " ");
  if (limpio.length === 0) {
    throw new ErrorValidacion("El deporte debe tener un nombre.");
  }
  if (limpio.length > LARGO_MAXIMO_NOMBRE_DEPORTE) {
    throw new ErrorValidacion(
      `El nombre del deporte no puede superar los ${LARGO_MAXIMO_NOMBRE_DEPORTE} caracteres.`,
    );
  }
  return limpio;
}

function formatoValido(
  formato: FormatoPlanificacion | null | undefined,
): FormatoPlanificacion | null {
  if (formato == null) return null;
  if (!FORMATOS_PLANIFICACION.includes(formato)) {
    throw new ErrorValidacion("La planificación del deporte no es válida.");
  }
  return formato;
}
