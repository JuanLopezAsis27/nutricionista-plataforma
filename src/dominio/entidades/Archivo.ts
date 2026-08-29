import { ErrorArchivoInvalido } from "../errores/ErrorArchivoInvalido";

const MIMES_IMAGEN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const MIMES_DOCUMENTO = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MB = 1024 * 1024;

/**
 * Contextos de subida: cada uno define el prefijo de la clave en el bucket,
 * los tipos MIME permitidos y el tamaño máximo. Las fases siguientes suman
 * dueños (laboratorio, receta, etc.) que referencian estos contextos.
 */
export const CONTEXTOS_ARCHIVO = {
  laboratorio: {
    prefijo: "laboratorios",
    mimes: [...MIMES_DOCUMENTO, ...MIMES_IMAGEN],
    maxBytes: 10 * MB,
  },
  "foto-comida": {
    prefijo: "diario",
    mimes: [...MIMES_IMAGEN],
    maxBytes: 10 * MB,
  },
  receta: {
    prefijo: "recetas",
    // Fotos (imágenes) y documentos adjuntos (PDF/Word) de la receta. Al leer,
    // el repositorio los separa por MIME (imágenes = fotos; resto = documentos).
    mimes: [...MIMES_IMAGEN, ...MIMES_DOCUMENTO],
    maxBytes: 10 * MB,
  },
  biblioteca: {
    prefijo: "biblioteca",
    mimes: [...MIMES_DOCUMENTO, ...MIMES_IMAGEN],
    maxBytes: 25 * MB,
  },
  paciente: {
    prefijo: "pacientes",
    mimes: [...MIMES_DOCUMENTO, ...MIMES_IMAGEN],
    maxBytes: 10 * MB,
  },
  // El plan armado afuera (Word, Canva) y subido tal cual. Solo PDF: es lo
  // único que el paciente puede abrir en la app sin descargar nada ni tener
  // Office instalado, y el punto de la función es que lo LEA acá adentro.
  plan: {
    prefijo: "planes",
    mimes: ["application/pdf"],
    maxBytes: 25 * MB,
  },
} as const;

export type ContextoArchivo = keyof typeof CONTEXTOS_ARCHIVO;

export const CONTEXTOS_ARCHIVO_LISTA = Object.keys(
  CONTEXTOS_ARCHIVO,
) as ContextoArchivo[];

/** Datos para registrar un archivo nuevo. */
export interface DatosNuevoArchivo {
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  contexto: ContextoArchivo;
  titulo?: string | null;
  categoria?: string | null;
  subidoPorId?: string | null;
}

/** Estado completo de un archivo persistido. */
export interface PropiedadesArchivo {
  id: string;
  clave: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
  titulo: string | null;
  categoria: string | null;
  subidoPorId: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio Archivo: metadatos de un objeto guardado en el bucket.
 *
 * Invariantes: nombre original obligatorio, MIME dentro de la lista blanca
 * del contexto y tamaño positivo que no exceda el máximo del contexto.
 * La clave en el bucket se deriva del contexto + id (determinística, sin
 * caracteres del nombre original: evita problemas de encoding).
 */
export class Archivo {
  private constructor(private readonly props: PropiedadesArchivo) {}

  static crear(
    datos: DatosNuevoArchivo,
    id: string,
    ahora: Date = new Date(),
  ): Archivo {
    const nombreOriginal = datos.nombreOriginal?.trim() ?? "";
    if (nombreOriginal.length === 0) {
      throw new ErrorArchivoInvalido("El archivo debe tener un nombre.");
    }

    const contexto = CONTEXTOS_ARCHIVO[datos.contexto];
    if (!contexto) {
      throw new ErrorArchivoInvalido(
        `Contexto de archivo desconocido: ${datos.contexto}.`,
      );
    }

    if (!(contexto.mimes as readonly string[]).includes(datos.mimeType)) {
      throw new ErrorArchivoInvalido(
        `El tipo de archivo ${datos.mimeType} no está permitido para ${datos.contexto}.`,
      );
    }

    if (!Number.isFinite(datos.tamanoBytes) || datos.tamanoBytes <= 0) {
      throw new ErrorArchivoInvalido("El archivo está vacío.");
    }
    if (datos.tamanoBytes > contexto.maxBytes) {
      const maxMb = Math.round(contexto.maxBytes / MB);
      throw new ErrorArchivoInvalido(
        `El archivo supera el máximo de ${maxMb} MB.`,
      );
    }

    return new Archivo({
      id,
      clave: `${contexto.prefijo}/${id}${extensionDe(nombreOriginal)}`,
      nombreOriginal,
      mimeType: datos.mimeType,
      tamanoBytes: datos.tamanoBytes,
      titulo: datos.titulo?.trim() || null,
      categoria: datos.categoria?.trim() || null,
      subidoPorId: datos.subidoPorId ?? null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesArchivo): Archivo {
    return new Archivo(props);
  }

  get id(): string {
    return this.props.id;
  }
  get clave(): string {
    return this.props.clave;
  }
  get nombreOriginal(): string {
    return this.props.nombreOriginal;
  }
  get mimeType(): string {
    return this.props.mimeType;
  }
  get tamanoBytes(): number {
    return this.props.tamanoBytes;
  }
  get titulo(): string | null {
    return this.props.titulo;
  }
  get categoria(): string | null {
    return this.props.categoria;
  }
  get subidoPorId(): string | null {
    return this.props.subidoPorId;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesArchivo {
    return { ...this.props };
  }
}

/** Extensión del nombre original, saneada (".pdf", ".jpg") o cadena vacía. */
function extensionDe(nombre: string): string {
  const coincidencia = /\.([a-zA-Z0-9]{1,10})$/.exec(nombre);
  return coincidencia ? `.${coincidencia[1]!.toLowerCase()}` : "";
}
