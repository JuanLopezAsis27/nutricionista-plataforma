import type { PrismaClient, ProveedorIntegracion } from "@prisma/client";
import type {
  ICredencialesIntegracionRepositorio,
  CredencialesIntegracion,
  DatosCredenciales,
  IntegracionCredenciales,
} from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Identificador de un secreto: proveedor + clave. Una fila por cada uno, en vez
 * de una columna por cada uno (ver migración 28).
 */
export interface RefCredencial {
  proveedor: ProveedorIntegracion;
  clave: string;
}

/** Claves de WhatsApp que el ruteo del webhook necesita antes de descifrar. */
export const WHATSAPP_PHONE_NUMBER_ID: RefCredencial = {
  proveedor: "WHATSAPP",
  clave: "PHONE_NUMBER_ID",
};
export const WHATSAPP_APP_SECRET: RefCredencial = {
  proveedor: "WHATSAPP",
  clave: "APP_SECRET",
};
export const WHATSAPP_VERIFY_TOKEN: RefCredencial = {
  proveedor: "WHATSAPP",
  clave: "VERIFY_TOKEN",
};
/** Id de la cuenta de WhatsApp Business: rutea los webhooks de plantillas. */
export const WHATSAPP_WABA_ID: RefCredencial = {
  proveedor: "WHATSAPP",
  clave: "WABA_ID",
};

/**
 * Claves que se guardan EN CLARO.
 *
 * Es una lista corta y deliberada: el `phone_number_id` es lo único que la app
 * necesita leer antes de poder descifrar nada, porque es lo que identifica al
 * inquilino cuando entra un webhook sin sesión. Todo lo demás va cifrado.
 */
const EN_CLARO = new Set<string>([
  `${WHATSAPP_PHONE_NUMBER_ID.proveedor}/${WHATSAPP_PHONE_NUMBER_ID.clave}`,
  // Igual que el phone_number_id: los webhooks de estado de plantillas no
  // traen número, solo el id de la cuenta, y con eso se busca al inquilino.
  `${WHATSAPP_WABA_ID.proveedor}/${WHATSAPP_WABA_ID.clave}`,
]);

function esSecreto(ref: RefCredencial): boolean {
  return !EN_CLARO.has(`${ref.proveedor}/${ref.clave}`);
}

/** Qué filas borra la baja de cada integración. */
const CLAVES_DE_INTEGRACION: Record<IntegracionCredenciales, RefCredencial[]> =
  {
    WHATSAPP: [
      { proveedor: "WHATSAPP", clave: "TOKEN" },
      WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_VERIFY_TOKEN,
      WHATSAPP_APP_SECRET,
      WHATSAPP_WABA_ID,
    ],
  };

/**
 * Repositorio de credenciales de integración por inquilino.
 *
 * Cifra/descifra con `CifradorTokens` (AES-256-GCM). Si no hay `TOKENS_SECRET`
 * (cifrador null), `obtener` devuelve lo que puede y `guardar` lanza un error
 * claro. La extensión multi-inquilino acota las consultas al inquilino actual.
 */
