import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type {
  IInterpretadorHistoriaClinica,
  CampoEvolucionPedido,
  EvolucionSugerida,
  LecturaHistoriaClinica,
} from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type { CamposHistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import type { CampoPersonalizadoEvolucion } from "@/dominio/entidades/Evolucion";
import {
  CAMPOS_EVOLUCION,
  ETIQUETAS_EVOLUCION,
} from "@/dominio/entidades/Evolucion";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

const CAMPOS = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "alergiasIntolerancias",
  "antecedentesDigestivos",
  "antecedentesFamiliares",
  "entrenamientos",
  "descanso",
  "habitos",
  "informacionGeneral",
] as const satisfies readonly (keyof CamposHistoriaClinica)[];

const textoONulo = { type: ["string", "null"] };

function esquemaLectura(
  camposEvolucion: CampoEvolucionPedido[],
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["historiaClinica", "evoluciones"],
    properties: {
      historiaClinica: {
        type: "object",
        additionalProperties: false,
        required: [...CAMPOS],
        properties: Object.fromEntries(
          CAMPOS.map((campo) => [campo, textoONulo]),
        ),
      },
      evoluciones: {
        type: "array",
        maxItems: 60,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fecha",
            ...CAMPOS_EVOLUCION,
            ...camposEvolucion.map((campo) => campo.clave),
          ],
          properties: {
            fecha: textoONulo,
            ...Object.fromEntries(
              CAMPOS_EVOLUCION.map((campo) => [campo, textoONulo]),
            ),
            ...Object.fromEntries(
              camposEvolucion.map((campo) => [campo.clave, textoONulo]),
            ),
          },
        },
      },
    },
  };
}

/**
 * Los datos que la app inyecta en el system prompt de esta lectura: la fecha de
 * hoy, los campos de evolución que trae la app y los propios del consultorio.
 *
 * Los campos se derivan del código y del alta del profesional en vez de ir
 * escritos en el prompt: así dar de alta un campo nuevo alcanza para que la
 * extracción lo busque. El texto alrededor sí es editable desde
 * Integraciones → IA.
 */
function variablesDeHistoria(
  camposEvolucion: CampoEvolucionPedido[],
  hoy: string,
): Record<string, string> {
  return {
    hoy,
    camposFijos: CAMPOS_EVOLUCION.map(
      (campo) => `${campo} (${ETIQUETAS_EVOLUCION[campo]})`,
    ).join(", "),
    camposPersonalizados:
      camposEvolucion.length > 0
        ? "\n\nEl consultorio además sigue estos campos propios en cada evolución. Completalos usando EXACTAMENTE estas claves:\n" +
          camposEvolucion
            .map(
              (campo) =>
                `- ${campo.clave}: ${campo.etiqueta}` +
                (campo.descripcion ? ` (${campo.descripcion})` : ""),
            )
            .join("\n")
        : "",
  };
}

/**
 * Interpreta una foto, un PDF, un Word o un Excel de historia clínica con el
 * LLM del consultorio y sugiere los campos del formulario **más las
 * evoluciones de control** que el documento traiga.
 *
 * Las dos lecturas van en la MISMA pasada a propósito: el cuaderno del
 * profesional suele ser un solo archivo con la ficha adelante y el seguimiento
 * atrás, y partirlo en dos llamadas costaría el doble para leer lo mismo.
 *
 * Sin proveedor configurado LANZA (no hay stub que invente datos clínicos):
 * mismo criterio que `ResumidorConsultaLLM`, porque lo que salga de acá se
 * ofrece para cargar en la ficha del paciente.
 */
