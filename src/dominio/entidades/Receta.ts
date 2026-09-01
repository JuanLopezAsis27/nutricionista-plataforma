import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Resumen de una foto de la receta (lo completa el repositorio). */
export interface FotoReceta {
  id: string;
  nombreOriginal: string;
  mimeType: string;
}

/** Resumen de un documento adjunto de la receta (PDF, Word). */
export type DocumentoReceta = FotoReceta;

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
  /** Enlaces de referencia (videos, blogs, fuentes). URLs http/https. */
  enlaces?: string[];
  /** Carpeta en la que se guarda (null = suelta). Ver GrupoReceta. */
  grupoId?: string | null;
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
  enlaces: string[];
  /** Macros POR PORCIÓN (calculados de los ingredientes o cargados a mano). */
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
  fotos: FotoReceta[];
  /**
   * Cuál de las fotos representa la receta. null = ninguna elegida, y ahí el
   * getter cae en la primera disponible.
   */
  fotoPrincipalId: string | null;
  documentos: DocumentoReceta[];
  /** Carpeta en la que está guardada (null = suelta). */
  grupoId: string | null;
  /**
   * Nombre de la carpeta, para mostrarlo sin una consulta aparte. Lo llena el
   * repositorio al leer; en una receta recién creada viene null.
   */
  grupoNombre: string | null;
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

  static crear(
    datos: DatosNuevaReceta,
    id: string,
    ahora: Date = new Date(),
  ): Receta {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("La receta debe tener un nombre.");
    }
    if (
      datos.porciones != null &&
      (!Number.isInteger(datos.porciones) || datos.porciones <= 0)
    ) {
      throw new ErrorValidacion(
        "Las porciones deben ser un número entero positivo.",
      );
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
      enlaces: normalizarEnlaces(datos.enlaces),
      calorias: macros.calorias,
      proteinasG: macros.proteinasG,
      carbohidratosG: macros.carbohidratosG,
      grasasG: macros.grasasG,
      fotos: [],
      fotoPrincipalId: null,
      documentos: [],
      grupoId: datos.grupoId ?? null,
      // El nombre de la carpeta lo llena el repositorio al leer: la entidad no
      // tiene con qué resolverlo y guardarlo acá sería un cache que se vence.
      grupoNombre: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesReceta): Receta {
    return new Receta(props);
  }

  /** Versión actualizada e inmutable (preserva id, fotos, documentos y creadoEn). */
  actualizar(datos: DatosNuevaReceta, ahora: Date = new Date()): Receta {
    const actualizada = Receta.crear(datos, this.props.id, ahora);
    return new Receta({
      ...actualizada.props,
      fotos: this.props.fotos.map((f) => ({ ...f })),
      documentos: this.props.documentos.map((d) => ({ ...d })),
      fotoPrincipalId: this.props.fotoPrincipalId,
      // Sin `grupoId` en los datos la receta se queda donde está: editar el
      // nombre no puede sacarla de su carpeta en silencio.
      grupoId:
        datos.grupoId === undefined
          ? this.props.grupoId
          : (datos.grupoId ?? null),
      grupoNombre: this.props.grupoNombre,
      creadoEn: this.props.creadoEn,
    });
  }

  /**
   * Elige cuál de las fotos es la principal. `null` vuelve al automático (la
   * primera disponible).
   *
   * Valida que la foto sea de ESTA receta: un id de otra receta dejaría la
   * portada apuntando a algo que la vista nunca va a encontrar entre sus
   * fotos, y el fallback lo taparía en silencio.
   */
  marcarFotoPrincipal(fotoId: string | null, ahora: Date = new Date()): Receta {
    if (fotoId != null && !this.props.fotos.some((f) => f.id === fotoId)) {
      throw new ErrorValidacion("Esa foto no pertenece a la receta.");
    }
    return new Receta({
      ...this.props,
      fotoPrincipalId: fotoId,
      actualizadoEn: ahora,
    });
  }

  /** ¿Este archivo está adjunto a la receta (foto o documento)? */
  tieneArchivo(archivoId: string): boolean {
    return (
      this.props.fotos.some((f) => f.id === archivoId) ||
      this.props.documentos.some((d) => d.id === archivoId)
    );
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get grupoId(): string | null {
    return this.props.grupoId;
  }
  get etiquetas(): ReadonlyArray<string> {
    return this.props.etiquetas;
  }
  get enlaces(): ReadonlyArray<string> {
    return this.props.enlaces;
  }
  get fotos(): ReadonlyArray<FotoReceta> {
    return this.props.fotos;
  }

  /**
   * La foto que representa la receta.
   *
   * Cae en la primera disponible cuando no hay una elegida —o cuando la
   * elegida ya no está entre las fotos, que pasa si se la borró—. Resolver el
   * fallback acá y no en cada pantalla evita que la tarjeta del recetario y la
   * vista de la receta muestren cosas distintas.
   */
  get fotoPrincipal(): FotoReceta | null {
    const elegida = this.props.fotos.find(
      (f) => f.id === this.props.fotoPrincipalId,
    );
    return elegida ?? this.props.fotos[0] ?? null;
  }
  get documentos(): ReadonlyArray<DocumentoReceta> {
    return this.props.documentos;
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
      enlaces: [...this.props.enlaces],
      fotos: this.props.fotos.map((f) => ({ ...f })),
      documentos: this.props.documentos.map((d) => ({ ...d })),
    };
  }
}

