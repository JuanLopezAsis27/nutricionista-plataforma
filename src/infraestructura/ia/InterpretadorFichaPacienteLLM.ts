import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type {
  IInterpretadorFichaPaciente,
  FichaPacienteSugerida,
  CampoPersonalizadoPedido,
  AntropometriaSugerida,
  LaboratorioSugerido,
  DatosPacienteSugeridos,
} from "@/dominio/servicios/IInterpretadorFichaPaciente";
import type {
  CamposHistoriaClinica,
  CampoPersonalizadoHistoria,
} from "@/dominio/entidades/HistoriaClinica";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import { derivarClave } from "@/dominio/servicios/claveCampo";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

const CAMPOS_HISTORIA = [
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

const CAMPOS_PACIENTE = [
  "nombre",
  "apellido",
  "email",
  "telefono",
  "fechaNacimiento",
  "sexo",
  "notas",
] as const satisfies readonly (keyof DatosPacienteSugeridos)[];

const textoONulo = { type: ["string", "null"] };
const numeroONulo = { type: ["number", "null"] };

/**
 * Las medidas salen de `CAMPOS_PLANTILLA`, la misma lista que usa la plantilla
 * de carga. Derivarla en vez de escribirla acá evita que el día que se sume una
 * medida al modelo esta extracción se quede sin ella en silencio.
 */
const PROPIEDADES_ANTROPOMETRIA: Record<string, unknown> = {
  fecha: textoONulo,
  pesoKg: numeroONulo,
  ...Object.fromEntries(CAMPOS_PLANTILLA.map((campo) => [campo, numeroONulo])),
};

function esquemaFicha(
  campos: CampoPersonalizadoPedido[],
): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "paciente",
      "historiaClinica",
      "camposPersonalizados",
      "otrosDatos",
      "antropometria",
      "laboratorios",
    ],
    properties: {
      paciente: {
        type: "object",
        additionalProperties: false,
        required: [...CAMPOS_PACIENTE],
        properties: {
          ...Object.fromEntries(
            CAMPOS_PACIENTE.map((campo) => [campo, textoONulo]),
          ),
          sexo: { type: ["string", "null"], enum: [...SEXOS_BIOLOGICOS, null] },
        },
      },
      historiaClinica: {
        type: "object",
        additionalProperties: false,
        required: [...CAMPOS_HISTORIA],
        properties: Object.fromEntries(
          CAMPOS_HISTORIA.map((campo) => [campo, textoONulo]),
        ),
      },
      camposPersonalizados: {
        type: "object",
        additionalProperties: false,
        required: campos.map((campo) => campo.clave),
        properties: Object.fromEntries(
          campos.map((campo) => [campo.clave, textoONulo]),
        ),
      },
      // El cajón de sastre. Sin esto, todo lo que la ficha traía y no entraba
      // en ningún campo conocido se perdía en silencio: el esquema es cerrado
      // (`additionalProperties: false`) y el modelo no tenía dónde ponerlo.
      otrosDatos: {
        type: "array",
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["etiqueta", "valor"],
          properties: {
            etiqueta: { type: "string" },
            valor: { type: "string" },
          },
        },
      },
      antropometria: {
        type: ["object", "null"],
        additionalProperties: false,
        required: Object.keys(PROPIEDADES_ANTROPOMETRIA),
        properties: PROPIEDADES_ANTROPOMETRIA,
      },
      laboratorios: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fecha", "titulo", "notas"],
          properties: {
            fecha: textoONulo,
            titulo: { type: "string" },
            notas: textoONulo,
          },
        },
      },
    },
  };
}

/**
 * Los datos que la app inyecta en el system prompt de esta lectura: la lista de
 * medidas que sabe guardar y los campos propios del consultorio.
 *
 * Se derivan del código y no se escriben en el prompt para que el día que se
 * sume una medida al modelo, o el profesional dé de alta un campo nuevo, la
 * extracción no se quede sin ellos en silencio. El texto alrededor sí es
 * editable desde Integraciones → IA.
 */
function variablesDeFicha(
  campos: CampoPersonalizadoPedido[],
): Record<string, string> {
  return {
    medidas: CAMPOS_PLANTILLA.map(
      (campo) => `${campo} (${ETIQUETAS_CAMPO_PLANTILLA[campo]})`,
    ).join(", "),
    camposPersonalizados:
      campos.length > 0
        ? "\n\nEl consultorio ademas sigue estos campos propios. Completá «camposPersonalizados» usando EXACTAMENTE estas claves:\n" +
          campos
            .map(
              (campo) =>
                `- ${campo.clave}: ${campo.etiqueta}` +
                (campo.descripcion ? ` (${campo.descripcion})` : ""),
            )
            .join("\n")
        : "\n\nEl consultorio no tiene campos propios definidos: devolvé «camposPersonalizados» como objeto vacío.",
  };
}

/**
 * Lee una ficha de paciente (PDF, Word o foto) con el LLM del consultorio y
 * devuelve todo lo que reconoció: datos personales, historia clínica —con los
 * campos propios del consultorio—, la medición inicial y
 * los laboratorios.
 *
 * Sin proveedor configurado LANZA, igual que el resto de la IA que toca datos
 * clínicos: no hay stub que invente la ficha de una persona.
 */
