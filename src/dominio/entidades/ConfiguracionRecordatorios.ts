import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Vías por las que se puede avisar un turno. */
export const MEDIOS_RECORDATORIO = ["WHATSAPP", "EMAIL", "CALENDARIO"] as const;
export type MedioRecordatorio = (typeof MEDIOS_RECORDATORIO)[number];

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tope de avisos automáticos por medio y por turno. */
export const MAX_AVISOS_POR_MEDIO = 5;
/** Anticipación máxima admitida, en días. */
export const MAX_DIAS_ANTES = 60;
/** Anticipación máxima de un aviso del evento de calendario, en minutos (7 días). */
export const MAX_MINUTOS_ANTES = 7 * 24 * 60;
/** Margen máximo entre dos avisos del mismo turno, en horas (30 días). */
export const MAX_HORAS_ENTRE_AVISOS = 30 * 24;

/** Campos editables de la configuración de recordatorios. */
export interface DatosConfiguracionRecordatorios {
  whatsappActivo: boolean;
  whatsappAutomatico: boolean;
  /** Un elemento por aviso: [3, 1] = uno 3 días antes y otro 1 día antes. */
  whatsappDiasAntes: number[];
  emailActivo: boolean;
  emailAutomatico: boolean;
  emailDiasAntes: number[];
  calendarioActivo: boolean;
  /** Suma al paciente como invitado, así el turno cae en SU calendario. */
  calendarioInvitarPaciente: boolean;
  /** Avisos del evento, en minutos antes del turno. */
  calendarioMinutosAntes: number[];
  /** Hora local del barrido automático (HH:mm). */
  horaEnvio: string;
  /**
   * Cuántas horas tienen que pasar para volver a avisarle a un paciente el
   * MISMO turno. Hace que "ya se le avisó" sea temporal y no definitivo.
   */
  horasEntreAvisos: number;
}

/** Estado completo persistido. */
export interface PropiedadesConfiguracionRecordatorios extends DatosConfiguracionRecordatorios {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ConfiguracionRecordatorios: qué medios avisan un turno,
 * cuáles salen solos y con cuánta anticipación.
 *
 * Está separada de `ConfiguracionConsultorio` a propósito: aquella describe el
 * consultorio (horarios, membrete, apariencia del PDF), esta gobierna una
 * automatización que corre sola en el worker y le escribe a los pacientes.
 * Apagar los avisos automáticos y cambiarle el color al PDF no deberían ser la
 * misma operación.
 *
 * Dos ejes independientes por medio, y conviene no confundirlos:
 *
 *   * `*Activo` — si el medio se usa. Apagado, el medio no aparece ni siquiera
 *     para el envío manual.
 *   * `*Automatico` — si además sale solo. Un medio activo pero no automático
 *     es exactamente el caso del profesional que quiere elegir a mano a quién
 *     le manda.
 *
 * `*DiasAntes` es la programación completa: la CANTIDAD de avisos es la
 * longitud del array, así que "uno 3 días antes y otro 1 día antes" es [3, 1].
 * Vacío significa que ese medio no manda nada automático aunque el interruptor
 * diga que sí. Se normaliza —orden descendente y sin repetidos— porque un
 * duplicado solo podría producir dos avisos idénticos el mismo día.
 */
export class ConfiguracionRecordatorios {
  private constructor(
    private readonly props: PropiedadesConfiguracionRecordatorios,
  ) {}

