import { ErrorValidacion } from "../errores/ErrorValidacion";
import { DEFINICIONES_METODO } from "../servicios/grasaPorPliegues";
import {
  PROTOCOLOS_COMPOSICION,
  type ProtocoloComposicion,
} from "./Antropometria";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
  MINIMO_PARA_SERVIR,
  REQUERIDOS_CINCO_MASAS,
  REQUISITOS_RESULTADO,
  alcanceDe,
  normalizarCamposPlantilla,
  type CampoPlantilla,
} from "./PlantillaAntropometrica";
import type { MedidasAntropometricas } from "./Antropometria";

/**
 * Qué medidas pide el formulario en cada uno de los DOS protocolos.
 *
 * Es la misma mecánica de las plantillas —una lista de `CampoPlantilla`— pero
 * no es una plantilla: los dos protocolos existen siempre, no se crean ni se
 * borran, y cada uno tiene su propio piso. Una plantilla propia puede quedarse
 * en los 4 pliegues de Faulkner; el protocolo de 5 componentes NO, porque su
 * razón de ser es el fraccionamiento de Kerr y sin él no queda un protocolo
 * más chico, queda un protocolo que no contesta lo que promete.
 *
 * Por eso la regla es distinta por protocolo:
 *
 * | Protocolo         | Piso                                              |
 * | ----------------- | ------------------------------------------------- |
 * | CINCO_COMPONENTES | las 21 medidas del fraccionamiento de Kerr         |
 * | DOS_COMPONENTES   | al menos UNA ecuación de grasa                     |
 *
 * Vive acá y no en `ConfiguracionConsultorio` para que el editor de pantalla
 * pueda usar la MISMA función que valida el guardado: lo que el panel promete
 * mientras se destilda es exactamente lo que el servidor acepta.
 */

/** Los dos pliegues que no pertenecen al perfil ISAK. */
const FUERA_DEL_ISAK: readonly CampoPlantilla[] = [
  "pliegueAxilarMedio",
  "pliegueLumbar",
];

/**
 * Los pliegues que alguna ecuación de grasa vigente usa.
 *
 * Se DERIVA de la tabla de requisitos en vez de escribirse a mano: si mañana
 * entra una ecuación que pide el axilar medio, ese pliegue aparece solo en el
 * protocolo de 2 componentes. Escrita a mano, la lista se quedaba vieja sin
 * que nada fallara — el pliegue simplemente no se pedía.
 *
 * Hoy da los 6 de la planilla más el bicipital y la cresta ilíaca: sin esos
 * dos, Durnin & Womersley no sale nunca y Withers solo sale en mujeres.
 */
const PLIEGUES_DE_LAS_ECUACIONES = CAMPOS_PLANTILLA.filter(
  (campo) =>
    campo.startsWith("pliegue") &&
    REQUISITOS_RESULTADO.some(
      (requisito) =>
        requisito.clave !== "CINCO_MASAS" &&
        requisito.clave !== "SOMATOTIPO" &&
        requisito.campos.includes(campo),
    ),
);

/**
 * Los perímetros del protocolo de 2 componentes: los que se siguen por
 * clínica, no por modelo. Cintura mínima y cadera dan el índice
 * cintura/cadera y su riesgo asociado; la máxima es seguimiento y no la usa
 * ningún cálculo. El resto de los perímetros solo existen para el
 * fraccionamiento de Kerr, que acá no se calcula.
 */
const PERIMETROS_DE_CONSULTA: readonly CampoPlantilla[] = [
  "circCinturaMinima",
  "circCinturaMaxima",
  "circCadera",
];

/**
 * Lo que cada protocolo pide mientras el consultorio no lo haya personalizado.
 *
 * `CINCO_COMPONENTES` es el perfil ISAK entero, porque lo necesita entero.
 * `DOS_COMPONENTES` es lo mínimo que hace falta para lo que ESE protocolo
 * contesta: los pliegues que alimentan alguna ecuación, los tres perímetros
 * que se siguen por clínica y la talla. Los diámetros óseos y los demás
 * perímetros quedan destildados —solo sirven para el fraccionamiento— y con
 * ellos la carga de todos los días pasa de 25 campos a 12.
 *
 * La talla queda aunque no sea pliegue ni perímetro: es lo que da el IMC, que
 * es una de las cuatro cifras de la tarjeta de cada consulta.
 *
 * Los dos sitios de fuera del ISAK (axilar medio y lumbar) no entran en
 * ninguno de los dos: no alimentan ninguna ecuación vigente y solo tienen
 * sentido si alguien los pide a propósito en una plantilla propia.
 */
export const CAMPOS_PROTOCOLO_POR_DEFECTO: Record<
  ProtocoloComposicion,
  CampoPlantilla[]
> = {
  CINCO_COMPONENTES: CAMPOS_PLANTILLA.filter(
    (campo) => !FUERA_DEL_ISAK.includes(campo),
  ),
  DOS_COMPONENTES: CAMPOS_PLANTILLA.filter(
    (campo) =>
      campo === "tallaCm" ||
      PLIEGUES_DE_LAS_ECUACIONES.includes(campo) ||
      PERIMETROS_DE_CONSULTA.includes(campo),
  ),
};

