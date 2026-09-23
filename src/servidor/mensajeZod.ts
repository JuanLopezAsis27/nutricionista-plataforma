import type { ZodError, ZodIssue } from "zod";
import { ETIQUETAS_CAMPO_PLANTILLA } from "@/dominio/entidades/PlantillaAntropometrica";

/**
 * Un `ZodError` convertido en una frase que el usuario pueda leer.
 *
 * Existe por un error que se veía en producción: al importar mediciones de una
 * planilla, tRPC rechazaba el input y el mensaje del `TRPCError` era el
 * `JSON.stringify` de los issues de Zod. El profesional recibía un toast con
 * ochenta líneas de `{"code":"too_small","minimum":20,…}` que tapaba media
 * pantalla y no decía lo único que importaba: que un perímetro estaba en 2 cm
 * en vez de 20.
 *
 * Tres decisiones que dan forma al mensaje:
 *
 * - **Se agrupa por campo, no por issue.** Once mediciones con el mismo
 *   perímetro fuera de rango son UN problema repetido once veces, y enumerarlas
 *   una por una es justamente lo que hacía ilegible el mensaje anterior.
 * - **Se nombra el campo como lo ve el usuario** (`circPantorrilla` →
 *   «Perímetro de pantorrilla»). El nombre técnico no está en ninguna pantalla.
 * - **Se corta en tres campos.** Un mensaje que no entra en un toast no se lee;
 *   con los tres primeros alcanza para saber qué corregir, y el resto se cuenta.
 */

/** Cuántos campos distintos se nombran antes de pasar a contarlos. */
const MAXIMO_CAMPOS = 3;

/**
 * Los mensajes por defecto de Zod son en inglés y arrancan siempre con una de
 * estas palabras. Sirve para distinguirlos de los que escribimos nosotros en
 * los DTOs (`.min(1, "No hay mediciones para importar")`), que sí sirven tal
 * cual y no hay que reemplazar.
 */
const ARRANQUE_MENSAJE_ZOD =
  /^(Number|String|Array|Date|Set|Expected|Required|Invalid|Unrecognized|Too|Must)/;

/** Frase completa para el usuario a partir de los issues de un `ZodError`. */
export function mensajeDesdeZod(error: ZodError): string {
  const grupos = agrupar(error.issues);
  if (grupos.length === 0) return "Revisá los datos cargados.";

  const nombrados = grupos.slice(0, MAXIMO_CAMPOS).map(frasearGrupo);
  const restantes = grupos.length - nombrados.length;
  const cola = restantes > 0 ? ` Y ${restantes} más.` : "";

  if (nombrados.length === 1) return `${nombrados[0]}${cola}`;
  return `Hay ${grupos.length} datos para revisar: ${nombrados.join("; ")}.${cola}`;
}

/** Un problema y en cuántos elementos de una lista aparece. */
interface GrupoProblema {
  etiqueta: string | null;
  detalle: string;
  /** Nombre de la lista donde se repite (`mediciones`), si el path la tiene. */
  coleccion: string | null;
  /** Cuántos elementos distintos de esa lista lo tienen. */
  repeticiones: number;
}

/** Issues → un problema por (campo, motivo), con su cuenta de repeticiones. */
function agrupar(issues: ZodIssue[]): GrupoProblema[] {
  const grupos = new Map<string, GrupoProblema & { indices: Set<number> }>();

  for (const issue of issues) {
    const etiqueta = etiquetaDeCampo(issue.path);
    const detalle = detalleDeIssue(issue);
    const clave = `${etiqueta ?? ""}|${detalle}`;
    const indice = issue.path.find((parte) => typeof parte === "number");

    const existente = grupos.get(clave);
    if (existente) {
      if (typeof indice === "number") existente.indices.add(indice);
      continue;
    }
    grupos.set(clave, {
      etiqueta,
      detalle,
      coleccion: coleccionDelPath(issue.path),
      repeticiones: 0,
      indices: new Set(typeof indice === "number" ? [indice] : []),
    });
  }

  return [...grupos.values()].map((grupo) => ({
    etiqueta: grupo.etiqueta,
    detalle: grupo.detalle,
    coleccion: grupo.coleccion,
    repeticiones: grupo.indices.size,
  }));
}

/** «"Perímetro de pantorrilla" tiene que ser 20 o más (en 11 mediciones)». */
function frasearGrupo(grupo: GrupoProblema): string {
  const campo = grupo.etiqueta ? `«${grupo.etiqueta}» ` : "";
  const repetido =
    grupo.repeticiones > 1 && grupo.coleccion
      ? ` (en ${grupo.repeticiones} ${grupo.coleccion})`
      : "";
  return `${campo}${grupo.detalle}${repetido}`;
}

