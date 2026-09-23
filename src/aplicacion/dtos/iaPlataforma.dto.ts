import { z } from "zod";
import { PROVEEDORES_CLAVE_IA } from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";

/**
 * DTOs de la IA de la PLATAFORMA: las claves y los modelos que carga el
 * SUPERADMIN para todos los consultorios, y el registro de su uso.
 */

export const PROVEEDORES_IA = ["ANTHROPIC", "OPENROUTER"] as const;

/**
 * Proveedores de voz a texto. Anthropic no está porque no transcribe audio:
 * es la razón por la que esta elección existe aparte de `PROVEEDORES_IA`.
 */
export const PROVEEDORES_TRANSCRIPCION = ["OPENAI", "OPENROUTER"] as const;

/**
 * Un modelo de OpenRouter se nombra `proveedor/modelo` (`openai/gpt-4o-mini`,
 * `anthropic/claude-opus-5`, `google/gemini-2.5-pro`). Escribirlo de otra forma
 * —`openai-4o-mini`, `gpt-4o`— no es un modelo desconocido para OpenRouter: es
 * un nombre inválido, y la API contesta 400 a TODAS las llamadas.
 *
 * Se valida al guardar porque el error aparecía lejísimos de acá: el chat y el
 * análisis de foto se veían configurados («IA activa») y fallaban en cada
 * consultorio, sin nada que señalara la configuración.
 */
const MODELO_OPENROUTER = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+$/;

/** El mensaje de un modelo mal escrito para su proveedor, o null si está bien. */
function problemaDeModelo(
  proveedor: "ANTHROPIC" | "OPENROUTER" | "OPENAI",
  modelo: string,
): string | null {
  if (proveedor === "OPENROUTER" && !MODELO_OPENROUTER.test(modelo)) {
    return (
      `"${modelo}" no es un modelo de OpenRouter. Se escriben como ` +
      "proveedor/modelo, por ejemplo openai/gpt-4o-mini o anthropic/claude-opus-5."
    );
  }
  if (proveedor !== "OPENROUTER" && modelo.includes("/")) {
    return `"${modelo}" es un nombre de OpenRouter. La API de ${
      proveedor === "ANTHROPIC" ? "Anthropic" : "OpenAI"
    } usa el modelo solo, por ejemplo ${
      proveedor === "ANTHROPIC" ? "claude-opus-5" : "gpt-4o-transcribe"
    }.`;
  }
  return null;
}

/**
 * Guardar la configuración. Una clave vacía o ausente NO cambia la guardada
 * (el formulario nunca la recibe de vuelta); para borrarla está
 * `eliminarClaveIADto`. Un modelo vacío, en cambio, vuelve al de por defecto.
 */
export const guardarIAPlataformaDto = z
  .object({
    claves: z
      .object({
        ANTHROPIC: z.string().max(300).optional(),
        OPENROUTER: z.string().max(300).optional(),
        OPENAI: z.string().max(300).optional(),
      })
      .optional(),
    proveedorIA: z.enum(PROVEEDORES_IA).optional(),
    modeloIA: z.string().max(120).optional(),
    proveedorTranscripcion: z.enum(PROVEEDORES_TRANSCRIPCION).optional(),
    modeloTranscripcion: z.string().max(120).optional(),
  })
  .superRefine((datos, ctx) => {
    const modeloIA = datos.modeloIA?.trim();
    if (modeloIA && datos.proveedorIA) {
      const problema = problemaDeModelo(datos.proveedorIA, modeloIA);
      if (problema) {
        ctx.addIssue({ code: "custom", path: ["modeloIA"], message: problema });
      }
    }
    const modeloVoz = datos.modeloTranscripcion?.trim();
    if (modeloVoz && datos.proveedorTranscripcion) {
      const problema = problemaDeModelo(
        datos.proveedorTranscripcion,
        modeloVoz,
      );
      if (problema) {
        ctx.addIssue({
          code: "custom",
          path: ["modeloTranscripcion"],
          message: problema,
        });
      }
    }
  });
export type GuardarIAPlataformaDto = z.infer<typeof guardarIAPlataformaDto>;

export const eliminarClaveIADto = z.object({
  proveedor: z.enum(PROVEEDORES_CLAVE_IA),
});

/** Estado: nunca devuelve una clave, solo si está cargada. */
export const estadoIAPlataformaDto = z.object({
  claves: z.array(
    z.object({
      proveedor: z.enum(PROVEEDORES_CLAVE_IA),
      configurada: z.boolean(),
    }),
  ),
  proveedorIA: z.enum(PROVEEDORES_IA),
  modeloIA: z.string().nullable(),
  proveedorTranscripcion: z.enum(PROVEEDORES_TRANSCRIPCION),
  modeloTranscripcion: z.string().nullable(),
  /** El proveedor elegido tiene su clave: los consultorios tienen IA. */
  iaActiva: z.boolean(),
  transcripcionActiva: z.boolean(),
});
export type EstadoIAPlataformaDto = z.infer<typeof estadoIAPlataformaDto>;

export const resumenUsoIADto = z.object({
  /** Ventana hacia atrás desde hoy. */
  dias: z.number().int().min(1).max(365),
});

export const registrosUsoIADto = z.object({
  pagina: z.number().int().min(1).default(1),
  porPagina: z.number().int().min(1).max(100).default(20),
  soloErrores: z.boolean().optional(),
  nutricionistaId: z.string().optional(),
});
export type RegistrosUsoIADto = z.infer<typeof registrosUsoIADto>;