/** Nombre del protocolo en pantalla y en los mensajes de error. */
export const ETIQUETAS_PROTOCOLO: Record<ProtocoloComposicion, string> = {
  CINCO_COMPONENTES: "5 componentes (Kerr)",
  DOS_COMPONENTES: "2 componentes (grasa / masa magra)",
};

/**
 * Qué le falta a un conjunto de campos para servir como ese protocolo.
 * Devuelve las ETIQUETAS de las medidas que hay que volver a tildar, o vacío
 * si ya sirve. No lanza: la usa el editor en vivo, en cada tilde.
 */
export function faltaParaElProtocolo(
  protocolo: ProtocoloComposicion,
  campos: readonly CampoPlantilla[],
): string[] {
  const incluidos = new Set<string>(campos);

  if (protocolo === "CINCO_COMPONENTES") {
    return REQUERIDOS_CINCO_MASAS.filter((campo) => !incluidos.has(campo)).map(
      (campo) => ETIQUETAS_CAMPO_PLANTILLA[campo],
    );
  }

  // 2 componentes: alcanza con que quede UNA ecuación de grasa en pie. Cuando
  // no queda ninguna, el camino más corto es completar Faulkner.
  if (alcanceDe(campos).metodosGrasa.length > 0) return [];
  return MINIMO_PARA_SERVIR.filter((campo) => !incluidos.has(campo)).map(
    (campo) => ETIQUETAS_CAMPO_PLANTILLA[campo],
  );
}

/**
 * Con qué protocolos se puede usar una plantilla propia.
 *
 * Los dos protocolos son las plantillas PRINCIPALES y una propia se acomoda a
 * la que le da el cuero: la de 6 pliegues sirve para cargar en 2 componentes y
 * no en 5, porque con ella la medición saldría sin el fraccionamiento —que es
 * lo único que ese protocolo viene a contestar—. El piso es el MISMO que el de
 * la personalización del protocolo: si una lista de campos no sirve para
 * configurar un protocolo, tampoco sirve para cargar con él.
 *
 * Nunca devuelve vacío para una plantilla válida: el piso de 2 componentes es
 * el mismo que el de la entidad (resolver algo), y todo lo que resuelve las 5
 * masas resuelve también Faulkner y Yuhasz, porque sus seis pliegues están
 * entre las 21 medidas de Kerr.
 */
export function protocolosQueAdmite(
  campos: readonly CampoPlantilla[],
): ProtocoloComposicion[] {
  return PROTOCOLOS_COMPOSICION.filter(
    (protocolo) => faltaParaElProtocolo(protocolo, campos).length === 0,
  );
}

/**
 * Con qué protocolo entra una medición que NADIE declaró: la que se importa
 * de una planilla.
 *
 * Es lo único del módulo que se deduce, y es deliberado. En la carga a mano el
 * profesional elige el protocolo antes de empezar; una planilla trae años de
 * consultas y preguntarle columna por columna es impracticable. El dato para
 * contestarlo ya está en la propia columna: si trae las 21 medidas del
 * fraccionamiento de Kerr, ESA consulta se tomó con el perfil ISAK completo.
 *
 * Es la misma pregunta que `alcanceDe(...).cincoMasas`, pero sobre las medidas
 * CARGADAS y no sobre los campos pedidos: acá no importa qué se iba a medir,
 * importa qué quedó escrito.
 */
export function protocoloSegunMedidas(
  medidas: Partial<Pick<MedidasAntropometricas, CampoPlantilla>>,
): ProtocoloComposicion {
  return REQUERIDOS_CINCO_MASAS.every((campo) => medidas[campo] != null)
    ? "CINCO_COMPONENTES"
    : "DOS_COMPONENTES";
}

/**
 * Normaliza y valida los campos de un protocolo.
 *
 * El mensaje nombra las medidas que faltan, no un "elegí más campos" que
 * obliga a adivinar: es el mismo criterio que la validación de una plantilla.
 */
export function camposDeProtocoloValidados(
  protocolo: ProtocoloComposicion,
  campos: readonly string[],
): CampoPlantilla[] {
  const normalizados = normalizarCamposPlantilla(campos);
  const faltan = faltaParaElProtocolo(protocolo, normalizados);
  if (faltan.length === 0) return normalizados;

  const lista = faltan.join(", ").toLowerCase();
  throw new ErrorValidacion(
    protocolo === "CINCO_COMPONENTES"
      ? `El protocolo de 5 componentes tiene que seguir resolviendo el ` +
          `fraccionamiento en 5 masas de Kerr: falta ${lista}.`
      : `El protocolo de 2 componentes tiene que seguir resolviendo al menos ` +
          `una ecuación de grasa. Lo mínimo es ` +
          `${DEFINICIONES_METODO.FAULKNER.etiqueta}: falta ${lista}.`,
  );
}
