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

const CAMPOS = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "habitos",
  "contexto",
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

function construirSystem(
  camposEvolucion: CampoEvolucionPedido[],
  hoy: string,
): string {
  const fijos = CAMPOS_EVOLUCION.map(
    (campo) => `${campo} (${ETIQUETAS_EVOLUCION[campo]})`,
  ).join(", ");

  const extra =
    camposEvolucion.length > 0
      ? "\n\nEl consultorio además sigue estos campos propios en cada evolución. Completalos usando EXACTAMENTE estas claves:\n" +
        camposEvolucion
          .map(
            (campo) =>
              `- ${campo.clave}: ${campo.etiqueta}` +
              (campo.descripcion ? ` (${campo.descripcion})` : ""),
          )
          .join("\n")
      : "";

  return `Sos el asistente de un consultorio de nutrición. Recibís un documento clínico (una ficha, un informe, un cuaderno de seguimiento, algo escrito a mano o impreso, o el texto de un Word) y extraés SOLO lo que está escrito ahí.

Hoy es ${hoy}.

El documento puede traer DOS cosas, y casi siempre trae las dos: la HISTORIA CLÍNICA del paciente (una vez, describe de dónde viene) y sus EVOLUCIONES de control (una por consulta, describen cómo viene). Extraé las dos.

Reglas generales:
1. NO inventes ni completes nada que no esté en el documento. Si un campo no aparece, devolvé null. Es una ficha clínica: un dato inventado termina en la historia de una persona real.
2. No diagnostiques ni agregues interpretación clínica propia: transcribí y organizá lo que ya está escrito.
3. Respondé en español, con el texto de cada campo breve y legible (no copies saltos de línea raros del original).

HISTORIA CLÍNICA — un solo bloque, con los campos: motivo de consulta, diagnósticos, medicación, antecedentes personales, antecedentes familiares, hábitos (actividad, sueño, consumo) y contexto (trabajo, horarios, entorno).

EVOLUCIONES — UNA POR CONSULTA. Se reconocen porque el documento las encabeza con una FECHA y debajo repite siempre los mismos rótulos. Por ejemplo:

    12/07/2024
    Cumplimiento dieta: 50%. 10 días no respeto por viaje.
    Entrenamiento: 3 veces pesas. Mejoro las cargas.
    Deposiciones: normales o constipada.
    Orina: clarito. Si toma agua, pero podría mejorar. No tiene calambres.
    Descanso: 7 hs.
    Indispuesta: no.
    Se percibe: igual. No tomo nada nuevo.

Eso es UNA evolución. Si abajo hay otra fecha con los mismos rótulos, es OTRA: devolvé un objeto por cada una y NO las mezcles.

Reglas de las evoluciones:
4. Copiá el texto del campo TAL CUAL, entero. "50%. 10 días no respeto por viaje" va completo: el porcentaje solo perdería el motivo, que es la mitad del dato. No lo resumas ni lo pases a un número.
5. Fechas SIEMPRE en formato ISO YYYY-MM-DD. En español se escribe DÍA/MES/AÑO, así que 12/07/2024 es el 2024-07-12, no el 2024-12-07. Si un bloque no tiene fecha legible, devolvé fecha null igual; no la inventes ni la deduzcas de los bloques vecinos.
6. Un rótulo que el documento trae y no corresponde a ningún campo conocido NO se fuerza dentro de otro: se ignora, salvo que coincida con alguno de los campos propios del consultorio de más abajo.
7. Si el documento no tiene ninguna evolución, devolvé la lista vacía. Un bloque de la historia clínica NO es una evolución.

Los campos fijos de una evolución son: ${fijos}.${extra}`;
}

/**
 * Interpreta una foto, un PDF, un Word o un Excel de historia clínica con el
 * LLM del consultorio y sugiere los 7 campos del formulario **más las
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
      system: construirSystem(
        camposEvolucion,
        new Date().toISOString().slice(0, 10),
      ),
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto:
            "Extraé la historia clínica y todas las evoluciones de control de este documento.",
        },
      ],
      // Un cuaderno de seguimiento son varias consultas con siete campos cada
      // una: con el tope que alcanzaba para los 7 campos sueltos, la última
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
