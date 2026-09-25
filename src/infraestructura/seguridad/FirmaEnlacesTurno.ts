import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AccionEnlaceTurno,
  IEnlacesTurno,
} from "@/dominio/servicios/IEnlacesTurno";
import { alcanceActual } from "@/infraestructura/multitenancy/contextoTenant";

export interface DestinoConfirmacion {
  nutricionistaId: string;
  turnoId: string;
}

/** Página pública de cada acción. */
const RUTAS: Record<AccionEnlaceTurno, string> = {
  CONFIRMAR: "/confirmar-turno",
  CANCELAR: "/cancelar-turno",
};

/**
 * Propósito con el que se deriva la clave de cada acción. El de confirmar es
 * el que se usó siempre: cambiarlo invalidaría los enlaces que ya están en
 * las bandejas de los pacientes.
 */
const PROPOSITOS: Record<AccionEnlaceTurno, string> = {
  CONFIRMAR: "confirmacion-turno",
  CANCELAR: "cancelacion-turno",
};

/**
 * Enlaces firmados con HMAC: llevan consultorio, turno y vencimiento, así que no
 * necesitan tabla. El consultorio va adentro porque quien abre el enlace no
 * tiene sesión de la que sacarlo.
 *
 * Cada acción firma con SU clave derivada. La carga es la misma (consultorio,
 * turno, vencimiento), así que con una sola clave el token de «confirmar» de
 * un email serviría pegado en /cancelar-turno: cualquiera que viera el enlace
 * de confirmación podría cancelar el turno.
 */
export class FirmaEnlacesTurno implements IEnlacesTurno {
  private readonly claves: Record<AccionEnlaceTurno, Buffer>;

  constructor(
    secreto: string | undefined,
    private readonly baseUrl: string,
  ) {
    if (!secreto) {
      throw new Error(
        "Falta AUTH_SECRET para firmar los enlaces de confirmación de turno.",
      );
    }
    // Claves derivadas: esta firma no sirve para ningún otro uso de
    // AUTH_SECRET, ni la de una acción para la otra.
    const derivar = (proposito: string): Buffer =>
      createHmac("sha256", secreto).update(proposito).digest();
    this.claves = {
      CONFIRMAR: derivar(PROPOSITOS.CONFIRMAR),
      CANCELAR: derivar(PROPOSITOS.CANCELAR),
    };
  }

  generar(accion: AccionEnlaceTurno, turnoId: string, venceEn: Date): string {
    const alcance = alcanceActual();
    if (alcance?.tipo !== "nutricionista") {
      throw new Error(
        "El enlace del turno se genera dentro del alcance de un consultorio.",
      );
    }
    const carga = Buffer.from(
      JSON.stringify({
        n: alcance.nutricionistaId,
        t: turnoId,
        v: venceEn.getTime(),
      }),
    ).toString("base64url");
    return `${this.prefijo(accion)}${carga}.${this.firmar(accion, carga)}`;
  }

  prefijo(accion: AccionEnlaceTurno): string {
    return `${this.baseUrl}${RUTAS[accion]}?token=`;
  }

  /**
   * Consultorio y turno del enlace; null si la firma no cierra, ya venció o
   * es de otra acción.
   */
  verificar(
    accion: AccionEnlaceTurno,
    token: string,
    ahora: Date,
  ): DestinoConfirmacion | null {
    const [carga, firma, ...resto] = token.split(".");
    if (!carga || !firma || resto.length > 0) return null;

    const esperada = Buffer.from(this.firmar(accion, carga));
    const recibida = Buffer.from(firma);
    if (
      recibida.length !== esperada.length ||
      !timingSafeEqual(recibida, esperada)
    ) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(carga, "base64url").toString("utf8"),
    ) as { n: string; t: string; v: number };
    if (datos.v <= ahora.getTime()) return null;
    return { nutricionistaId: datos.n, turnoId: datos.t };
  }

  private firmar(accion: AccionEnlaceTurno, carga: string): string {
    return createHmac("sha256", this.claves[accion])
      .update(carga)
      .digest("base64url");
  }
}