/** Máximo de enlaces por receta y longitud máxima de cada URL. */
const MAX_ENLACES = 20;
const MAX_LARGO_ENLACE = 500;

/**
 * Normaliza los enlaces: recorta, descarta vacíos, valida que sean URLs
 * http/https, deduplica y limita la cantidad. Lanza si alguna URL es inválida.
 */
function normalizarEnlaces(valores: string[] | undefined): string[] {
  const limpios = (valores ?? [])
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const enlace of limpios) {
    if (enlace.length > MAX_LARGO_ENLACE) {
      throw new ErrorValidacion("Un enlace es demasiado largo.");
    }
    if (!/^https?:\/\//i.test(enlace)) {
      throw new ErrorValidacion(
        `El enlace «${enlace}» debe empezar con http:// o https://`,
      );
    }
    if (!vistos.has(enlace)) {
      vistos.add(enlace);
      resultado.push(enlace);
    }
  }
  if (resultado.length > MAX_ENLACES) {
    throw new ErrorValidacion(
      `No se pueden agregar más de ${MAX_ENLACES} enlaces.`,
    );
  }
  return resultado;
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
        cantidadGramos: normalizarNumero(
          ing.cantidadGramos,
          `La cantidad de «${nombre}»`,
        ),
        caloriasPor100: normalizarNumero(
          ing.caloriasPor100,
          `Las calorías de «${nombre}»`,
        ),
        proteinasPor100: normalizarNumero(
          ing.proteinasPor100,
          `Las proteínas de «${nombre}»`,
        ),
        carbohidratosPor100: normalizarNumero(
          ing.carbohidratosPor100,
          `Los carbohidratos de «${nombre}»`,
        ),
        grasasPor100: normalizarNumero(
          ing.grasasPor100,
          `Las grasas de «${nombre}»`,
        ),
        fuente: ing.fuente?.trim() || null,
        referenciaExterna: ing.referenciaExterna?.trim() || null,
      };
    })
    .filter((ing) => ing.nombre.length > 0);
}

function normalizarNumero(
  valor: number | null | undefined,
  etiqueta: string,
): number | null {
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
function porPorcion(
  totales: MacrosReceta,
  porciones: number | null,
): MacrosReceta {
  const p = porciones != null && porciones > 0 ? porciones : 1;
  return {
    calorias:
      totales.calorias != null ? Math.round(totales.calorias / p) : null,
    proteinasG:
      totales.proteinasG != null ? redondear1(totales.proteinasG / p) : null,
    carbohidratosG:
      totales.carbohidratosG != null
        ? redondear1(totales.carbohidratosG / p)
        : null,
    grasasG: totales.grasasG != null ? redondear1(totales.grasasG / p) : null,
  };
}

function tieneAlgunMacro(m: MacrosReceta): boolean {
  return (
    m.calorias != null ||
    m.proteinasG != null ||
    m.carbohidratosG != null ||
    m.grasasG != null
  );
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function validarNoNegativo(
  valor: number | null | undefined,
  etiqueta: string,
): void {
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    throw new ErrorValidacion(`${etiqueta} no pueden ser negativas.`);
  }
}
