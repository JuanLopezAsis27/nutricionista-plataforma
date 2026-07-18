import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Campos de contenido de la historia clínica (todos opcionales). */
export interface CamposHistoriaClinica {
  motivoConsulta: string | null;
  diagnosticos: string | null;
  medicacion: string | null;
  antecedentesPersonales: string | null;
  antecedentesFamiliares: string | null;
  habitos: string | null;
  contexto: string | null;
}

/** Datos para crear o actualizar la historia clínica. */
export interface DatosHistoriaClinica extends Partial<CamposHistoriaClinica> {
  pacienteId: string;
}

/** Estado completo de una historia clínica persistida. */
export interface PropiedadesHistoriaClinica extends CamposHistoriaClinica {
  id: string;
  pacienteId: string;
  actualizadoEn: Date;
}

const CAMPOS_CONTENIDO = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "habitos",
  "contexto",
] as const satisfies readonly (keyof CamposHistoriaClinica)[];

/**
 * Entidad de dominio Historia Clínica (una por paciente).
 *
 * Invariantes: pertenece a un paciente y al menos un campo tiene contenido
 * (una historia completamente vacía no se guarda).
 */
export class HistoriaClinica {
  private constructor(private readonly props: PropiedadesHistoriaClinica) {}

  static crear(
    datos: DatosHistoriaClinica,
    id: string,
    ahora: Date = new Date(),
  ): HistoriaClinica {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("La historia clínica debe pertenecer a un paciente.");
    }

    const campos = normalizarCampos(datos);
    if (CAMPOS_CONTENIDO.every((campo) => campos[campo] === null)) {
      throw new ErrorValidacion(
        "La historia clínica debe tener al menos un campo con contenido.",
      );
    }

    return new HistoriaClinica({
      id,
      pacienteId: datos.pacienteId,
      ...campos,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesHistoriaClinica): HistoriaClinica {
    return new HistoriaClinica(props);
  }

  /** Versión actualizada e inmutable (reemplaza los campos informados). */
  actualizar(
    cambios: Partial<CamposHistoriaClinica>,
    ahora: Date = new Date(),
  ): HistoriaClinica {
    return HistoriaClinica.crear(
      { pacienteId: this.props.pacienteId, ...camposDe(this.props), ...cambios },
      this.props.id,
      ahora,
    );
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get actualizadoEn(): Date {
    return this.props.actualizadoEn;
  }

  aPrimitivos(): PropiedadesHistoriaClinica {
    return { ...this.props };
  }
}

function normalizarCampos(datos: Partial<CamposHistoriaClinica>): CamposHistoriaClinica {
  const resultado = {} as CamposHistoriaClinica;
  for (const campo of CAMPOS_CONTENIDO) {
    resultado[campo] = datos[campo]?.trim() || null;
  }
  return resultado;
}

function camposDe(props: PropiedadesHistoriaClinica): CamposHistoriaClinica {
  const resultado = {} as CamposHistoriaClinica;
  for (const campo of CAMPOS_CONTENIDO) {
    resultado[campo] = props[campo];
  }
  return resultado;
}