export class PrismaRepositorioCredenciales implements ICredencialesIntegracionRepositorio {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cifrador: CifradorTokens | null,
  ) {}

  async obtener(): Promise<CredencialesIntegracion | null> {
    const [filas, preferencias] = await Promise.all([
      this.prisma.credencialProveedor.findMany(),
      this.prisma.preferenciasIntegracion.findFirst(),
    ]);
    if (filas.length === 0 && !preferencias) return null;

    // proveedor/clave -> valor ya descifrado (o en claro si corresponde).
    const valores = new Map<string, string | null>();
    for (const fila of filas) {
      const ref = { proveedor: fila.proveedor, clave: fila.clave };
      valores.set(
        `${fila.proveedor}/${fila.clave}`,
        esSecreto(ref) ? this.descifrar(fila.valor) : fila.valor,
      );
    }
    const leer = (
      proveedor: ProveedorIntegracion,
      clave: string,
    ): string | null => valores.get(`${proveedor}/${clave}`) ?? null;

    return {
      whatsappToken: leer("WHATSAPP", "TOKEN"),
      whatsappPhoneNumberId: leer("WHATSAPP", "PHONE_NUMBER_ID"),
      whatsappVerifyToken: leer("WHATSAPP", "VERIFY_TOKEN"),
      whatsappAppSecret: leer("WHATSAPP", "APP_SECRET"),
      whatsappWabaId: leer("WHATSAPP", "WABA_ID"),
      criterios: {
        excluirMarcas: preferencias?.excluirMarcas ?? false,
        requiereMacros: preferencias?.requiereMacros ?? false,
        maxCaloriasPor100: preferencias?.maxCaloriasPor100 ?? null,
        excluirTexto: preferencias?.excluirTexto ?? [],
      },
    };
  }

  async guardar(datos: DatosCredenciales): Promise<void> {
    if (!this.cifrador) {
      throw new Error(
        "Falta TOKENS_SECRET para guardar credenciales cifradas.",
      );
    }
    const inquilino = inquilinoActual();

    const cambios: [RefCredencial, string | null | undefined][] = [
      [{ proveedor: "WHATSAPP", clave: "TOKEN" }, datos.whatsappToken],
      [WHATSAPP_PHONE_NUMBER_ID, datos.whatsappPhoneNumberId],
      [WHATSAPP_VERIFY_TOKEN, datos.whatsappVerifyToken],
      [WHATSAPP_APP_SECRET, datos.whatsappAppSecret],
      [WHATSAPP_WABA_ID, datos.whatsappWabaId],
    ];

    for (const [ref, valor] of cambios) {
      await this.guardarValor(inquilino, ref, valor);
    }

    if (datos.criterios === undefined) return;

    const preferencias = {
      excluirMarcas: datos.criterios?.excluirMarcas,
      requiereMacros: datos.criterios?.requiereMacros,
      maxCaloriasPor100:
        datos.criterios === undefined
          ? undefined
          : datos.criterios.maxCaloriasPor100,
      excluirTexto: datos.criterios?.excluirTexto,
    };
    await this.prisma.preferenciasIntegracion.upsert({
      where: { nutricionistaId: inquilino },
      create: { nutricionistaId: inquilino, ...preferencias },
      update: preferencias,
    });
  }

  async eliminar(integracion: IntegracionCredenciales): Promise<void> {
    const inquilino = inquilinoActual();
    // La extensión multi-inquilino ya acota el `deleteMany`, pero el filtro va
    // escrito igual: es un borrado, y no quiero que la única cosa que separa
    // los consultorios acá sea implícita.
    await this.prisma.credencialProveedor.deleteMany({
      where: {
        nutricionistaId: inquilino,
        OR: CLAVES_DE_INTEGRACION[integracion],
      },
    });
  }

  /**
   * `undefined` → dejar como está; vacío/null → borrar la fila;
   * string → crear o reemplazar, refrescando `rotadoEn`.
   */
  private async guardarValor(
    inquilino: string,
    ref: RefCredencial,
    valor: string | null | undefined,
  ): Promise<void> {
    if (valor === undefined) return;
    const limpio = valor?.trim() ?? "";
    const donde = {
      nutricionistaId_proveedor_clave: {
        nutricionistaId: inquilino,
        proveedor: ref.proveedor,
        clave: ref.clave,
      },
    };

    if (limpio === "") {
      await this.prisma.credencialProveedor.deleteMany({
        where: { proveedor: ref.proveedor, clave: ref.clave },
      });
      return;
    }

    const guardado = esSecreto(ref) ? this.cifrador!.cifrar(limpio) : limpio;
    await this.prisma.credencialProveedor.upsert({
      where: donde,
      create: {
        nutricionistaId: inquilino,
        proveedor: ref.proveedor,
        clave: ref.clave,
        valor: guardado,
      },
      update: { valor: guardado, rotadoEn: new Date() },
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
