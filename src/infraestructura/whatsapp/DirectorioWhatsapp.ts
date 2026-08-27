import type { PrismaClient } from "@prisma/client";
import type { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import {
  WHATSAPP_APP_SECRET,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
} from "@/infraestructura/repositorios/PrismaRepositorioCredenciales";
import { obtenerConfigWhatsapp } from "./configWhatsapp";

/** Inquilino dueño de un número de WhatsApp, con lo necesario para validarlo. */
export interface InquilinoWhatsapp {
  nutricionistaId: string;
  /** App secret del inquilino para validar la firma, o null si no lo cargó. */
  appSecret: string | null;
}

/**
 * Resuelve a qué inquilino pertenece un webhook de WhatsApp.
 *
 * El webhook entra sin sesión: la única pista es el `phone_number_id` que Meta
 * manda en el cuerpo, así que la búsqueda corre en alcance GLOBAL (es el mismo
 * caso que el login) y recién después se acota todo el procesamiento al
 * inquilino encontrado.
 */
export class DirectorioWhatsapp {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cifrador: CifradorTokens | null,
  ) {}

  /**
   * Inquilino dueño de ese número, o null si ninguno lo tiene configurado.
   *
   * El `phone_number_id` se guarda en claro y con índice único: la búsqueda es
   * un lookup, y la base impide que dos consultorios reclamen el mismo número
   * (antes nada lo impedía y el ruteo quedaba a merced de cuál devolviera
   * Postgres primero).
   */
  async porPhoneNumberId(phoneNumberId: string): Promise<InquilinoWhatsapp | null> {
    const fila = await ejecutarGlobal(() =>
      this.prisma.credencialProveedor.findFirst({
        where: { ...WHATSAPP_PHONE_NUMBER_ID, valor: phoneNumberId },
      }),
    );
    if (fila) {
      const appSecret = await ejecutarGlobal(() =>
        this.prisma.credencialProveedor.findUnique({
          where: {
            nutricionistaId_proveedor_clave: {
              nutricionistaId: fila.nutricionistaId,
              ...WHATSAPP_APP_SECRET,
            },
          },
        }),
      );
      return {
        nutricionistaId: fila.nutricionistaId,
        appSecret: this.descifrar(appSecret?.valor ?? null),
      };
    }

    // Respaldo de despliegue: un único número configurado por entorno.
    const env = obtenerConfigWhatsapp();
    if (env && env.phoneNumberId === phoneNumberId) {
      return { nutricionistaId: "", appSecret: env.appSecret };
    }
    return null;
  }

  /**
   * Indica si el token del handshake (GET) coincide con el de algún inquilino
   * o con el del entorno. Cada profesional configura el webhook de SU app de
   * Meta contra la misma URL, así que no hay a quién preguntarle todavía.
   */
  async verifyTokenValido(token: string): Promise<boolean> {
    if (!token) return false;

    const env = obtenerConfigWhatsapp();
    if (env?.verifyToken && sonIguales(env.verifyToken, token)) return true;

    const filas = await ejecutarGlobal(() =>
      this.prisma.credencialProveedor.findMany({
        where: WHATSAPP_VERIFY_TOKEN,
        select: { valor: true },
      }),
    );
    return filas.some((fila) => {
      const guardado = this.descifrar(fila.valor);
      return guardado != null && sonIguales(guardado, token);
    });
  }

  private descifrar(cifrado: string | null): string | null {
    if (!cifrado || !this.cifrador) return null;
    try {
      return this.cifrador.descifrar(cifrado);
    } catch {
      return null; // token corrupto o TOKENS_SECRET cambiado
    }
  }
}

/** Comparación en tiempo constante, para no filtrar el token por temporización. */
function sonIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distintos = 0;
  for (let i = 0; i < a.length; i += 1) {
    distintos |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return distintos === 0;
}