export class InterpretadorHistoriaClinicaLLM implements IInterpretadorHistoriaClinica {
  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
  ) {}

  async interpretar(
    archivo: { clave: string; mimeType: string },
    camposEvolucion: CampoEvolucionPedido[],
  ): Promise<LecturaHistoriaClinica> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) {
      throw new Error(
        "No hay IA configurada para interpretar el archivo. Cargá la clave en Integraciones o completá los campos a mano.",
      );
    }

    const bloqueArchivo = await leerDocumentoParaLLM(
      this.almacenamiento,
      archivo,
    );

    const texto = await llm.completar({
      system: await this.prompts.obtener(
        "HISTORIA_CLINICA",
        variablesDeHistoria(
          camposEvolucion,
          new Date().toISOString().slice(0, 10),
        ),
      ),
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto:
            "Extraé la historia clínica y todas las evoluciones de control de este documento.",
        },
      ],
      // Un cuaderno de seguimiento son varias consultas con ocho campos cada
      // una: con el tope que alcanzaba para los campos sueltos de la ficha, la última
      // evolución se cortaba a la mitad.
      maxTokens: 16000,
      // Mismo criterio que la ficha de alta: extraer de un documento clínico
      // no es una tarea de una pasada, y lo que salga se copia a la ficha.
      esfuerzo: "alto",
      esquemaJson: {
        nombre: "historia_clinica",
        esquema: esquemaLectura(camposEvolucion),
      },
    });

    return normalizarLectura(
      JSON.parse(texto) as Record<string, unknown>,
      camposEvolucion,
    );
  }
}

/**
 * Traduce la respuesta cruda del modelo a la forma del dominio.
 *
 * Todo se revalida acá aunque el esquema JSON ya lo pida: el esquema es una
 * instrucción al modelo, no una garantía, y lo que salga de este método se
 * ofrece para cargar en la ficha de un paciente. Se exporta para poder
 * testearlo sin llamar al proveedor.
 */
export function normalizarLectura(
  datos: Record<string, unknown>,
  pedidos: CampoEvolucionPedido[],
): LecturaHistoriaClinica {
  const historiaCruda = objeto(datos.historiaClinica);
  const campos: Partial<CamposHistoriaClinica> = {};
  for (const campo of CAMPOS) {
    campos[campo] = texto(historiaCruda[campo]);
  }

  const evoluciones = lista(datos.evoluciones)
    .flatMap((cruda) => normalizarEvolucion(cruda, pedidos))
    // Por fecha ascendente, como se leen en el cuaderno. Las que no tienen
    // fecha van al final: son las que el profesional tiene que completar.
    .sort((a, b) => (a.fecha ?? "9999").localeCompare(b.fecha ?? "9999"));

  return { campos, evoluciones };
}

function normalizarEvolucion(
  cruda: unknown,
  pedidos: CampoEvolucionPedido[],
): EvolucionSugerida[] {
  if (!cruda || typeof cruda !== "object" || Array.isArray(cruda)) return [];
  const item = cruda as Record<string, unknown>;

  const evolucion: EvolucionSugerida = {
    fecha: fechaIso(item.fecha),
    camposPersonalizados: [],
  };
  let tieneContenido = false;

  for (const campo of CAMPOS_EVOLUCION) {
    const valor = texto(item[campo]);
    if (valor !== null) {
      evolucion[campo] = valor;
      tieneContenido = true;
    }
  }

  const personalizados: CampoPersonalizadoEvolucion[] = [];
  for (const pedido of pedidos) {
    const valor = texto(item[pedido.clave]);
    if (valor !== null) {
      personalizados.push({
        clave: pedido.clave,
        etiqueta: pedido.etiqueta,
        valor,
      });
      tieneContenido = true;
    }
  }
  evolucion.camposPersonalizados = personalizados;

  // Una evolución sin un solo campo cargado no se ofrece: la entidad la
  // rechazaría, y una fila vacía en la pantalla de revisión es solo ruido.
  return tieneContenido ? [evolucion] : [];
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/** Solo `YYYY-MM-DD` real: una fecha malformada del modelo se descarta. */
function fechaIso(valor: unknown): string | null {
  const crudo = texto(valor);
  if (!crudo || !/^\d{4}-\d{2}-\d{2}$/.test(crudo)) return null;
  const fecha = new Date(`${crudo}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : crudo;
}