export class InterpretadorFichaPacienteLLM implements IInterpretadorFichaPaciente {
  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
  ) {}

  async interpretar(
    archivo: { clave: string; mimeType: string },
    camposPersonalizados: CampoPersonalizadoPedido[],
  ): Promise<FichaPacienteSugerida> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) {
      throw new Error(
        "No hay IA configurada para leer el documento. Cargá la clave en Integraciones o cargá el paciente a mano.",
      );
    }

    const bloqueArchivo = await leerDocumentoParaLLM(
      this.almacenamiento,
      archivo,
    );

    const texto = await llm.completar({
      system: await this.prompts.obtener(
        "FICHA_PACIENTE",
        variablesDeFicha(camposPersonalizados),
      ),
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto:
            "Extraé todos los datos del paciente que figuren en este documento.",
        },
      ],
      maxTokens: 8000,
      // Esfuerzo alto: leer una planilla clínica —a veces escaneada, a veces
      // manuscrita— y repartirla en campos no es una tarea de una pasada. Con
      // el esfuerzo bajo que usa el resto de la app, el modelo devolvía los
      // campos obvios y dejaba media ficha sin extraer.
      esfuerzo: "alto",
      esquemaJson: {
        nombre: "ficha_paciente",
        esquema: esquemaFicha(camposPersonalizados),
      },
    });

    return normalizarFicha(
      JSON.parse(texto) as Record<string, unknown>,
      camposPersonalizados,
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
export function normalizarFicha(
  datos: Record<string, unknown>,
  pedidos: CampoPersonalizadoPedido[],
): FichaPacienteSugerida {
  const paciente = objeto(datos.paciente);
  const historiaCruda = objeto(datos.historiaClinica);
  const personalizadosCrudos = objeto(datos.camposPersonalizados);

  const historiaClinica: Partial<CamposHistoriaClinica> = {};
  for (const campo of CAMPOS_HISTORIA) {
    historiaClinica[campo] = texto(historiaCruda[campo]);
  }

  const camposPersonalizados: CampoPersonalizadoHistoria[] = [];
  for (const pedido of pedidos) {
    const valor = texto(personalizadosCrudos[pedido.clave]);
    if (valor) {
      camposPersonalizados.push({
        clave: pedido.clave,
        etiqueta: pedido.etiqueta,
        valor,
      });
    }
  }

  // Lo que la ficha traía y no entró en ningún campo conocido entra como campo
  // SUELTO de este paciente: son datos de una planilla ajena y no tienen por
  // qué existir como definición del consultorio. Si el profesional los sigue
  // en todos, los declara en Configuración y dejan de venir por acá.
  const etiquetasUsadas = new Set(
    camposPersonalizados.map((campo) => campo.etiqueta.toLowerCase()),
  );
  for (const item of lista(datos.otrosDatos)) {
    const crudo = objeto(item);
    const etiqueta = texto(crudo.etiqueta);
    const valor = texto(crudo.valor);
    if (!etiqueta || !valor) continue;
    // Un dato que el modelo ya puso en un campo del consultorio no se repite.
    if (etiquetasUsadas.has(etiqueta.toLowerCase())) continue;
    etiquetasUsadas.add(etiqueta.toLowerCase());
    camposPersonalizados.push({
      clave: derivarClave(etiqueta),
      etiqueta,
      valor,
    });
  }

  return {
    paciente: {
      nombre: texto(paciente.nombre),
      apellido: texto(paciente.apellido),
      email: emailValido(paciente.email),
      telefono: texto(paciente.telefono),
      fechaNacimiento: fechaIso(paciente.fechaNacimiento),
      sexo: sexoValido(paciente.sexo),
      notas: texto(paciente.notas),
    },
    historiaClinica,
    camposPersonalizados,
    antropometria: normalizarAntropometria(datos.antropometria),
    laboratorios: lista(datos.laboratorios).flatMap(normalizarLaboratorio),
  };
}

function normalizarAntropometria(cruda: unknown): AntropometriaSugerida | null {
  if (!cruda || typeof cruda !== "object" || Array.isArray(cruda)) return null;
  const item = cruda as Record<string, unknown>;
  const pesoKg = numero(item.pesoKg);
  // Sin peso no hay medición: la entidad Antropometria lo exige, y una fila
  // con solo un par de pliegues no se puede guardar ni calcula nada.
  if (pesoKg === null) return null;

  // Las medidas se copian por nombre desde `CAMPOS_PLANTILLA`, así que la
  // escritura es dinámica; el objeto se arma como Record y se estrecha al
  // devolverlo, con `pesoKg` ya verificado arriba.
  const medidas: Record<string, unknown> = {
    pesoKg,
    fecha: fechaIso(item.fecha),
  };
  for (const campo of CAMPOS_PLANTILLA) {
    const valor = numero(item[campo]);
    if (valor !== null) {
      medidas[campo] = valor;
    }
  }
  return medidas as unknown as AntropometriaSugerida;
}

function normalizarLaboratorio(cruda: unknown): LaboratorioSugerido[] {
  const item = objeto(cruda);
  const titulo = texto(item.titulo);
  if (!titulo) return [];
  return [{ fecha: fechaIso(item.fecha), titulo, notas: texto(item.notas) }];
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

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

/** Solo se acepta algo con forma de email; lo demás se descarta. */
function emailValido(valor: unknown): string | null {
  const crudo = texto(valor)?.toLowerCase();
  return crudo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(crudo) ? crudo : null;
}

/** Solo `YYYY-MM-DD` real: una fecha malformada del modelo se descarta. */
function fechaIso(valor: unknown): string | null {
  const crudo = texto(valor);
  if (!crudo || !/^\d{4}-\d{2}-\d{2}$/.test(crudo)) return null;
  const fecha = new Date(`${crudo}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) ? null : crudo;
}

function sexoValido(valor: unknown): DatosPacienteSugeridos["sexo"] {
  const crudo = texto(valor)?.toUpperCase();
  return crudo && (SEXOS_BIOLOGICOS as readonly string[]).includes(crudo)
    ? (crudo as DatosPacienteSugeridos["sexo"])
    : null;
}
