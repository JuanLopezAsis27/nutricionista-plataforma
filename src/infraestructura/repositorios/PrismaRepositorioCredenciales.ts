import type { PrismaClient, ProveedorIntegracion } from "@prisma/client";
import type {
  ICredencialesIntegracionRepositorio,
  CredencialesIntegracion,
  DatosCredenciales,
  ProveedorIA,
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

/**
 * Claves que se guardan EN CLARO.
 *
 * Es una lista corta y deliberada: el `phone_number_id` es lo único que la app
 * necesita leer antes de poder descifrar nada, porque es lo que identifica al
 * inquilino cuando entra un webhook sin sesión. Todo lo demás va cifrado.
 */
const EN_CLARO = new Set<string>([
  `${WHATSAPP_PHONE_NUMBER_ID.proveedor}/${WHATSAPP_PHONE_NUMBER_ID.clave}`,
]);

function esSecreto(ref: RefCredencial): boolean {
  return !EN_CLARO.has(`${ref.proveedor}/${ref.clave}`);
}

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

    const proveedorIA: ProveedorIA =
      preferencias?.proveedorIA === "OPENROUTER" ? "OPENROUTER" : "ANTHROPIC";

    return {
      proveedorIA,
      // La clave de IA se guarda bajo el proveedor elegido.
      anthropicApiKey: leer(proveedorIA, "API_KEY"),
      anthropicModelo: preferencias?.modeloIA ?? null,
      fatsecretClientId: leer("FATSECRET", "CLIENT_ID"),
      fatsecretClientSecret: leer("FATSECRET", "CLIENT_SECRET"),
      whatsappToken: leer("WHATSAPP", "TOKEN"),
      whatsappPhoneNumberId: leer("WHATSAPP", "PHONE_NUMBER_ID"),
      whatsappVerifyToken: leer("WHATSAPP", "VERIFY_TOKEN"),
      whatsappAppSecret: leer("WHATSAPP", "APP_SECRET"),
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

    // El proveedor de IA en vigor decide bajo cuál se guarda la clave.
    const proveedorIA: ProveedorIA =
      datos.proveedorIA ?? (await this.obtener())?.proveedorIA ?? "ANTHROPIC";

    const cambios: [RefCredencial, string | null | undefined][] = [
      [{ proveedor: proveedorIA, clave: "API_KEY" }, datos.anthropicApiKey],
      [{ proveedor: "FATSECRET", clave: "CLIENT_ID" }, datos.fatsecretClientId],
      [
        { proveedor: "FATSECRET", clave: "CLIENT_SECRET" },
        datos.fatsecretClientSecret,
      ],
      [{ proveedor: "WHATSAPP", clave: "TOKEN" }, datos.whatsappToken],
      [WHATSAPP_PHONE_NUMBER_ID, datos.whatsappPhoneNumberId],
      [WHATSAPP_VERIFY_TOKEN, datos.whatsappVerifyToken],
      [WHATSAPP_APP_SECRET, datos.whatsappAppSecret],
    ];

    for (const [ref, valor] of cambios) {
      await this.guardarValor(inquilino, ref, valor);
    }

    const tienePreferencias =
      datos.proveedorIA !== undefined ||
      datos.anthropicModelo !== undefined ||
      datos.criterios !== undefined;
    if (!tienePreferencias) return;

    const preferencias = {
      proveedorIA: datos.proveedorIA,
      modeloIA: this.limpiar(datos.anthropicModelo),
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

  private limpiar(valor: string | null | undefined): string | null | undefined {
    if (valor === undefined) return undefined;
    const limpio = valor?.trim() ?? "";
    return limpio === "" ? null : limpio;
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
