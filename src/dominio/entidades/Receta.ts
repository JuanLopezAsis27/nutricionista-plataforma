import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Resumen de una foto de la receta (lo completa el repositorio). */
export interface FotoReceta {
  id: string;
  nombreOriginal: string;
  mimeType: string;
}

/** Macros por porción (todas opcionales). */
export interface MacrosReceta {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Datos para crear/editar una receta. */
export interface DatosNuevaReceta {
  nombre: string;
  descripcion?: string | null;
  porciones?: number | null;
  preparacion?: string | null;
  ingredientes?: string[];
  etiquetas?: string[];
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
  ingredientes: string[];
  etiquetas: string[];
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
 * ingredientes (lista ordenada de texto), pasos, macros por porción opcionales,
 * etiquetas y fotos (los archivos viven en el bucket; acá solo su resumen).
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

    return new Receta({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      porciones: datos.porciones ?? null,
      preparacion: datos.preparacion?.trim() || null,
      ingredientes: normalizarLista(datos.ingredientes),
      etiquetas: normalizarLista(datos.etiquetas),
      calorias: datos.calorias ?? null,
      proteinasG: datos.proteinasG ?? null,
      carbohidratosG: datos.carbohidratosG ?? null,
      grasasG: datos.grasasG ?? null,
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

  aPrimitivos(): PropiedadesReceta {
    return {
      ...this.props,
      ingredientes: [...this.props.ingredientes],
      etiquetas: [...this.props.etiquetas],
      fotos: this.props.fotos.map((f) => ({ ...f })),
    };
  }
}

/** Limpia una lista de texto: recorta y descarta entradas vacías. */
function normalizarLista(valores: string[] | undefined): string[] {
  return (valores ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
}

function validarNoNegativo(valor: number | null | undefined, etiqueta: string): void {
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    throw new ErrorValidacion(`${etiqueta} no pueden ser negativas.`);
  }
}
