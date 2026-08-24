import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Nivel competitivo del deportista. */
export const NIVELES_DEPORTIVOS = ["RECREATIVO", "AMATEUR", "COMPETITIVO", "ELITE"] as const;
export type NivelDeportivo = (typeof NIVELES_DEPORTIVOS)[number];

/** Fase de la temporada (periodización). */
export const FASES_TEMPORADA = [
  "PRETEMPORADA",
  "COMPETENCIA",
  "TRANSICION",
  "DESCANSO",
] as const;
export type FaseTemporada = (typeof FASES_TEMPORADA)[number];

/** Datos para crear/editar el perfil deportivo de un paciente. */
export interface DatosPerfilDeportivo {
  pacienteId: string;
  /** Deporte principal (atletismo, fútbol, boxeo, tenis…). */
  deporte: string;
  /** Disciplina/prueba dentro del deporte (maratón, mediofondo, peso welter…). */
  disciplina?: string | null;
  nivel?: NivelDeportivo;
  fase?: FaseTemporada;
  /** Días de entrenamiento por semana (0–14). */
  diasEntrenamientoSemana?: number | null;
  /** Horas de entrenamiento por semana (0–80). */
  horasSemana?: number | null;
  /** Peso de categoría para deportes con categorías (kg). */
  pesoCategoriaKg?: number | null;
  /** Posición/puesto en deportes de equipo. */
  posicion?: string | null;
  /** Objetivo deportivo en palabras (ej. "bajar de 3h30 en maratón"). */
  objetivo?: string | null;
  notas?: string | null;
}

/** Estado completo del perfil deportivo persistido. */
export interface PropiedadesPerfilDeportivo {
  id: string;
  pacienteId: string;
  deporte: string;
  disciplina: string | null;
  nivel: NivelDeportivo;
  fase: FaseTemporada;
  diasEntrenamientoSemana: number | null;
  horasSemana: number | null;
  pesoCategoriaKg: number | null;
  posicion: string | null;
  objetivo: string | null;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio PerfilDeportivo: caracteriza al paciente deportista para
 * ajustar su plan y contexto (deporte, disciplina, nivel, fase de temporada,
 * carga de entrenamiento, categoría de peso). Uno por paciente.
 *
 * Invariantes: paciente y deporte obligatorios; nivel/fase dentro de sus listas;
 * días 0–14, horas 0–80, peso de categoría 20–400 kg.
 */
export class PerfilDeportivo {
  private constructor(private readonly props: PropiedadesPerfilDeportivo) {}

  static crear(
    datos: DatosPerfilDeportivo,
    id: string,
    ahora: Date = new Date(),
  ): PerfilDeportivo {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El perfil deportivo debe pertenecer a un paciente.");
    }
    const deporte = datos.deporte?.trim() ?? "";
    if (deporte.length === 0) {
      throw new ErrorValidacion("Indicá el deporte.");
    }
    const nivel = datos.nivel ?? "AMATEUR";
    if (!NIVELES_DEPORTIVOS.includes(nivel)) {
      throw new ErrorValidacion("El nivel deportivo no es válido.");
    }
    const fase = datos.fase ?? "PRETEMPORADA";
    if (!FASES_TEMPORADA.includes(fase)) {
      throw new ErrorValidacion("La fase de temporada no es válida.");
    }
    const dias = validarRango(datos.diasEntrenamientoSemana, 0, 14, "Los días de entrenamiento");
    const horas = validarRango(datos.horasSemana, 0, 80, "Las horas semanales");
    const peso = validarRango(datos.pesoCategoriaKg, 20, 400, "El peso de categoría");

    return new PerfilDeportivo({
      id,
      pacienteId: datos.pacienteId,
      deporte,
      disciplina: datos.disciplina?.trim() || null,
      nivel,
      fase,
      diasEntrenamientoSemana: dias,
      horasSemana: horas,
      pesoCategoriaKg: peso,
      posicion: datos.posicion?.trim() || null,
      objetivo: datos.objetivo?.trim() || null,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesPerfilDeportivo): PerfilDeportivo {
    return new PerfilDeportivo(props);
  }

  /** Versión actualizada e inmutable (preserva id, paciente y creadoEn). */
  actualizar(cambios: Omit<DatosPerfilDeportivo, "pacienteId">, ahora: Date = new Date()): PerfilDeportivo {
    const actualizado = PerfilDeportivo.crear(
      { ...cambios, pacienteId: this.props.pacienteId },
      this.props.id,
      ahora,
    );
    return new PerfilDeportivo({ ...actualizado.props, creadoEn: this.props.creadoEn });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get deporte(): string {
    return this.props.deporte;
  }

  aPrimitivos(): PropiedadesPerfilDeportivo {
    return { ...this.props };
  }
}

/** Valida que un número opcional esté en [min, max]; devuelve null si falta. */
function validarRango(
  valor: number | null | undefined,
  min: number,
  max: number,
  etiqueta: string,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new ErrorValidacion(`${etiqueta} deben estar entre ${min} y ${max}.`);
  }
  return valor;
}
