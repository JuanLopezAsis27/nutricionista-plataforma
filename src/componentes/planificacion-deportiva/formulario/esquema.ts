import type {
  CrearPlanificacionDto,
  PlanificacionSalidaDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import type {
  ModalidadCarrera,
  TipoPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import {
  CANTIDAD_VACIA,
  cantidadDesdeGuardado,
  cantidadParaGuardar,
  type CantidadEnFormulario,
} from "@/componentes/comunes/alimentos/cantidad";
import { aNumero } from "@/componentes/comunes/alimentos/macros";

/**
 * El formulario de una planificación deportiva tal como lo edita la pantalla
 * (migración 94). Los números van como texto —los inputs pueden estar
 * vacíos— y los tiempos como «h:mm», que es como se piensa una carrera.
 */

/** Un alimento de una ingesta: la cantidad y los macros por 100, como texto. */
export interface AlimentoFormulario extends CantidadEnFormulario {
  nombre: string;
  caloriasPor100: string;
  proteinasPor100: string;
  carbohidratosPor100: string;
  grasasPor100: string;
  /** mg por 100 g/ml (migración 96). */
  cafeinaPor100: string;
  fuente: string;
  referenciaExterna: string;
  alimentoOrigenId: string;
}

export interface IngestaFormulario {
  /** Solo para la `key` de React: el servidor les da sus ids al guardar. */
  clave: string;
  /** Antes de la largada: el tiempo se resta (un gel 15 min antes). */
  antesDeLargar: boolean;
  /** «h:mm» o minutos sueltos («45»). */
  tiempo: string;
  km: string;
  notas: string;
  alimentos: AlimentoFormulario[];
}

export interface FormularioPlanificacion {
  tipo: TipoPlanificacion;
  nombre: string;
  descripcion: string;
  /** Peso del deportista (kg), para la cafeína en mg/kg. */
  pesoReferenciaKg: string;
  modalidad: ModalidadCarrera;
  distanciaKm: string;
  /** «h:mm». */
  duracion: string;
  desnivelPositivoM: string;
  desnivelNegativoM: string;
  horaLargada: string;
  temperaturaEstimadaC: string;
  carbohidratosObjetivoGH: string;
  liquidosObjetivoMlH: string;
  sodioObjetivoMgH: string;
  puestosAbastecimiento: string;
  estrategiaPrevia: string;
  recuperacion: string;
  ingestas: IngestaFormulario[];
}

let contador = 0;
/** Una clave para la lista de ingestas; no viaja al servidor. */
export function claveNueva(): string {
  contador += 1;
  return `ingesta-${Date.now()}-${contador}`;
}

export function formularioVacio(
  nombre = "",
  pesoKg: number | null = null,
): FormularioPlanificacion {
  return {
    tipo: "CARRERA",
    nombre,
    descripcion: "",
    pesoReferenciaKg: pesoKg != null ? String(pesoKg) : "",
    modalidad: "CALLE",
    distanciaKm: "",
    duracion: "",
    desnivelPositivoM: "",
    desnivelNegativoM: "",
    horaLargada: "",
    temperaturaEstimadaC: "",
    carbohidratosObjetivoGH: "",
    liquidosObjetivoMlH: "",
    sodioObjetivoMgH: "",
    puestosAbastecimiento: "",
    estrategiaPrevia: "",
    recuperacion: "",
    ingestas: [],
  };
}

export function ingestaVacia(minutoSugerido = 0): IngestaFormulario {
  return {
    clave: claveNueva(),
    antesDeLargar: minutoSugerido < 0,
    tiempo: textoDeMinutos(Math.abs(minutoSugerido)),
    km: "",
    notas: "",
    alimentos: [],
  };
}

export function alimentoVacio(): AlimentoFormulario {
  return {
    ...CANTIDAD_VACIA,
    nombre: "",
    caloriasPor100: "",
    proteinasPor100: "",
    carbohidratosPor100: "",
    grasasPor100: "",
    cafeinaPor100: "",
    fuente: "MANUAL",
    referenciaExterna: "",
    alimentoOrigenId: "",
  };
}

/**
 * «1:35» → 95; «45» → 45; vacío o ilegible → null. Acepta también «1h35».
 * Es lo que se tipea en la duración y en el momento de cada ingesta.
 */
export function minutosDesdeTexto(texto: string): number | null {
  const t = texto.trim().toLowerCase().replace("h", ":");
  if (t === "") return null;
  if (t.includes(":")) {
    const [h, m = "0"] = t.split(":");
    const horas = Number(h);
    const minutos = Number(m === "" ? "0" : m);
    if (
      !Number.isInteger(horas) ||
      !Number.isInteger(minutos) ||
      horas < 0 ||
      minutos < 0 ||
      minutos > 59
    ) {
      return null;
    }
    return horas * 60 + minutos;
  }
  const minutos = Number(t);
  return Number.isInteger(minutos) && minutos >= 0 ? minutos : null;
}

/** 95 → «1:35». */
export function textoDeMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  return `${h}:${String(minutos % 60).padStart(2, "0")}`;
}

/** El minuto de una ingesta del formulario (negativo antes de largar), o null. */
export function minutoDeIngesta(ingesta: IngestaFormulario): number | null {
  const minutos = minutosDesdeTexto(ingesta.tiempo);
  if (minutos == null) return null;
  return ingesta.antesDeLargar ? -minutos : minutos;
}

/** Lo guardado → el formulario (para editar). */
export function formularioDesdeGuardado(
  p: PlanificacionSalidaDto,
): FormularioPlanificacion {
  const c = p.carrera;
  return {
    tipo: p.tipo,
    nombre: p.nombre,
    descripcion: p.descripcion ?? "",
    pesoReferenciaKg: texto(p.pesoReferenciaKg),
    modalidad: c?.modalidad ?? "CALLE",
    distanciaKm: texto(c?.distanciaKm),
    duracion: c ? textoDeMinutos(c.duracionEstimadaMin) : "",
    desnivelPositivoM: texto(c?.desnivelPositivoM),
    desnivelNegativoM: texto(c?.desnivelNegativoM),
    horaLargada: c?.horaLargada ?? "",
    temperaturaEstimadaC: texto(c?.temperaturaEstimadaC),
    carbohidratosObjetivoGH: texto(c?.carbohidratosObjetivoGH),
    liquidosObjetivoMlH: texto(c?.liquidosObjetivoMlH),
    sodioObjetivoMgH: texto(c?.sodioObjetivoMgH),
    puestosAbastecimiento: c?.puestosAbastecimiento ?? "",
    estrategiaPrevia: c?.estrategiaPrevia ?? "",
    recuperacion: c?.recuperacion ?? "",
    ingestas: p.ingestas.map((ingesta) => ({
      clave: claveNueva(),
      antesDeLargar: ingesta.minuto < 0,
      tiempo: textoDeMinutos(Math.abs(ingesta.minuto)),
      km: texto(ingesta.km),
      notas: ingesta.notas ?? "",
      alimentos: ingesta.alimentos.map((a) => ({
        ...cantidadDesdeGuardado(a),
        nombre: a.nombre,
        caloriasPor100: texto(a.caloriasPor100),
        proteinasPor100: texto(a.proteinasPor100),
        carbohidratosPor100: texto(a.carbohidratosPor100),
        grasasPor100: texto(a.grasasPor100),
        cafeinaPor100: texto(a.cafeinaPor100),
        fuente: a.fuente ?? "MANUAL",
        referenciaExterna: a.referenciaExterna ?? "",
        alimentoOrigenId: a.alimentoOrigenId ?? "",
      })),
    })),
  };
}

/** El contenido que se manda al guardar (crear o editar). */
export type ContenidoParaGuardar = Omit<CrearPlanificacionDto, "grupoId">;

/**
 * El formulario → lo que espera el servidor. Un número que no se entiende va
 * como null y lo rechaza (o lo ignora) el dominio con su mensaje; los
 * tiempos ilegibles ya los marca `erroresDelFormulario` antes de llegar acá.
 */
export function paraGuardar(f: FormularioPlanificacion): ContenidoParaGuardar {
  return {
    tipo: f.tipo,
    nombre: f.nombre.trim(),
    descripcion: f.descripcion.trim() || null,
    pesoReferenciaKg: aNumero(f.pesoReferenciaKg),
    carrera: {
      modalidad: f.modalidad,
      distanciaKm: aNumero(f.distanciaKm) ?? 0,
      duracionEstimadaMin: minutosDesdeTexto(f.duracion) ?? 0,
      desnivelPositivoM: entero(f.desnivelPositivoM),
      desnivelNegativoM: entero(f.desnivelNegativoM),
      horaLargada: f.horaLargada.trim() || null,
      temperaturaEstimadaC: numeroConSigno(f.temperaturaEstimadaC),
      carbohidratosObjetivoGH: aNumero(f.carbohidratosObjetivoGH),
      liquidosObjetivoMlH: entero(f.liquidosObjetivoMlH),
      sodioObjetivoMgH: entero(f.sodioObjetivoMgH),
      puestosAbastecimiento: f.puestosAbastecimiento.trim() || null,
      estrategiaPrevia: f.estrategiaPrevia.trim() || null,
      recuperacion: f.recuperacion.trim() || null,
    },
    ingestas: f.ingestas.map((ingesta) => ({
      minuto: minutoDeIngesta(ingesta) ?? 0,
      km: aNumero(ingesta.km),
      notas: ingesta.notas.trim() || null,
      alimentos: ingesta.alimentos.map((a) => ({
        nombre: a.nombre.trim(),
        ...cantidadParaGuardar(a),
        caloriasPor100: aNumero(a.caloriasPor100),
        proteinasPor100: aNumero(a.proteinasPor100),
        carbohidratosPor100: aNumero(a.carbohidratosPor100),
        grasasPor100: aNumero(a.grasasPor100),
        cafeinaPor100: aNumero(a.cafeinaPor100),
        fuente: a.fuente || null,
        referenciaExterna: a.referenciaExterna || null,
        alimentoOrigenId: a.alimentoOrigenId || null,
      })),
    })),
  };
}

/**
 * Lo que se puede marcar antes de mandar: lo obligatorio y los tiempos que no
 * se entienden. El resto (rangos, una ingesta después de la llegada) lo
 * decide el dominio y llega como un error con su mensaje.
 */
export function erroresDelFormulario(f: FormularioPlanificacion): string[] {
  const errores: string[] = [];
  if (!f.nombre.trim()) errores.push("Poné un nombre a la planificación.");
  const distancia = aNumero(f.distanciaKm);
  if (distancia == null || distancia <= 0) {
    errores.push("Indicá la distancia de la carrera en km.");
  }
  const duracion = minutosDesdeTexto(f.duracion);
  if (duracion == null || duracion <= 0) {
    errores.push("Indicá la duración estimada como h:mm (por ejemplo, 3:45).");
  }
  // Un número opcional mal escrito («70kg», «60 g/h») viajaría como «sin
  // dato» y se perdería en silencio: se marca antes de mandar.
  const opcionales: Array<[string, string]> = [
    [f.pesoReferenciaKg, "El peso del deportista"],
    [f.carbohidratosObjetivoGH, "El objetivo de carbohidratos"],
    [f.liquidosObjetivoMlH, "El objetivo de líquidos"],
    [f.sodioObjetivoMgH, "El objetivo de sodio"],
    [f.desnivelPositivoM, "El desnivel positivo"],
    [f.desnivelNegativoM, "El desnivel negativo"],
  ];
  for (const [valor, etiqueta] of opcionales) {
    if (valor.trim() !== "" && aNumero(valor) == null) {
      errores.push(`${etiqueta} tiene que ser un número.`);
    }
  }
  if (
    f.temperaturaEstimadaC.trim() !== "" &&
    numeroConSigno(f.temperaturaEstimadaC) == null
  ) {
    errores.push("La temperatura tiene que ser un número.");
  }
  f.ingestas.forEach((ingesta, i) => {
    if (minutoDeIngesta(ingesta) == null) {
      errores.push(`La ingesta ${i + 1} no tiene un tiempo válido (h:mm).`);
    }
    if (ingesta.km.trim() !== "" && aNumero(ingesta.km) == null) {
      errores.push(`El km de la ingesta ${i + 1} tiene que ser un número.`);
    }
    if (ingesta.alimentos.some((a) => !a.nombre.trim())) {
      errores.push(`La ingesta ${i + 1} tiene un alimento sin nombre.`);
    }
    if (ingesta.alimentos.length === 0 && !ingesta.notas.trim()) {
      errores.push(
        `La ingesta ${i + 1} está vacía: agregale un alimento o una indicación.`,
      );
    }
  });
  return errores;
}

function texto(valor: number | null | undefined): string {
  return valor == null ? "" : String(valor);
}

function entero(valor: string): number | null {
  const n = aNumero(valor);
  return n == null ? null : Math.round(n);
}

/** Como `aNumero`, pero admite negativos: la temperatura puede bajar de 0. */
function numeroConSigno(valor: string): number | null {
  const t = valor.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
