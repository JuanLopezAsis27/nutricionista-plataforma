import { ErrorValidacion } from "../errores/ErrorValidacion";
import { derivarClave } from "../servicios/claveCampo";

/** Tope de campos personalizados de evolución por consultorio. */
export const MAXIMO_CAMPOS_EVOLUCION = 30;

/** Datos para dar de alta o editar un campo de evolución del consultorio. */
export interface DatosCampoEvolucion {
  nombre: string;
  /** Ayuda para el profesional y, además, pista para la IA al interpretar. */
  descripcion?: string | null;
  orden?: number;
}

/** Estado completo de un campo de evolución persistido. */
export interface PropiedadesCampoEvolucion {
  id: string;
  /**
   * Identificador estable con el que se guarda el VALOR en cada evolución.
   * Se deriva del nombre al crearlo y después NO cambia, ni al renombrar.
   */
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Campo personalizado de EVOLUCIÓN, definido por el consultorio.
 *
 * Es el mismo modelo que `CampoHistoriaClinica` y son dos listas separadas a
 * propósito: la historia clínica se carga UNA vez por paciente y describe de
 * dónde viene; la evolución se carga en CADA consulta y describe cómo viene.
 * Un campo como «antecedentes familiares» no tiene sentido repetirlo consulta
 * a consulta, y uno como «horas de pantalla esta semana» no tiene sentido
 * congelarlo en el alta. Mezclarlas obligaría a que cada campo declarara en
 * cuál de los dos formularios aparece, que es la misma separación con un
 * flag y una fuente más de error.
 */
export class CampoEvolucion {
  private constructor(private readonly props: PropiedadesCampoEvolucion) {}

  static crear(
    datos: DatosCampoEvolucion,
    id: string,
    ahora: Date = new Date(),
  ): CampoEvolucion {
    const nombre = normalizarNombre(datos.nombre);
    return new CampoEvolucion({
      id,
      clave: derivarClave(nombre),
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      orden: datos.orden ?? 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesCampoEvolucion): CampoEvolucion {
    return new CampoEvolucion(props);
  }

  /**
   * Versión editada e inmutable. La `clave` se preserva a propósito: renombrar
   * un campo no puede desconectarlo de los valores ya cargados.
   */
  actualizar(
    cambios: Partial<DatosCampoEvolucion>,
    ahora: Date = new Date(),
  ): CampoEvolucion {
    return CampoEvolucion.reconstruir({
      ...this.props,
      nombre:
        cambios.nombre !== undefined
          ? normalizarNombre(cambios.nombre)
          : this.props.nombre,
      descripcion:
        cambios.descripcion !== undefined
          ? cambios.descripcion?.trim() || null
          : this.props.descripcion,
      orden: cambios.orden ?? this.props.orden,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get clave(): string {
    return this.props.clave;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get descripcion(): string | null {
    return this.props.descripcion;
  }
  get orden(): number {
    return this.props.orden;
  }

  aPrimitivos(): PropiedadesCampoEvolucion {
    return { ...this.props };
  }
}

function normalizarNombre(nombre: string): string {
  const limpio = nombre?.trim() ?? "";
  if (limpio.length === 0) {
    throw new ErrorValidacion("El campo de evolución necesita un nombre.");
  }
  if (limpio.length > 80) {
    throw new ErrorValidacion(
      "El nombre del campo de evolución no puede superar los 80 caracteres.",
    );
  }
  return limpio;
}
