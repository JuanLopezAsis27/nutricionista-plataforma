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

  /** Crea un evento en el calendario primario; devuelve su id. */
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
