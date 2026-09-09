import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  renderizarPlantilla,
  renderizarPlantillaHtml,
} from "../plantillas/renderizar";

/**
 * Claves de las plantillas de sistema (sembradas, no borrables). El cron de
 * recordatorios usa RECORDATORIO_TURNO; BIENVENIDA queda lista para envíos
 * manuales o futuros.
 */
export const CLAVE_RECORDATORIO_TURNO = "RECORDATORIO_TURNO";
export const CLAVE_BIENVENIDA = "BIENVENIDA";

/**
 * Placeholders disponibles en las plantillas de email. Se documentan para la
 * UI (el profesional los inserta en el cuerpo) y se usan para la vista previa
 * con datos de ejemplo.
 */
export const PLACEHOLDERS_PLANTILLA = [
  { clave: "paciente", descripcion: "Nombre y apellido del paciente" },
  { clave: "fecha", descripcion: "Fecha del turno (ej. 27/07/2026)" },
  { clave: "hora", descripcion: "Hora del turno (ej. 10:00)" },
  { clave: "profesional", descripcion: "Nombre del profesional" },
] as const;

/** Datos para crear/editar una plantilla de email. */
export interface DatosNuevaPlantilla {
  clave: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  descripcion?: string | null;
  deSistema?: boolean;
}

/** Estado completo de una plantilla persistida. */
export interface PropiedadesPlantilla {
  id: string;
  clave: string;
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  descripcion: string | null;
  deSistema: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Resultado de renderizar una plantilla con sus variables reemplazadas. */
export interface EmailRenderizado {
  asunto: string;
  html: string;
}

const PATRON_CLAVE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Entidad de dominio PlantillaEmail: un correo reutilizable con placeholders
 * {{paciente}}, {{fecha}}… que el envío reemplaza por datos reales.
 *
 * `clave` identifica plantillas de sistema (RECORDATORIO_TURNO, BIENVENIDA);
 * es inmutable una vez creada. `deSistema` marca las que no se pueden borrar.
 */
export class PlantillaEmail {
  private constructor(private readonly props: PropiedadesPlantilla) {}

  static crear(
    datos: DatosNuevaPlantilla,
    id: string,
    ahora: Date = new Date(),
  ): PlantillaEmail {
    const clave = datos.clave?.trim().toUpperCase() ?? "";
    if (!PATRON_CLAVE.test(clave)) {
      throw new ErrorValidacion(
        "La clave debe ser un identificador en MAYÚSCULAS (ej. RECORDATORIO_TURNO).",
      );
    }
    const { nombre, asunto, cuerpoHtml } =
      PlantillaEmail.validarContenido(datos);

    return new PlantillaEmail({
      id,
      clave,
      nombre,
      asunto,
      cuerpoHtml,
      descripcion: datos.descripcion?.trim() || null,
      deSistema: datos.deSistema ?? false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesPlantilla): PlantillaEmail {
    return new PlantillaEmail(props);
  }

  /** Edita el contenido (nunca la clave ni `deSistema`); actualiza la fecha. */
  actualizar(
    cambios: {
      nombre: string;
      asunto: string;
      cuerpoHtml: string;
      descripcion?: string | null;
    },
    ahora: Date = new Date(),
  ): PlantillaEmail {
    const { nombre, asunto, cuerpoHtml } =
      PlantillaEmail.validarContenido(cambios);
    return new PlantillaEmail({
      ...this.props,
      nombre,
      asunto,
      cuerpoHtml,
      descripcion: cambios.descripcion?.trim() || null,
      actualizadoEn: ahora,
    });
  }

  /**
   * Reemplaza los placeholders {{clave}} (con espacios opcionales) por los
   * valores provistos. Los placeholders sin valor se dejan intactos para que
   * el profesional detecte el error en la vista previa.
   *
   * El asunto es texto plano y va sin escapar; el cuerpo es HTML y los valores
   * SÍ se escapan. La plantilla la escribe el profesional (contenido de
   * confianza, con sus etiquetas), pero los valores sustituidos son datos —el
   * nombre del paciente, por ejemplo— y sin escapar se inyectaban tal cual en
   * un correo que sale hacia terceros.
   */
  renderizar(variables: Record<string, string>): EmailRenderizado {
    return {
      asunto: renderizarPlantilla(this.props.asunto, variables),
      html: renderizarPlantillaHtml(this.props.cuerpoHtml, variables),
    };
  }

  private static validarContenido(datos: {
    nombre: string;
    asunto: string;
    cuerpoHtml: string;
  }): { nombre: string; asunto: string; cuerpoHtml: string } {
    const nombre = datos.nombre?.trim() ?? "";
    const asunto = datos.asunto?.trim() ?? "";
    const cuerpoHtml = datos.cuerpoHtml?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("La plantilla debe tener un nombre.");
    }
    if (asunto.length === 0) {
      throw new ErrorValidacion("La plantilla debe tener un asunto.");
    }
    if (cuerpoHtml.length === 0) {
      throw new ErrorValidacion("La plantilla debe tener un cuerpo.");
    }
    return { nombre, asunto, cuerpoHtml };
  }

  get id(): string {
    return this.props.id;
  }
  get clave(): string {
    return this.props.clave;
  }
  get deSistema(): boolean {
    return this.props.deSistema;
  }

  aPrimitivos(): PropiedadesPlantilla {
    return { ...this.props };
  }
}
