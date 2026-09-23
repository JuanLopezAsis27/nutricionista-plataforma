import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type {
  IInterpretadorMediciones,
  MedicionSugerida,
  MedicionesSugeridas,
} from "@/dominio/servicios/IInterpretadorMediciones";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { comoErrorIA } from "@/dominio/errores/ErrorIA";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

const numeroONulo = { type: ["number", "null"] };
const textoONulo = { type: ["string", "null"] };

/**
 * Las medidas salen de `CAMPOS_PLANTILLA`, la misma lista que usan la
 * plantilla de carga y la lectura de fichas. Derivarla en vez de escribirla
 * acá evita que el día que se sume una medida al modelo esta extracción se
 * quede sin ella en silencio.
 */
const CAMPOS_MANUALES = [
  "kgGrasa",
  "fuerzaPresionDerecha",
  "fuerzaPresionIzquierda",
] as const;

const PROPIEDADES_MEDICION: Record<string, unknown> = {
  fecha: textoONulo,
  pesoKg: numeroONulo,
  observaciones: textoONulo,
  ...Object.fromEntries(CAMPOS_MANUALES.map((campo) => [campo, numeroONulo])),
  ...Object.fromEntries(CAMPOS_PLANTILLA.map((campo) => [campo, numeroONulo])),
};

const ESQUEMA_MEDICIONES = {
  type: "object",
  additionalProperties: false,
  required: ["nombreEnPlanilla", "mediciones"],
  properties: {
    nombreEnPlanilla: textoONulo,
    mediciones: {
      type: "array",
      maxItems: 60,
      items: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(PROPIEDADES_MEDICION),
        properties: PROPIEDADES_MEDICION,
      },
    },
  },
};

/**
 * Los datos que la app inyecta en el system prompt de esta lectura: la fecha de
 * hoy y la lista de medidas que sabe importar.
 *
 * La lista se deriva de `CAMPOS_PLANTILLA` en vez de ir escrita en el prompt
 * para que el día que se sume una medida al modelo, esta importación no se
 * quede sin ella. El texto alrededor sí es editable desde Integraciones → IA.
 */
function variablesDeMediciones(hoy: string): Record<string, string> {
  return {
    hoy,
    medidas: CAMPOS_PLANTILLA.map(
      (campo) => `${campo} (${ETIQUETAS_CAMPO_PLANTILLA[campo]})`,
    ).join(", "),
  };
}

/**
 * Lee una planilla de evolución (Excel, PDF o foto) con el LLM del consultorio
 * y devuelve TODAS las mediciones que reconoció, una por consulta.
 *
 * Sin proveedor configurado LANZA, igual que el resto de la IA que toca datos
 * clínicos: no hay stub que invente la serie histórica de una persona.
 */
export class InterpretadorMedicionesLLM implements IInterpretadorMediciones {
  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
  ) {}

  async interpretar(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<MedicionesSugeridas> {
    try {
      return await this.leer(archivo);
    } catch (error) {
      // Sin esto, cualquier falla —la IA sin configurar, un archivo que no se
      // puede abrir, una respuesta cortada— llegaba a la pantalla como "error
      // inesperado", y el profesional no tenía forma de saber si el problema
      // era la planilla o la IA.
      throw comoErrorIA("La lectura de la planilla", error);
    }
  }

  private async leer(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<MedicionesSugeridas> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) {
      throw new Error(
        "No hay IA configurada para leer la planilla. La activa el administrador de la plataforma; mientras tanto, cargá las mediciones a mano.",
      );
    }

    const bloqueArchivo = await leerDocumentoParaLLM(
      this.almacenamiento,
      archivo,
    );

    const texto = await llm.completar({
      system: await this.prompts.obtener(
        "MEDICIONES",
        variablesDeMediciones(new Date().toISOString().slice(0, 10)),
      ),
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto:
            "Extraé todas las mediciones antropométricas que figuren en esta planilla, una por consulta.",
        },
      ],
      // El tope lo comparten el razonamiento y la respuesta, y cada consulta
      // son ~300 tokens de JSON. Con 16k, en una planilla de muchas columnas
      // el razonamiento se comía el resto, el JSON llegaba cortado y la
      // pantalla mostraba un error inesperado. Se cobra lo que se usa, no el
      // tope; el proveedor lo pide en stream para que no choque con el
      // timeout HTTP.
      maxTokens: 64000,
      // Mismo criterio que el resto de la extracción clínica: leer una
      // planilla y repartirla en columnas no es tarea de una sola pasada.
      esfuerzo: "alto",
      esquemaJson: {
        nombre: "mediciones_planilla",
        esquema: ESQUEMA_MEDICIONES,
      },
    });

    return normalizarMediciones(JSON.parse(texto) as Record<string, unknown>);
  }
}

/**
 * Traduce la respuesta cruda del modelo a la forma del dominio.
 *
 * Todo se revalida acá aunque el esquema JSON ya lo pida: el esquema es una
 * instrucción al modelo, no una garantía, y lo que salga de este método se
 * ofrece para importar al historial de un paciente. Se exporta para poder
 * testearlo sin llamar al proveedor.
 */
export function normalizarMediciones(
  datos: Record<string, unknown>,
): MedicionesSugeridas {
  const mediciones = lista(datos.mediciones)
    .flatMap(normalizarMedicion)
    // Por fecha ascendente, como las columnas de la planilla. Las que no
    // tienen fecha van al final: son las que el profesional tiene que
    // completar antes de importar.
    .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));

  return {
    nombreEnPlanilla: texto(datos.nombreEnPlanilla),
    mediciones,
  };
}

function normalizarMedicion(cruda: unknown): MedicionSugerida[] {
  if (!cruda || typeof cruda !== "object" || Array.isArray(cruda)) return [];
  const item = cruda as Record<string, unknown>;

  // Sin peso no hay medición: la entidad `Antropometria` lo exige, y una
  // columna con un par de pliegues sueltos no se puede registrar ni calcula
  // nada. Se descarta acá y no en la UI para no ofrecer importar algo que el
  // alta va a rechazar.
  const pesoKg = numero(item.pesoKg);
  if (pesoKg === null) return [];

  // Las medidas se copian por nombre desde `CAMPOS_PLANTILLA`, así que la
  // escritura es dinámica; el objeto se arma como Record y se estrecha al
  // devolverlo, con `pesoKg` ya verificado arriba.
  const medidas: Record<string, unknown> = {
    pesoKg,
    fecha: fechaIso(item.fecha),
    observaciones: texto(item.observaciones),
  };
  for (const campo of [...CAMPOS_PLANTILLA, ...CAMPOS_MANUALES] as const) {
    const valor = numero(item[campo]);
    if (valor !== null) {
      medidas[campo] = valor;
    }
  }
  return [medidas as unknown as MedicionSugerida];
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/** Solo `YYYY-MM-DD` real: una fecha malformada del modelo se descarta. */
function fechaIso(valor: unknown): string | null {
  const crudo = texto(valor);
  if (!crudo || !/^\d{4}-\d{2}-\d{2}$/.test(crudo)) return null;
  const fecha = new Date(`${crudo}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : crudo;
}