  /** Configuración por defecto (cuando el profesional todavía no tocó nada). */
  static porDefecto(ahora: Date = new Date()): ConfiguracionRecordatorios {
    return new ConfiguracionRecordatorios({
      id: crypto.randomUUID(),
      // WhatsApp arranca activo pero NO automático: que salgan mensajes solos
      // por un canal que le llega al teléfono al paciente —y que a Meta le
      // factura por conversación— es una decisión del profesional, no un
      // default nuestro.
      whatsappActivo: true,
      whatsappAutomatico: false,
      whatsappDiasAntes: [3, 1],
      emailActivo: true,
      emailAutomatico: true,
      emailDiasAntes: [1],
      calendarioActivo: true,
      calendarioInvitarPaciente: true,
      calendarioMinutosAntes: [1440, 60],
      horaEnvio: "09:00",
      // Un día: lo que separa dos avisos consecutivos de cualquier
      // programación razonable ([3, 1] son 48 h de distancia).
      horasEntreAvisos: 24,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesConfiguracionRecordatorios,
  ): ConfiguracionRecordatorios {
    return new ConfiguracionRecordatorios(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosConfiguracionRecordatorios>,
    ahora: Date = new Date(),
  ): ConfiguracionRecordatorios {
    const datos: DatosConfiguracionRecordatorios = {
      whatsappActivo: cambios.whatsappActivo ?? this.props.whatsappActivo,
      whatsappAutomatico:
        cambios.whatsappAutomatico ?? this.props.whatsappAutomatico,
      whatsappDiasAntes: normalizarLista(
        cambios.whatsappDiasAntes ?? this.props.whatsappDiasAntes,
      ),
      emailActivo: cambios.emailActivo ?? this.props.emailActivo,
      emailAutomatico: cambios.emailAutomatico ?? this.props.emailAutomatico,
      emailDiasAntes: normalizarLista(
        cambios.emailDiasAntes ?? this.props.emailDiasAntes,
      ),
      calendarioActivo: cambios.calendarioActivo ?? this.props.calendarioActivo,
      calendarioInvitarPaciente:
        cambios.calendarioInvitarPaciente ??
        this.props.calendarioInvitarPaciente,
      calendarioMinutosAntes: normalizarLista(
        cambios.calendarioMinutosAntes ?? this.props.calendarioMinutosAntes,
      ),
      horaEnvio: cambios.horaEnvio ?? this.props.horaEnvio,
      horasEntreAvisos: cambios.horasEntreAvisos ?? this.props.horasEntreAvisos,
    };
    validar(datos);
    return new ConfiguracionRecordatorios({
      ...this.props,
      ...datos,
      actualizadoEn: ahora,
    });
  }

  /**
   * Escalones de anticipación con los que WhatsApp debe salir solo. Vacío si
   * el medio está apagado o si el envío automático no está habilitado: es la
   * única pregunta que le hace el barrido, y así no puede olvidarse de mirar
   * uno de los dos interruptores.
   */
  get diasAntesWhatsappAutomatico(): number[] {
    if (!this.props.whatsappActivo || !this.props.whatsappAutomatico) return [];
    return [...this.props.whatsappDiasAntes];
  }

  /** Ídem para el email. */
  get diasAntesEmailAutomatico(): number[] {
    if (!this.props.emailActivo || !this.props.emailAutomatico) return [];
    return [...this.props.emailDiasAntes];
  }

  /**
   * Si al barrido le toca correr a esta hora. El despachador pasa cada hora en
   * punto, así que se compara la hora y no el minuto; que un barrido de más no
   * duplique nada lo garantiza la idempotencia del envío, no esta condición.
   */
  correspondeALaHora(ahora: Date): boolean {
    return Number(this.props.horaEnvio.slice(0, 2)) === ahora.getHours();
  }

  /**
   * ¿Pasó el margen desde el último aviso que le salió a ese turno?
   *
   * `null` (nunca se le avisó) siempre deja mandar. Es la pregunta que
   * reemplazó al "ya se le avisó" definitivo: el profesional que necesita
   * insistir dos días después ya no tiene que apagar la protección de todo el
   * lote para lograrlo.
   */
  puedeVolverAAvisar(
    ultimoAviso: Date | null,
    ahora: Date = new Date(),
  ): boolean {
    if (ultimoAviso == null) return true;
    const horas = (ahora.getTime() - ultimoAviso.getTime()) / (60 * 60 * 1000);
    return horas >= this.props.horasEntreAvisos;
  }

  get id(): string {
    return this.props.id;
  }
  get whatsappActivo(): boolean {
    return this.props.whatsappActivo;
  }
  get emailActivo(): boolean {
    return this.props.emailActivo;
  }
  get calendarioActivo(): boolean {
    return this.props.calendarioActivo;
  }
  get calendarioInvitarPaciente(): boolean {
    return this.props.calendarioInvitarPaciente;
  }
  get calendarioMinutosAntes(): number[] {
    return [...this.props.calendarioMinutosAntes];
  }
  get horasEntreAvisos(): number {
    return this.props.horasEntreAvisos;
  }

  aPrimitivos(): PropiedadesConfiguracionRecordatorios {
    return {
      ...this.props,
      whatsappDiasAntes: [...this.props.whatsappDiasAntes],
      emailDiasAntes: [...this.props.emailDiasAntes],
      calendarioMinutosAntes: [...this.props.calendarioMinutosAntes],
    };
  }
}

/** Sin repetidos y de mayor a menor: el aviso más lejano primero. */
function normalizarLista(valores: number[]): number[] {
  return [...new Set(valores)].sort((a, b) => b - a);
}

function validar(d: DatosConfiguracionRecordatorios): void {
  const validarDias = (dias: number[], medio: string): void => {
    if (dias.length > MAX_AVISOS_POR_MEDIO) {
      throw new ErrorValidacion(
        `No se pueden programar más de ${MAX_AVISOS_POR_MEDIO} avisos por ${medio}.`,
      );
    }
    for (const dia of dias) {
      if (!Number.isInteger(dia) || dia < 0 || dia > MAX_DIAS_ANTES) {
        throw new ErrorValidacion(
          `La anticipación por ${medio} debe ser un entero de 0 a ${MAX_DIAS_ANTES} días.`,
        );
      }
    }
  };
  validarDias(d.whatsappDiasAntes, "WhatsApp");
  validarDias(d.emailDiasAntes, "email");

  if (d.calendarioMinutosAntes.length > MAX_AVISOS_POR_MEDIO) {
    throw new ErrorValidacion(
      `El evento de calendario admite hasta ${MAX_AVISOS_POR_MEDIO} avisos.`,
    );
  }
  for (const minutos of d.calendarioMinutosAntes) {
    if (
      !Number.isInteger(minutos) ||
      minutos < 0 ||
      minutos > MAX_MINUTOS_ANTES
    ) {
      throw new ErrorValidacion(
        "Los avisos del calendario deben estar entre 0 minutos y 7 días antes del turno.",
      );
    }
  }
  if (!PATRON_HORA.test(d.horaEnvio)) {
    throw new ErrorValidacion("La hora de envío debe tener formato HH:mm.");
  }
  if (
    !Number.isInteger(d.horasEntreAvisos) ||
    d.horasEntreAvisos < 1 ||
    d.horasEntreAvisos > MAX_HORAS_ENTRE_AVISOS
  ) {
    throw new ErrorValidacion(
      `El margen entre avisos debe ser un entero de 1 a ${MAX_HORAS_ENTRE_AVISOS} horas.`,
    );
  }
}
