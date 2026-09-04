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
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";

const numeroONulo = { type: ["number", "null"] };
const textoONulo = { type: ["string", "null"] };

/**
 * Las medidas salen de `CAMPOS_PLANTILLA`, la misma lista que usan la
 * plantilla de carga y la lectura de fichas. Derivarla en vez de escribirla
 * acá evita que el día que se sume una medida al modelo esta extracción se
 * quede sin ella en silencio.
 */
const PROPIEDADES_MEDICION: Record<string, unknown> = {
  fecha: textoONulo,
  pesoKg: numeroONulo,
  kgGrasa: numeroONulo,
  observaciones: textoONulo,
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

function construirSystem(hoy: string): string {
  const medidas = CAMPOS_PLANTILLA.map(
    (campo) => `${campo} (${ETIQUETAS_CAMPO_PLANTILLA[campo]})`,
  ).join(", ");

  return `Sos el asistente de un consultorio de nutrición. Recibís la planilla de evolución de UN paciente y extraés TODAS las mediciones antropométricas que estén cargadas ahí, una por consulta, para importarlas sin tipearlas a mano.

Hoy es ${hoy}.

CÓMO ESTÁ ARMADA LA PLANILLA. Casi siempre es una tabla donde cada COLUMNA es una consulta (encabezada por su fecha) y cada FILA es una medida (peso, cintura, un pliegue). Puede venir al revés —una fila por consulta y una columna por medida—: mirá dónde están las fechas para saber cuál de las dos es. Devolvé UN objeto por consulta, con todas las medidas de esa columna (o fila) juntas.

Reglas:
1. NO inventes NADA. Si una medida no está cargada para esa consulta, devolvé null. Es una planilla clínica: un número inventado termina en el historial de una persona real.
2. NO calcules ni completes nada: no interpoles entre dos consultas, no promedies, no arrastres el valor de la consulta anterior a una columna vacía. Copiá solo lo que está escrito.
3. Fechas SIEMPRE en formato ISO YYYY-MM-DD. En español se escribe DÍA/MES/AÑO, así que 03/11/2024 es el 2024-11-03. Si una columna no tiene fecha legible, devolvé fecha null igual (el profesional la completa); no la inventes ni la deduzcas de las otras.
4. Unidades: peso en kg, tallas / perímetros / diámetros en cm, pliegues en mm, kgGrasa en kg. Si la planilla usa otra unidad, convertila.
5. HAY VALORES QUE NO SE IMPORTAN porque el sistema los recalcula solo: la sumatoria de pliegues, los kg bajados (contra la consulta anterior o acumulados), el porcentaje de grasa, el IMC y cualquier otro derivado. Ignorá esas filas. La única excepción es kgGrasa, que sí se guarda cuando la planilla lo trae.
6. Una medida que la planilla anota UNA sola vez para todo el paciente —típicamente la talla— va repetida en TODAS las mediciones: es la misma persona.
7. Si una columna no tiene peso, devolvela igual con pesoKg null; no la descartes por tu cuenta.
8. Ordená las mediciones por fecha, de la más vieja a la más nueva.
9. En "observaciones" va SOLO lo que la planilla anote por escrito para esa consulta (un comentario, una aclaración). Si no hay nada, null.
10. En "nombreEnPlanilla" va el nombre del paciente tal como figura en la planilla, si figura. Si no, null. Respondé en español.

CUIDADO CON LOS NOMBRES PARECIDOS, que son los que se confunden:
- "Cintura mínima" y "cintura máxima" son perímetros DISTINTOS. Si la planilla dice solo "cintura", va en circCinturaMinima.
- "Brazo" es circBrazo (relajado); "brazo contraído" o "flexionado" es circBrazoContraido.
- Las filas que empiezan con "P" suelen ser PLIEGUES (mm) y las que empiezan con "C", CIRCUNFERENCIAS (cm). La planilla puede aclararlo en una referencia al pie: leela.
- "Tórax" como perímetro es circTorax; como diámetro es diamToraxTransverso o diamToraxAnteroposterior.

Las medidas que se pueden importar son: ${medidas}. Además: pesoKg (peso en kg) y kgGrasa (kg de grasa que anote la planilla).`;
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
  ) {}

  async interpretar(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<MedicionesSugeridas> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) {
      throw new Error(
        "No hay IA configurada para leer la planilla. Cargá la clave en Integraciones o cargá las mediciones a mano.",
      );
    }

    const bloqueArchivo = await leerDocumentoParaLLM(
      this.almacenamiento,
      archivo,
    );

    const texto = await llm.completar({
      system: construirSystem(new Date().toISOString().slice(0, 10)),
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto:
            "Extraé todas las mediciones antropométricas que figuren en esta planilla, una por consulta.",
        },
      ],
      // Una serie de 10 consultas con 20 medidas cada una es una respuesta
      // larga: con el tope de una ficha suelta, la última columna se cortaba.
      maxTokens: 16000,
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
  for (const campo of [...CAMPOS_PLANTILLA, "kgGrasa"] as const) {
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
