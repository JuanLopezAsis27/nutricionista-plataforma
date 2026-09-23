import type { PrismaClient } from "@prisma/client";
import type {
  ConfiguracionIAGlobal,
  DatosConfiguracionIAGlobal,
  IConfiguracionIAGlobalRepositorio,
  ProveedorClaveIA,
} from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";

/** La única fila de la tabla. */
const ID = "global";

/** Columna donde vive la clave (cifrada) de cada proveedor. */
const COLUMNA: Record<
  ProveedorClaveIA,
  "claveAnthropic" | "claveOpenRouter" | "claveOpenAI"
> = {
  ANTHROPIC: "claveAnthropic",
  OPENROUTER: "claveOpenRouter",
  OPENAI: "claveOpenAI",
};

/**
 * Configuración de IA de la plataforma: una sola fila, sin inquilino.
 *
 * No pasa por el filtro multi-inquilino (no tiene `nutricionistaId`), así que
 * se lee igual desde la request de un consultorio, desde el worker o desde el
 * panel del SUPERADMIN. Las claves se cifran con el mismo `CifradorTokens` que
 * las credenciales de cada consultorio.
 */
export class PrismaRepositorioConfiguracionIAGlobal implements IConfiguracionIAGlobalRepositorio {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cifrador: CifradorTokens | null,
  ) {}

  async obtener(): Promise<ConfiguracionIAGlobal> {
    const fila = await this.prisma.configuracionIAGlobal.findUnique({
      where: { id: ID },
    });
    return {
      claves: {
        ANTHROPIC: this.descifrar(fila?.claveAnthropic ?? null),
        OPENROUTER: this.descifrar(fila?.claveOpenRouter ?? null),
        OPENAI: this.descifrar(fila?.claveOpenAI ?? null),
      },
      proveedorIA:
        fila?.proveedorIA === "OPENROUTER" ? "OPENROUTER" : "ANTHROPIC",
      modeloIA: fila?.modeloIA ?? null,
      proveedorTranscripcion:
        fila?.proveedorTranscripcion === "OPENROUTER" ? "OPENROUTER" : "OPENAI",
      modeloTranscripcion: fila?.modeloTranscripcion ?? null,
    };
  }

  async guardar(datos: DatosConfiguracionIAGlobal): Promise<void> {
    const cambios: {
      claveAnthropic?: string | null;
      claveOpenRouter?: string | null;
      claveOpenAI?: string | null;
      proveedorIA?: string;
      modeloIA?: string | null;
      proveedorTranscripcion?: string;
      modeloTranscripcion?: string | null;
    } = {
      proveedorIA: datos.proveedorIA,
      modeloIA: limpiar(datos.modeloIA),
      proveedorTranscripcion: datos.proveedorTranscripcion,
      modeloTranscripcion: limpiar(datos.modeloTranscripcion),
    };

    for (const [proveedor, valor] of Object.entries(datos.claves ?? {}) as [
      ProveedorClaveIA,
      string | null | undefined,
    ][]) {
      const limpio = limpiar(valor);
      if (limpio === undefined) continue;
      if (limpio !== null && !this.cifrador) {
        throw new Error("Falta TOKENS_SECRET para guardar claves cifradas.");
      }
      cambios[COLUMNA[proveedor]] =
        limpio === null ? null : this.cifrador!.cifrar(limpio);
    }

    await this.prisma.configuracionIAGlobal.upsert({
      where: { id: ID },
      create: { id: ID, ...cambios },
      update: cambios,
    });
  }

  private descifrar(cifrado: string | null): string | null {
    if (!cifrado || !this.cifrador) return null;
    try {
      return this.cifrador.descifrar(cifrado);
    } catch {
      return null; // clave corrupta o TOKENS_SECRET cambiado
    }
  }
}

/** `undefined` → no tocar; vacío/null → borrar; texto → recortado. */
function limpiar(valor: string | null | undefined): string | null | undefined {
  if (valor === undefined) return undefined;
  const limpio = valor?.trim() ?? "";
  return limpio === "" ? null : limpio;
}
