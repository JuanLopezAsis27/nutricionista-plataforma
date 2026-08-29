/** Datos para registrar un email en el log de envíos. */
export interface DatosEmailEnviado {
  plantillaClave: string;
  para: string;
  asunto: string;
  referenciaId?: string | null;
  pacienteId?: string | null;
  error?: string | null;
}

/** Estado completo de un registro de envío persistido. */
export interface PropiedadesEmailEnviado {
  id: string;
  plantillaClave: string;
  para: string;
  asunto: string;
  referenciaId: string | null;
  pacienteId: string | null;
  error: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio EmailEnviado: entrada del log de correos (auditoría,
 * idempotencia de recordatorios y señal de engagement para el ML futuro).
 *
 * `error` null significa envío exitoso. La pareja (plantillaClave,
 * referenciaId) es la que evita reenviar el mismo recordatorio de turno.
 */
export class EmailEnviado {
  private constructor(private readonly props: PropiedadesEmailEnviado) {}

  static crear(
    datos: DatosEmailEnviado,
    id: string,
    ahora: Date = new Date(),
  ): EmailEnviado {
    return new EmailEnviado({
      id,
      plantillaClave: datos.plantillaClave,
      para: datos.para,
      asunto: datos.asunto,
      referenciaId: datos.referenciaId ?? null,
      pacienteId: datos.pacienteId ?? null,
      error: datos.error ?? null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesEmailEnviado): EmailEnviado {
    return new EmailEnviado(props);
  }

  get id(): string {
    return this.props.id;
  }
  get exitoso(): boolean {
    return this.props.error == null;
  }

  aPrimitivos(): PropiedadesEmailEnviado {
    return { ...this.props };
  }
}
