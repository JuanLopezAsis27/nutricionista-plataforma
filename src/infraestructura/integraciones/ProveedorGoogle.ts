import type {
  IProveedorGoogle,
  TokensGoogle,
  EventoCalendario,
  EmailGoogle,
} from "@/dominio/servicios/IProveedorGoogle";
import { SCOPES_GOOGLE, type ConfigGoogle } from "./configGoogle";

const URL_CONSENTIMIENTO = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";
const URL_CALENDAR =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const URL_GMAIL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function expiraEnDesde(segundos: unknown): Date | null {
  return typeof segundos === "number"
    ? new Date(Date.now() + segundos * 1000)
    : null;
}

async function verificar(respuesta: Response, contexto: string): Promise<void> {
  if (!respuesta.ok) {
    const cuerpo = await respuesta.text().catch(() => "");
    throw new Error(
      `Google ${contexto} falló (${respuesta.status}): ${cuerpo.slice(0, 300)}`,
    );
  }
}

function evento(evento: EventoCalendario): Record<string, unknown> {
  return {
    summary: evento.titulo,
    description: evento.descripcion,
    start: { dateTime: evento.inicio.toISOString() },
    end: { dateTime: evento.fin.toISOString() },
    ...(evento.invitados?.length
      ? { attendees: evento.invitados.map((email) => ({ email })) }
      : {}),
    // `useDefault: false` es lo que hace que manden los avisos configurados
    // por el profesional y no los que cada invitado tenga en su cuenta.
    ...(evento.recordatoriosMinutos
      ? {
          reminders: {
            useDefault: false,
            overrides: evento.recordatoriosMinutos.map((minutos) => ({
              method: "popup",
              minutes: minutos,
            })),
          },
        }
      : {}),
  };
}

/**
 * `sendUpdates=all` es lo que hace que Google le mande la invitación al
 * paciente en vez de sumarlo en silencio. Sin esto el evento queda creado con
 * el invitado adentro y el paciente no se entera nunca, que es exactamente el
 * modo en que un recordatorio deja de serlo.
 */
function conNotificaciones(url: string, hayInvitados: boolean): string {
  return hayInvitados ? `${url}?sendUpdates=all` : url;
}

/** Implementación real del proveedor Google (APIs REST vía fetch). */
export class ProveedorGoogle implements IProveedorGoogle {
  constructor(private readonly config: ConfigGoogle) {}

  urlConsentimiento(estado: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: SCOPES_GOOGLE.join(" "),
      access_type: "offline", // pide refresh token
      prompt: "consent", // fuerza refresh token aunque ya haya consentido
      include_granted_scopes: "true",
      state: estado,
    });
    return `${URL_CONSENTIMIENTO}?${params.toString()}`;
  }

  async intercambiarCodigo(codigo: string): Promise<TokensGoogle> {
    const respuesta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: codigo,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    await verificar(respuesta, "intercambio de código");
    const datos = (await respuesta.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const emailCuenta = await this.obtenerEmail(datos.access_token);
    return {
      accessToken: datos.access_token,
      refreshToken: datos.refresh_token ?? null,
      expiraEn: expiraEnDesde(datos.expires_in),
      emailCuenta,
      scopes: datos.scope ? datos.scope.split(" ") : [...SCOPES_GOOGLE],
    };
  }

  async refrescarAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiraEn: Date | null }> {
    const respuesta = await fetch(URL_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "refresh_token",
      }),
    });
    await verificar(respuesta, "refresh de token");
    const datos = (await respuesta.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      accessToken: datos.access_token,
      expiraEn: expiraEnDesde(datos.expires_in),
    };
  }

  async crearEvento(
    accessToken: string,
    ev: EventoCalendario,
  ): Promise<string> {
    const respuesta = await fetch(
      conNotificaciones(URL_CALENDAR, Boolean(ev.invitados?.length)),
      {
        method: "POST",
        headers: this.headers(accessToken),
        body: JSON.stringify(evento(ev)),
      },
    );
    await verificar(respuesta, "crear evento");
    const datos = (await respuesta.json()) as { id: string };
    return datos.id;
  }

  async actualizarEvento(
    accessToken: string,
    eventoId: string,
    ev: EventoCalendario,
  ): Promise<void> {
    const respuesta = await fetch(
      conNotificaciones(
        `${URL_CALENDAR}/${encodeURIComponent(eventoId)}`,
        Boolean(ev.invitados?.length),
      ),
      {
        method: "PATCH",
        headers: this.headers(accessToken),
        body: JSON.stringify(evento(ev)),
      },
    );
    await verificar(respuesta, "actualizar evento");
  }

  async eliminarEvento(accessToken: string, eventoId: string): Promise<void> {
    // Con invitados, borrar el evento tiene que avisarles: si no, al paciente
    // le queda en el calendario un turno que ya no existe.
    const respuesta = await fetch(
      `${URL_CALENDAR}/${encodeURIComponent(eventoId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    // 404/410 = ya no existe: se considera OK (idempotente).
    if (respuesta.status === 404 || respuesta.status === 410) return;
    await verificar(respuesta, "eliminar evento");
  }

  async enviarEmail(accessToken: string, mensaje: EmailGoogle): Promise<void> {
    const rfc822 = [
      `From: ${mensaje.de}`,
      `To: ${mensaje.para}`,
      `Subject: ${this.asuntoCodificado(mensaje.asunto)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      mensaje.html,
    ].join("\r\n");
    const raw = Buffer.from(rfc822, "utf8").toString("base64url");

    const respuesta = await fetch(URL_GMAIL, {
      method: "POST",
      headers: this.headers(accessToken),
      body: JSON.stringify({ raw }),
    });
    await verificar(respuesta, "enviar email");
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  /** Codifica el asunto en RFC 2047 si tiene caracteres no ASCII (acentos). */
  private asuntoCodificado(asunto: string): string {
    // eslint-disable-next-line no-control-regex
    if (/^[\x00-\x7F]*$/.test(asunto)) return asunto;
    return `=?UTF-8?B?${Buffer.from(asunto, "utf8").toString("base64")}?=`;
  }

  private async obtenerEmail(accessToken: string): Promise<string> {
    const respuesta = await fetch(URL_USERINFO, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await verificar(respuesta, "userinfo");
    const datos = (await respuesta.json()) as { email?: string };
    return datos.email ?? "cuenta-google";
  }
}
