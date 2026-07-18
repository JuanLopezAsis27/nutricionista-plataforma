import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de material de la biblioteca. */
export const TIPOS_MATERIAL = ["ARCHIVO", "ENLACE"] as const;
export type TipoMaterial = (typeof TIPOS_MATERIAL)[number];

const PATRON_URL = /^https?:\/\/\S+$/i;

/** Resumen del archivo del bucket (lo completa el repositorio). */
export interface ArchivoMaterial {
  id: string;
  nombreOriginal: string;
  mimeType: string;
}

/** Datos para crear un material nuevo. */
export interface DatosNuevoMaterial {
  tipo: TipoMaterial;
  titulo: string;
  descripcion?: string | null;
  url?: string | null; // solo ENLACE
  categoria?: string | null;
  etiquetas?: string[];
}

/** Cambios editables (el tipo no se cambia: se crea otro material). */
export interface CambiosMaterial {
  titulo?: string;
  descripcion?: string | null;
  url?: string | null;
  categoria?: string | null;
  etiquetas?: string[];
}

/** Estado completo de un material persistido. */
export interface PropiedadesMaterial {
  id: string;
  tipo: TipoMaterial;
  titulo: string;
  descripcion: string | null;
  url: string | null;
  categoria: string | null;
  etiquetas: string[];
  archivo: ArchivoMaterial | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio MaterialBiblioteca: material educativo del profesional,
 * un archivo del bucket (vía Archivo.materialId) o un enlace externo.
 *
 * Invariantes: título obligatorio; ENLACE exige una URL http(s) válida;
 * ARCHIVO no lleva URL (el contenido vive en el bucket).
 */
export class MaterialBiblioteca {
  private constructor(private readonly props: PropiedadesMaterial) {}

  static crear(
    datos: DatosNuevoMaterial,
    id: string,
    ahora: Date = new Date(),
  ): MaterialBiblioteca {
    const titulo = datos.titulo?.trim() ?? "";
    if (titulo.length === 0) {
      throw new ErrorValidacion("El material debe tener un título.");
    }

    let url: string | null = null;
    if (datos.tipo === "ENLACE") {
      url = datos.url?.trim() || null;
      if (!url || !PATRON_URL.test(url)) {
        throw new ErrorValidacion("El enlace debe ser una URL válida (http/https).");
      }
    }

    return new MaterialBiblioteca({
      id,
      tipo: datos.tipo,
      titulo,
      descripcion: datos.descripcion?.trim() || null,
      url,
      categoria: datos.categoria?.trim() || null,
      etiquetas: normalizarLista(datos.etiquetas),
      archivo: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesMaterial): MaterialBiblioteca {
    return new MaterialBiblioteca(props);
  }

  /** Versión actualizada e inmutable (preserva tipo, archivo y creadoEn). */
  actualizar(cambios: CambiosMaterial, ahora: Date = new Date()): MaterialBiblioteca {
    const actualizado = MaterialBiblioteca.crear(
      {
        tipo: this.props.tipo,
        titulo: cambios.titulo !== undefined ? cambios.titulo : this.props.titulo,
        descripcion:
          cambios.descripcion !== undefined ? cambios.descripcion : this.props.descripcion,
        url: cambios.url !== undefined ? cambios.url : this.props.url,
        categoria: cambios.categoria !== undefined ? cambios.categoria : this.props.categoria,
        etiquetas: cambios.etiquetas ?? this.props.etiquetas,
      },
      this.props.id,
      ahora,
    );
    return new MaterialBiblioteca({
      ...actualizado.props,
      archivo: this.props.archivo ? { ...this.props.archivo } : null,
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get tipo(): TipoMaterial {
    return this.props.tipo;
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get archivo(): ArchivoMaterial | null {
    return this.props.archivo ? { ...this.props.archivo } : null;
  }

  aPrimitivos(): PropiedadesMaterial {
    return {
      ...this.props,
      etiquetas: [...this.props.etiquetas],
      archivo: this.props.archivo ? { ...this.props.archivo } : null,
    };
  }
}

/** Limpia una lista de texto: recorta y descarta entradas vacías. */
function normalizarLista(valores: string[] | undefined): string[] {
  return (valores ?? []).map((v) => v.trim()).filter((v) => v.length > 0);
}
