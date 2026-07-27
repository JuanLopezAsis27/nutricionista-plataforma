import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para registrar una consulta al asistente. */
export interface DatosNuevaConsultaIA {
  pacienteId: string;
  pregunta: string;
  respuesta: string;
}

/** Estado completo de una consulta persistida. */
export interface PropiedadesConsultaIA {
  id: string;
  pacienteId: string;
  pregunta: string;
  respuesta: string;
  creadoEn: Date;
}

/**
 * Entidad de dominio ConsultaIA: una pregunta del paciente al asistente y su
 * respuesta. Se guarda como historial (señal para el ML futuro).
 */
export class ConsultaIA {
  private constructor(private readonly props: PropiedadesConsultaIA) {}

  static crear(datos: DatosNuevaConsultaIA, id: string, ahora: Date = new Date()): ConsultaIA {
    const pregunta = datos.pregunta?.trim() ?? "";
    if (pregunta.length === 0) {
      throw new ErrorValidacion("La pregunta no puede estar vacía.");
    }
    return new ConsultaIA({
      id,
      pacienteId: datos.pacienteId,
      pregunta,
      respuesta: datos.respuesta,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesConsultaIA): ConsultaIA {
    return new ConsultaIA(props);
  }

  aPrimitivos(): PropiedadesConsultaIA {
    return { ...this.props };
  }
}
