import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Resumen de una foto de la receta (lo completa el repositorio). */
export interface FotoReceta {
  id: string;
  nombreOriginal: string;
  mimeType: string;
}

/** Macros (por porción o totales de la receta; todas opcionales). */
export interface MacrosReceta {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Ingrediente estructurado ya normalizado (estado persistido). */
export interface IngredienteDeReceta {
  nombre: string;
  cantidadGramos: number | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  fuente: string | null;
  referenciaExterna: string | null;
}

/** Datos de entrada de un ingrediente (los numéricos pueden faltar). */
export interface DatosIngredienteReceta {
  nombre: string;
  cantidadGramos?: number | null;
  caloriasPor100?: number | null;
  proteinasPor100?: number | null;
  carbohidratosPor100?: number | null;
  grasasPor100?: number | null;
  fuente?: string | null;
  referenciaExterna?: string | null;
}

/** Datos para crear/editar una receta. */
export interface DatosNuevaReceta {
  nombre: string;
  descripcion?: string | null;
  porciones?: number | null;
  preparacion?: string | null;
  ingredientes?: DatosIngredienteReceta[];
  etiquetas?: string[];
  /** Macros por porción cargados a mano (fallback si no hay datos de ingredientes). */
  calorias?: number | null;
  proteinasG?: number | null;
  carbohidratosG?: number | null;
  grasasG?: number | null;
}

/** Estado completo de una receta persistida. */
export interface PropiedadesReceta {
  id: string;
  nombre: string;
  descripcion: string | null;
  porciones: number | null;
  preparacion: string | null;
  ingredientes: IngredienteDeReceta[];
  etiquetas: string[];
  /** Macros POR PORCIÓN (calculados de los ingredientes o cargados a mano). */
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
  fotos: FotoReceta[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Receta: una preparación del recetario profesional, con
 * ingredientes estructurados (cantidad en gramos + macros por 100 g), pasos,
 * etiquetas y fotos (los archivos viven en el bucket; acá solo su resumen).
 *
 * Los macros por porción se CALCULAN de los ingredientes al crear/actualizar
 * (sumando `cantidad/100 × macroPor100` de cada uno y dividiendo por las
 * porciones). Si ningún ingrediente trae datos nutricionales, se usan los
 * macros cargados a mano.
 *
 * Invariantes: nombre obligatorio; porciones positivas; macros no negativas.
 */
export class Receta {
  private constructor(private readonly props: PropiedadesReceta) {}

  static crear(datos: DatosNuevaReceta, id: string, ahora: Date = new Date()): Receta {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("La receta debe tener un nombre.");
    }
    if (datos.porciones != null && (!Number.isInteger(datos.porciones) || datos.porciones <= 0)) {
      throw new ErrorValidacion("Las porciones deben ser un número entero positivo.");
    }
    validarNoNegativo(datos.calorias, "Las calorías");
    validarNoNegativo(datos.proteinasG, "Las proteínas");
    validarNoNegativo(datos.carbohidratosG, "Los carbohidratos");
    validarNoNegativo(datos.grasasG, "Las grasas");

    const ingredientes = normalizarIngredientes(datos.ingredientes);
    const totales = calcularTotales(ingredientes);
    const macrosCalculados = tieneAlgunMacro(totales);
    // Si los ingredientes traen datos → macros por porción = totales / porciones.
    // Si no → se respetan los macros cargados a mano.
    const macros = macrosCalculados
      ? porPorcion(totales, datos.porciones ?? null)
      : {
          calorias: datos.calorias ?? null,
          proteinasG: datos.proteinasG ?? null,
          carbohidratosG: datos.carbohidratosG ?? null,
          grasasG: datos.grasasG ?? null,
        };

    return new Receta({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      porciones: datos.porciones ?? null,
      preparacion: datos.preparacion?.trim() || null,
      ingredientes,
      etiquetas: normalizarLista(datos.etiquetas),
      calorias: macros.calorias,
      proteinasG: macros.proteinasG,
      carbohidratosG: macros.carbohidratosG,
      grasasG: macros.grasasG,
      fotos: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesReceta): Receta {
    return new Receta(props);
  }

  /** Versión actualizada e inmutable (preserva id, fotos y creadoEn). */
  actualizar(datos: DatosNuevaReceta, ahora: Date = new Date()): Receta {
    const actualizada = Receta.crear(datos, this.props.id, ahora);
    return new Receta({
      ...actualizada.props,
      fotos: this.props.fotos.map((f) => ({ ...f })),
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get etiquetas(): ReadonlyArray<string> {
    return this.props.etiquetas;
  }
  get fotos(): ReadonlyArray<FotoReceta> {
    return this.props.fotos;
  }

  /** Macros TOTALES de la receta (suma de todos los ingredientes con datos). */
  totales(): MacrosReceta {
    return calcularTotales(this.props.ingredientes);
  }

  /** true si los macros por porción salen del cálculo de ingredientes (no manual). */
  get macrosCalculados(): boolean {
    return tieneAlgunMacro(this.totales());
  }

  aPrimitivos(): PropiedadesReceta {
    return {
      ...this.props,
      ingredientes: this.props.ingredientes.map((i) => ({ ...i })),
      etiquetas: [...this.props.etiquetas],
      fotos: this.props.fotos.map((f) => ({ ...f })),
    };
  }
}

/** Limpia una lista de texto: recorta y descarta entradas vacías. */
function normalizarLista(valores: string[] | undefined): string[] {
  return (valores ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
}

/** Normaliza los ingredientes: recorta el nombre, descarta los vacíos y valida números. */
function normalizarIngredientes(
  valores: DatosIngredienteReceta[] | undefined,
): IngredienteDeReceta[] {
  return (valores ?? [])
    .map((ing) => {
      const nombre = ing.nombre?.trim() ?? "";
      return {
        nombre,
        cantidadGramos: normalizarNumero(ing.cantidadGramos, `La cantidad de «${nombre}»`),
        caloriasPor100: normalizarNumero(ing.caloriasPor100, `Las calorías de «${nombre}»`),
        proteinasPor100: normalizarNumero(ing.proteinasPor100, `Las proteínas de «${nombre}»`),
        carbohidratosPor100: normalizarNumero(
          ing.carbohidratosPor100,
          `Los carbohidratos de «${nombre}»`,
        ),
        grasasPor100: normalizarNumero(ing.grasasPor100, `Las grasas de «${nombre}»`),
        fuente: ing.fuente?.trim() || null,
        referenciaExterna: ing.referenciaExterna?.trim() || null,
      };
    })
    .filter((ing) => ing.nombre.length > 0);
}

function normalizarNumero(valor: number | null | undefined, etiqueta: string): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(`${etiqueta} no puede ser negativa.`);
  }
  return valor;
}

/** Suma los macros de todos los ingredientes con cantidad y dato disponibles. */
function calcularTotales(ingredientes: IngredienteDeReceta[]): MacrosReceta {
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let gras = 0;
  let hayCal = false;
  let hayProt = false;
  let hayCarb = false;
  let hayGras = false;

  for (const ing of ingredientes) {
    const gramos = ing.cantidadGramos;
    if (gramos == null || gramos <= 0) continue;
    const factor = gramos / 100;
    if (ing.caloriasPor100 != null) {
      cal += ing.caloriasPor100 * factor;
      hayCal = true;
    }
    if (ing.proteinasPor100 != null) {
      prot += ing.proteinasPor100 * factor;
      hayProt = true;
    }
    if (ing.carbohidratosPor100 != null) {
      carb += ing.carbohidratosPor100 * factor;
      hayCarb = true;
    }
    if (ing.grasasPor100 != null) {
      gras += ing.grasasPor100 * factor;
      hayGras = true;
    }
  }

  return {
    calorias: hayCal ? Math.round(cal) : null,
    proteinasG: hayProt ? redondear1(prot) : null,
    carbohidratosG: hayCarb ? redondear1(carb) : null,
    grasasG: hayGras ? redondear1(gras) : null,
  };
}

/** Divide los totales por la cantidad de porciones (1 si no se indica). */
function porPorcion(totales: MacrosReceta, porciones: number | null): MacrosReceta {
  const p = porciones != null && porciones > 0 ? porciones : 1;
  return {
    calorias: totales.calorias != null ? Math.round(totales.calorias / p) : null,
    proteinasG: totales.proteinasG != null ? redondear1(totales.proteinasG / p) : null,
    carbohidratosG: totales.carbohidratosG != null ? redondear1(totales.carbohidratosG / p) : null,
    grasasG: totales.grasasG != null ? redondear1(totales.grasasG / p) : null,
  };
}

function tieneAlgunMacro(m: MacrosReceta): boolean {
  return (
    m.calorias != null || m.proteinasG != null || m.carbohidratosG != null || m.grasasG != null
  );
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function validarNoNegativo(valor: number | null | undefined, etiqueta: string): void {
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    throw new ErrorValidacion(`${etiqueta} no pueden ser negativas.`);
  }
}
