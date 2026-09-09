import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type {
  IAnalisisComidaIA,
  ResultadoAnalisisComida,
} from "@/dominio/servicios/IAnalisisComidaIA";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type { BloqueUsuario } from "./IProveedorLLM";

const NOTA_IA =
  "Estimación aproximada con IA a partir de la foto. Ante dudas, confirmá con tu nutricionista.";

const MIMES_VALIDOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type MimeImagen = (typeof MIMES_VALIDOS)[number];

/** Esquema del JSON que debe devolver el modelo. */
const ESQUEMA_COMIDA = {
  type: "object",
  additionalProperties: false,
  properties: {
    descripcion: { type: "string" },
    porcionEstimada: { type: "string" },
    calorias: { type: "number" },
    proteinasG: { type: "number" },
    carbohidratosG: { type: "number" },
    grasasG: { type: "number" },
    confianza: { type: "number" },
  },
  required: [
    "descripcion",
    "porcionEstimada",
    "calorias",
    "proteinasG",
    "carbohidratosG",
    "grasasG",
    "confianza",
  ],
};

const SYSTEM_VISION = [
  "Estimás los datos nutricionales de una comida a partir de una foto y/o una descripción.",
  "Devolvés SOLO el JSON pedido: una descripción breve de la comida, la porción estimada y",
  "los macros (calorías, proteínas, carbohidratos y grasas en gramos) de la porción visible.",
  "Sé honesto con la confianza (0 a 1): más baja si la foto es ambigua o falta información.",
  "Es una estimación aproximada, no un valor exacto. Respondé en español.",
].join(" ");

/**
 * Adaptador de análisis de foto de comida con IA (visión). Descarga la imagen
 * del bucket, la envía al modelo (Claude u OpenRouter) junto con la descripción
 * y devuelve porción + macros estimados (JSON). Si algo falla, DEGRADA al stub.
 */
export class AnalisisComidaIAClaude implements IAnalisisComidaIA {
  constructor(
    private readonly resolver: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly respaldo: IAnalisisComidaIA,
  ) {}

  async analizar(entrada: {
    archivoClave?: string;
    descripcion?: string;
  }): Promise<ResultadoAnalisisComida> {
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return this.respaldo.analizar(entrada);

    try {
      const usuario: BloqueUsuario[] = [];
      if (entrada.archivoClave) {
        const imagen = await this.descargarImagen(entrada.archivoClave);
        usuario.push({
          tipo: "imagen",
          base64: imagen.datosBase64,
          mimeType: imagen.mimeType,
        });
      }
      usuario.push({ tipo: "texto", texto: instruccion(entrada.descripcion) });

      const texto = await llm.completar({
        system: SYSTEM_VISION,
        usuario,
        maxTokens: 1024,
        esquemaJson: { nombre: "comida", esquema: ESQUEMA_COMIDA },
      });

      const datos = JSON.parse(texto) as Record<string, unknown>;
      return {
        descripcion: campoTexto(
          datos.descripcion,
          entrada.descripcion?.trim() || "Comida",
        ),
        porcionEstimada: campoTexto(datos.porcionEstimada, "1 porción"),
        calorias: numero(datos.calorias),
        proteinasG: numero(datos.proteinasG),
        carbohidratosG: numero(datos.carbohidratosG),
        grasasG: numero(datos.grasasG),
        confianza: acotar(numero(datos.confianza), 0, 1),
        nota: NOTA_IA,
      };
    } catch {
      return this.respaldo.analizar(entrada);
    }
  }

  /** Descarga la imagen del bucket (URL firmada) y la devuelve en base64. */
  private async descargarImagen(
    clave: string,
  ): Promise<{ datosBase64: string; mimeType: MimeImagen }> {
    const url = await this.almacenamiento.generarUrlLectura(clave, 120);
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
      throw new Error(
        `No se pudo leer la imagen del bucket (${respuesta.status}).`,
      );
    }
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    const mime =
      respuesta.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    return {
      datosBase64: bytes.toString("base64"),
      mimeType: normalizarMime(mime),
    };
  }
}

function instruccion(descripcion?: string): string {
  const contexto = descripcion?.trim()
    ? ` El paciente la describe así: "${descripcion.trim()}".`
    : "";
  return `Estimá los datos nutricionales de esta comida.${contexto}`;
}

function normalizarMime(mime: string): MimeImagen {
  return (MIMES_VALIDOS as ReadonlyArray<string>).includes(mime)
    ? (mime as MimeImagen)
    : "image/jpeg";
}

function numero(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

function acotar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo);
}

function campoTexto(valor: unknown, porDefecto: string): string {
  return typeof valor === "string" && valor.trim() ? valor.trim() : porDefecto;
}
