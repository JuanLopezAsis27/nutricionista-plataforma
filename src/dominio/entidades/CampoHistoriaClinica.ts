import { ErrorValidacion } from "../errores/ErrorValidacion";
import { derivarClave } from "../servicios/claveCampo";

/** Tope de campos personalizados por consultorio. */
export const MAXIMO_CAMPOS_PERSONALIZADOS = 30;

/** Datos para dar de alta o editar un campo personalizado del consultorio. */
export interface DatosCampoHistoriaClinica {
  nombre: string;
  /** Ayuda para el profesional y, además, pista para la IA al interpretar. */
  descripcion?: string | null;
  orden?: number;
}

/** Estado completo de un campo personalizado persistido. */
export interface PropiedadesCampoHistoriaClinica {
  id: string;
  /**
   * Identificador estable con el que se guarda el VALOR en cada historia.
   *
   * Se deriva del nombre al crearlo y después NO cambia nunca, ni siquiera si
   * el profesional renombra el campo. Es lo que permite que "Adherencia" pase
   * a llamarse "Adherencia previa" sin que se vacíen las historias de los 300
   * pacientes que ya lo tenían cargado.
   */
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Campo personalizado de historia clínica, definido por el consultorio.
 *
 * Existe porque los 7 campos fijos de la historia clínica son el mínimo común
 * y cada profesional sigue además lo suyo (adherencia previa, suplementos,
 * horario de trabajo). Definidos acá, aparecen en la historia de TODOS los
 * pacientes del consultorio, que es lo que los hace comparables entre sí.
 *
 * Es el mismo modelo que `PlantillaAntropometrica`: una lista por inquilino que
 * configura qué se pide al cargar. Los campos sueltos de UN paciente son otra
 * cosa y viven en la propia historia (ver `HistoriaClinica`).
 */
export class CampoHistoriaClinica {
  private constructor(
    private readonly props: PropiedadesCampoHistoriaClinica,
  ) {}

  static crear(
    datos: DatosCampoHistoriaClinica,
    id: string,
    ahora: Date = new Date(),
  ): CampoHistoriaClinica {
    const nombre = normalizarNombre(datos.nombre);
    return new CampoHistoriaClinica({
      id,
      clave: derivarClave(nombre),
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      orden: datos.orden ?? 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesCampoHistoriaClinica,
  ): CampoHistoriaClinica {
    return new CampoHistoriaClinica(props);
  }

  /**
   * Versión editada e inmutable. La `clave` se preserva a propósito: renombrar
   * un campo no puede desconectarlo de los valores ya cargados.
   */
  actualizar(
    cambios: Partial<DatosCampoHistoriaClinica>,
    ahora: Date = new Date(),
  ): CampoHistoriaClinica {
    return CampoHistoriaClinica.reconstruir({
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

  aPrimitivos(): PropiedadesCampoHistoriaClinica {
    return { ...this.props };
  }
}

function normalizarNombre(nombre: string): string {
  const limpio = nombre?.trim() ?? "";
  if (limpio.length === 0) {
    throw new ErrorValidacion("El campo personalizado necesita un nombre.");
  }
  if (limpio.length > 80) {
    throw new ErrorValidacion(
      "El nombre del campo personalizado no puede superar los 80 caracteres.",
    );
  }
  return limpio;
}
