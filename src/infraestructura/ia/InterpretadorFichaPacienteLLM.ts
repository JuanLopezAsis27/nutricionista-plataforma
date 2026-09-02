import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type {
  IInterpretadorFichaPaciente,
  FichaPacienteSugerida,
  CampoPersonalizadoPedido,
  AlertaAlimentariaSugerida,
  AntropometriaSugerida,
  LaboratorioSugerido,
  DatosPacienteSugeridos,
} from "@/dominio/servicios/IInterpretadorFichaPaciente";
import type {
  CamposHistoriaClinica,
  CampoPersonalizadoHistoria,
} from "@/dominio/entidades/HistoriaClinica";
import {
  TIPOS_ALERTA_ALIMENTARIA,
  SEVERIDADES_ALERTA,
} from "@/dominio/entidades/AlertaAlimentaria";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import { derivarClave } from "@/dominio/entidades/CampoHistoriaClinica";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";

const CAMPOS_HISTORIA = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "habitos",
  "contexto",
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
      "alertas",
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
      alertas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tipo", "descripcion", "severidad", "notas"],
          properties: {
            tipo: { type: "string", enum: [...TIPOS_ALERTA_ALIMENTARIA] },
            descripcion: { type: "string" },
            severidad: { type: "string", enum: [...SEVERIDADES_ALERTA] },
            notas: textoONulo,
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

function construirSystem(campos: CampoPersonalizadoPedido[]): string {
  const extra =
    campos.length > 0
      ? "\n\nEl consultorio ademas sigue estos campos propios. Completá «camposPersonalizados» usando EXACTAMENTE estas claves:\n" +
        campos
          .map(
            (campo) =>
              `- ${campo.clave}: ${campo.etiqueta}` +
              (campo.descripcion ? ` (${campo.descripcion})` : ""),
          )
          .join("\n")
      : "\n\nEl consultorio no tiene campos propios definidos: devolvé «camposPersonalizados» como objeto vacío.";

  const medidas = CAMPOS_PLANTILLA.map(
    (campo) => `${campo} (${ETIQUETAS_CAMPO_PLANTILLA[campo]})`,
  ).join(", ");

  return `Sos el asistente de un consultorio de nutrición. Recibís la ficha de un paciente (una planilla, una historia clínica, un informe: escaneada, en PDF o el texto de un Word) y extraés TODOS los datos que estén escritos ahí, para dar de alta al paciente sin tipearlo a mano.

Reglas:
1. NO inventes NADA. Si un dato no está en el documento, devolvé null (o una lista vacía). Es una ficha clínica: un dato inventado termina en la historia de una persona real.
2. No diagnostiques ni interpretes: transcribí y ordená lo que ya está escrito.
3. Fechas SIEMPRE en formato ISO YYYY-MM-DD. Si solo hay año, o la fecha es ilegible, devolvé null. Ojo con el formato del documento: en español la fecha se escribe DÍA/MES/AÑO, así que 03/11/1985 es el 1985-11-03, no el 1985-03-11.
4. Medidas antropométricas en sus unidades: peso en kg, tallas y perímetros en cm, pliegues en mm. Si el documento usa otra unidad, convertila. Si no hay peso, devolvé antropometria en null: sin peso no hay medición.
5. Las alertas son SOLO alergias, intolerancias y restricciones alimentarias. tipo: ALERGIA, INTOLERANCIA o RESTRICCION. severidad: LEVE, MODERADA o SEVERA (si no está indicada, poné MODERADA).
6. Los laboratorios son estudios de análisis mencionados en el documento: un título corto y, en notas, los valores que figuren.
7. El email tiene que estar escrito literalmente en el documento. NUNCA lo deduzcas del nombre.
8. Respondé en español.

NOMBRE Y APELLIDO van SEPARADOS, y la ficha casi nunca los separa por vos:
- "Apellido y Nombre: Pérez Gómez, Ana María" → apellido "Pérez Gómez", nombre "Ana María". Lo que va antes de la coma es el APELLIDO.
- Cuando el rótulo dice "Apellido y Nombre" o "Apellido, Nombre" y no hay coma, el apellido va PRIMERO: "Pérez Gómez Ana María" → apellido "Pérez Gómez", nombre "Ana María".
- Cuando el rótulo dice solo "Nombre", "Paciente" o "Nombre completo", el orden habitual es nombre primero: "Ana María Pérez Gómez" → nombre "Ana María", apellido "Pérez Gómez".
- Si hay campos separados ("Nombre:" y "Apellido:"), respetalos tal cual y no reordenes nada.
- Nunca dejes el nombre completo en un solo campo con el otro en null: si solo hay una palabra, va en nombre y apellido queda null.

SEXO: devolvé exactamente MASCULINO o FEMENINO. La ficha lo escribe de muchas formas y TODAS estas cuentan: "M", "Masc", "Masculino", "Varón", "Hombre", "H" → MASCULINO; "F", "Fem", "Femenino", "Mujer" → FEMENINO. Si no figura, o dice otra cosa, devolvé null.

OTROS DATOS: todo lo demás que la ficha traiga sobre el paciente y no entre en ninguno de los campos de arriba va en "otrosDatos", como pares de etiqueta y valor. Por ejemplo: obra social, número de afiliado, DNI, ocupación, domicilio, teléfono alternativo, contacto de emergencia, objetivo del tratamiento, cómo llegó al consultorio, o cualquier rótulo propio de esa planilla. Usá como etiqueta el rótulo tal como aparece en el documento. Es preferible que un dato caiga acá a que se pierda: no descartes nada que esté escrito en la ficha.

Las medidas antropométricas que se pueden leer son: ${medidas}.${extra}`;
}

/**
 * Lee una ficha de paciente (PDF, Word o foto) con el LLM del consultorio y
 * devuelve todo lo que reconoció: datos personales, historia clínica —con los
 * campos propios del consultorio—, alertas alimentarias, la medición inicial y
 * los laboratorios.
 *
 * Sin proveedor configurado LANZA, igual que el resto de la IA que toca datos
 * clínicos: no hay stub que invente la ficha de una persona.
 */
export class InterpretadorFichaPacienteLLM implements IInterpretadorFichaPaciente {
  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
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
      system: construirSystem(camposPersonalizados),
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
    alertas: lista(datos.alertas).flatMap(normalizarAlerta),
    antropometria: normalizarAntropometria(datos.antropometria),
    laboratorios: lista(datos.laboratorios).flatMap(normalizarLaboratorio),
  };
}

function normalizarAlerta(cruda: unknown): AlertaAlimentariaSugerida[] {
  const item = objeto(cruda);
  const descripcion = texto(item.descripcion);
  const tipo = item.tipo;
  if (
    !descripcion ||
    typeof tipo !== "string" ||
    !(TIPOS_ALERTA_ALIMENTARIA as readonly string[]).includes(tipo)
  ) {
    return [];
  }
  const severidadCruda = item.severidad;
  const severidad =
    typeof severidadCruda === "string" &&
    (SEVERIDADES_ALERTA as readonly string[]).includes(severidadCruda)
      ? (severidadCruda as AlertaAlimentariaSugerida["severidad"])
      : "MODERADA";
  return [
    {
      tipo: tipo as AlertaAlimentariaSugerida["tipo"],
      descripcion,
      severidad,
      notas: texto(item.notas),
    },
  ];
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
