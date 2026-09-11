import { createHmac, timingSafeEqual } from "node:crypto";
import type { IEnlaceConfirmacionTurno } from "@/dominio/servicios/IEnlaceConfirmacionTurno";
import { alcanceActual } from "@/infraestructura/multitenancy/contextoTenant";

export interface DestinoConfirmacion {
  nutricionistaId: string;
  turnoId: string;
}

/**
 * Enlaces firmados con HMAC: llevan consultorio, turno y vencimiento, así que no
 * necesitan tabla. El consultorio va adentro porque quien abre el enlace no
 * tiene sesión de la que sacarlo.
 */
export class FirmaConfirmacionTurno implements IEnlaceConfirmacionTurno {
  private readonly clave: Buffer;

  constructor(
    secreto: string | undefined,
    private readonly baseUrl: string,
  ) {
    if (!secreto) {
      throw new Error(
        "Falta AUTH_SECRET para firmar los enlaces de confirmación de turno.",
      );
    }
    // Clave derivada: esta firma no sirve para ningún otro uso de AUTH_SECRET.
    this.clave = createHmac("sha256", secreto)
      .update("confirmacion-turno")
      .digest();
  }

  generar(turnoId: string, venceEn: Date): string {
    const alcance = alcanceActual();
    if (alcance?.tipo !== "nutricionista") {
      throw new Error(
        "El enlace de confirmación se genera dentro del alcance de un consultorio.",
      );
    }
    const carga = Buffer.from(
      JSON.stringify({
        n: alcance.nutricionistaId,
        t: turnoId,
        v: venceEn.getTime(),
      }),
    ).toString("base64url");
    return `${this.baseUrl}/confirmar-turno?token=${carga}.${this.firmar(carga)}`;
  }

  /** Consultorio y turno del enlace; null si la firma no cierra o ya venció. */
  verificar(token: string, ahora: Date): DestinoConfirmacion | null {
    const [carga, firma, ...resto] = token.split(".");
    if (!carga || !firma || resto.length > 0) return null;

    const esperada = Buffer.from(this.firmar(carga));
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

  private firmar(carga: string): string {
    return createHmac("sha256", this.clave).update(carga).digest("base64url");
  }
}
