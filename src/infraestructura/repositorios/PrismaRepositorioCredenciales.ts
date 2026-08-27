import type { PrismaClient } from "@prisma/client";
import type {
  ICredencialesIntegracionRepositorio,
  CredencialesIntegracion,
  DatosCredenciales,
} from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import type { ProveedorIA } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";

/**
 * Repositorio de credenciales de integración por inquilino. Cifra/descifra con
 * `CifradorTokens` (AES-256-GCM). Si no hay `TOKENS_SECRET` (cifrador null),
 * `obtener` devuelve credenciales vacías y `guardar` lanza un error claro.
 * La extensión multi-inquilino acota `findFirst` y setea `nutricionistaId`.
 */
export class PrismaRepositorioCredenciales implements ICredencialesIntegracionRepositorio {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cifrador: CifradorTokens | null,
  ) {}

  async obtener(): Promise<CredencialesIntegracion | null> {
    const fila = await this.prisma.credencialesIntegracion.findFirst();
    if (!fila) return null;
    return {
      proveedorIA: fila.proveedorIA === "OPENROUTER" ? "OPENROUTER" : "ANTHROPIC",
      anthropicApiKey: this.descifrar(fila.anthropicApiKeyCifrada),
      anthropicModelo: fila.anthropicModelo,
      fatsecretClientId: this.descifrar(fila.fatsecretClientIdCifrado),
      fatsecretClientSecret: this.descifrar(fila.fatsecretClientSecretCifrado),
      whatsappToken: this.descifrar(fila.whatsappTokenCifrado),
      whatsappPhoneNumberId: fila.whatsappPhoneNumberId,
      whatsappVerifyToken: this.descifrar(fila.whatsappVerifyTokenCifrado),
      whatsappAppSecret: this.descifrar(fila.whatsappAppSecretCifrado),
      criterios: {
        excluirMarcas: fila.criterioExcluirMarcas,
        requiereMacros: fila.criterioRequiereMacros,
        maxCaloriasPor100: fila.criterioMaxCaloriasPor100,
        excluirTexto: fila.criterioExcluirTexto,
      },
    };
  }

  async guardar(datos: DatosCredenciales): Promise<void> {
    if (!this.cifrador) {
      throw new Error("Falta TOKENS_SECRET para guardar credenciales cifradas.");
    }
    const data = {
      proveedorIA: proveedorOpc(datos.proveedorIA),
      anthropicApiKeyCifrada: this.cifrarOpc(datos.anthropicApiKey),
      anthropicModelo: this.planoOpc(datos.anthropicModelo),
      fatsecretClientIdCifrado: this.cifrarOpc(datos.fatsecretClientId),
      fatsecretClientSecretCifrado: this.cifrarOpc(datos.fatsecretClientSecret),
      whatsappTokenCifrado: this.cifrarOpc(datos.whatsappToken),
      // El phone_number_id va en claro: es lo que identifica al inquilino
      // cuando entra un webhook, antes de poder descifrar nada suyo.
      whatsappPhoneNumberId: this.planoOpc(datos.whatsappPhoneNumberId),
      whatsappVerifyTokenCifrado: this.cifrarOpc(datos.whatsappVerifyToken),
      whatsappAppSecretCifrado: this.cifrarOpc(datos.whatsappAppSecret),
      // Criterios: si vienen, se guardan completos (undefined = sin cambio).
      criterioExcluirMarcas: datos.criterios?.excluirMarcas,
      criterioRequiereMacros: datos.criterios?.requiereMacros,
      criterioMaxCaloriasPor100:
        datos.criterios === undefined ? undefined : datos.criterios.maxCaloriasPor100,
      criterioExcluirTexto: datos.criterios?.excluirTexto,
    };

    const existente = await this.prisma.credencialesIntegracion.findFirst();
    if (existente) {
      await this.prisma.credencialesIntegracion.update({ where: { id: existente.id }, data });
    } else {
      await this.prisma.credencialesIntegracion.create({ data: { id: crypto.randomUUID(), ...data } });
    }
  }

  /** undefined → sin cambio (Prisma lo ignora); vacío → borrar; string → cifrar. */
  private cifrarOpc(valor: string | null | undefined): string | null | undefined {
    if (valor === undefined) return undefined;
    const limpio = valor?.trim() ?? "";
    return limpio === "" ? null : this.cifrador!.cifrar(limpio);
  }

  private planoOpc(valor: string | null | undefined): string | null | undefined {
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

/** undefined → sin cambio; si viene, se guarda el proveedor (texto plano). */
function proveedorOpc(valor: ProveedorIA | undefined): string | undefined {
  return valor === undefined ? undefined : valor;
}