/**
 * Nombre legible del campo que falló.
 *
 * El path de un lote viene como `["mediciones", 4, "circPantorrilla"]`: el
 * campo es el último tramo de texto, y los números son la posición dentro de la
 * lista, que se cuenta aparte.
 */
function etiquetaDeCampo(path: ZodIssue["path"]): string | null {
  const campos = path.filter(
    (parte): parte is string => typeof parte === "string",
  );
  const campo = campos.at(-1);
  if (!campo) return null;
  return (
    ETIQUETAS_CAMPO_PLANTILLA[
      campo as keyof typeof ETIQUETAS_CAMPO_PLANTILLA
    ] ??
    ETIQUETAS_PROPIAS[campo] ??
    humanizar(campo)
  );
}

/** La lista que contiene al campo (`mediciones`), o null si no está en una. */
function coleccionDelPath(path: ZodIssue["path"]): string | null {
  const indice = path.findIndex((parte) => typeof parte === "number");
  if (indice <= 0) return null;
  const nombre = path[indice - 1];
  return typeof nombre === "string" ? nombre : null;
}

/**
 * Campos que no son medidas antropométricas y aparecen seguido en los errores.
 * Lo que no esté acá se humaniza a partir del nombre del campo; la lista crece
 * solo cuando un nombre automático quede feo de verdad.
 */
const ETIQUETAS_PROPIAS: Record<string, string> = {
  fecha: "Fecha",
  pesoKg: "Peso",
  tallaCm: "Talla",
  kgGrasa: "Kg de grasa",
  email: "Email",
  password: "Contraseña",
  telefono: "Teléfono",
  nombre: "Nombre",
  apellido: "Apellido",
  observaciones: "Observaciones",
  fuerzaPrensionDerecha: "Fuerza de prensión derecha",
  fuerzaPrensionIzquierda: "Fuerza de prensión izquierda",
  masaMuscularKg: "Masa muscular",
  masaGrasaKg: "Masa grasa",
  porcentajeMuscular: "Porcentaje muscular",
  porcentajeGrasa: "Porcentaje graso",
};

/** `circMusloMedial` → «Circ muslo medial». Último recurso. */
function humanizar(campo: string): string {
  const palabras = campo
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

/** Qué le pasa al valor, en castellano. */
function detalleDeIssue(issue: ZodIssue): string {
  // Un mensaje escrito por nosotros en el DTO ya dice lo que hay que decir.
  if (!ARRANQUE_MENSAJE_ZOD.test(issue.message)) return issue.message;

  switch (issue.code) {
    case "invalid_type":
      return issue.received === "undefined" || issue.received === "null"
        ? "no puede quedar vacío"
        : `tiene que ser ${nombreDeTipo(issue.expected)}`;
    case "too_small":
      if (issue.type === "string") {
        return issue.minimum === 1
          ? "no puede quedar vacío"
          : `necesita al menos ${issue.minimum} caracteres`;
      }
      if (issue.type === "array") {
        return `necesita al menos ${issue.minimum} ${issue.minimum === 1n || issue.minimum === 1 ? "elemento" : "elementos"}`;
      }
      return issue.inclusive
        ? `tiene que ser ${issue.minimum} o más`
        : `tiene que ser mayor que ${issue.minimum}`;
    case "too_big":
      if (issue.type === "string") {
        return `no puede pasar de ${issue.maximum} caracteres`;
      }
      if (issue.type === "array") {
        return `no puede tener más de ${issue.maximum} elementos`;
      }
      return issue.inclusive
        ? `tiene que ser ${issue.maximum} o menos`
        : `tiene que ser menor que ${issue.maximum}`;
    case "invalid_enum_value":
      return `tiene un valor que no está permitido (${issue.received})`;
    case "invalid_string":
      return issue.validation === "email"
        ? "no parece un email válido"
        : "tiene un formato que no se reconoce";
    case "invalid_date":
      return "no es una fecha válida";
    case "unrecognized_keys":
      return `trae datos que no corresponden (${issue.keys.join(", ")})`;
    default:
      return "tiene un valor que no se puede usar";
  }
}

/** Nombres de tipo de Zod en castellano, para el mensaje de `invalid_type`. */
function nombreDeTipo(esperado: string): string {
  const nombres: Record<string, string> = {
    string: "texto",
    number: "un número",
    boolean: "sí o no",
    date: "una fecha",
    array: "una lista",
    object: "un dato con estructura",
  };
  return nombres[esperado] ?? esperado;
}
