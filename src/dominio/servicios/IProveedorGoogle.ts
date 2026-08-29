/** Tokens y datos de la cuenta que devuelve el intercambio del código OAuth. */
export interface TokensGoogle {
  accessToken: string;
  refreshToken: string | null;
  /** Momento de expiración del access token (para refrescarlo). */
  expiraEn: Date | null;
  emailCuenta: string;
  scopes: string[];
}

/** Evento a crear/actualizar en el calendario. */
export interface EventoCalendario {
  titulo: string;
  descripcion?: string;
  inicio: Date;
  fin: Date;
  /**
   * Emails invitados al evento. Sumar al paciente es lo que convierte el
   * evento del consultorio en un recordatorio PARA EL PACIENTE: Google le
   * manda la invitación y el turno le aparece en SU calendario, con los avisos
   * de `recordatoriosMinutos` corriendo en su teléfono.
   */
  invitados?: string[];
  /**
   * Avisos del evento, en minutos antes del inicio. Reemplazan a los que el
   * usuario tenga por defecto en su calendario: la anticipación la decide el
   * profesional en su configuración de recordatorios, no la cuenta de Google.
   */
  recordatoriosMinutos?: number[];
}

/** Email a enviar por la API de Gmail (desde la casilla conectada). */
export interface EmailGoogle {
  de: string;
  para: string;
  asunto: string;
  html: string;
}

/**
 * Puerto del proveedor Google (OAuth + Calendar + Gmail). La implementación de
 * infraestructura habla con las APIs REST de Google; el dominio solo conoce
 * este contrato, así se puede stubbear en tests y cambiar el proveedor.
 */
export interface IProveedorGoogle {
  /** URL de consentimiento a la que redirigir al usuario (con `estado` anti-CSRF). */
  urlConsentimiento(estado: string): string;
  /** Intercambia el código de autorización por tokens + datos de la cuenta. */
  intercambiarCodigo(codigo: string): Promise<TokensGoogle>;
  /** Refresca el access token a partir del refresh token. */
  refrescarAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiraEn: Date | null }>;

  /**
   * Crea un evento en el calendario primario; devuelve su id. Si el evento
   * lleva invitados, Google se encarga de mandarles la invitación.
   */
  crearEvento(accessToken: string, evento: EventoCalendario): Promise<string>;
  actualizarEvento(
    accessToken: string,
    eventoId: string,
    evento: EventoCalendario,
  ): Promise<void>;
  eliminarEvento(accessToken: string, eventoId: string): Promise<void>;

  /** Envía un email por la API de Gmail (desde la casilla conectada). */
  enviarEmail(accessToken: string, mensaje: EmailGoogle): Promise<void>;
}
