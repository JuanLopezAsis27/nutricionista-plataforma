import type { ProveedorClaveIA } from "./IConfiguracionIAGlobalRepositorio";

/** Qué capacidad se usó: conversar/leer (LLM) o pasar audio a texto. */
export type CapacidadIA = "LLM" | "TRANSCRIPCION";

/** Una llamada a un proveedor de IA, tal como se registra. */
export interface UsoIA {
  capacidad: CapacidadIA;
  proveedor: ProveedorClaveIA;
  modelo: string;
  /** "completar" | "conversar" | "transcribir" */
  operacion: string;
  tokensEntrada: number;
  tokensSalida: number;
  /**
   * Costo en dólares SOLO si el proveedor lo informa (OpenRouter). No se
   * estima con una tabla de precios propia: una tabla así queda vieja sin
   * avisar y el panel mostraría un gasto inventado con cara de dato.
   */
  costoUsd: number | null;
  exito: boolean;
  error: string | null;
  duracionMs: number;
}

/** Un registro ya guardado, con el consultorio que lo originó. */
export interface RegistroUsoIA extends UsoIA {
  id: string;
  nutricionistaId: string | null;
  /** Email de la cuenta del consultorio, para reconocerlo en el panel. */
  consultorio: string | null;
  creadoEn: Date;
}

/** Acumulado de un grupo de llamadas. */
export interface TotalesUsoIA {
  llamadas: number;
  errores: number;
  tokensEntrada: number;
  tokensSalida: number;
  /** Suma de los costos informados; null si ninguna llamada lo informó. */
  costoUsd: number | null;
}

export interface ResumenUsoIA {
  totales: TotalesUsoIA;
  porProveedor: (TotalesUsoIA & { proveedor: ProveedorClaveIA; capacidad: CapacidadIA })[];
  porModelo: (TotalesUsoIA & { proveedor: ProveedorClaveIA; modelo: string })[];
  porConsultorio: (TotalesUsoIA & {
    nutricionistaId: string | null;
    consultorio: string | null;
  })[];
  /** Un punto por día con actividad, en orden cronológico (día UTC). */
  porDia: (TotalesUsoIA & { dia: string })[];
}

export interface FiltroRegistrosUsoIA {
  pagina: number;
  porPagina: number;
  soloErrores?: boolean;
  nutricionistaId?: string;
}

/**
 * Registro de uso de la IA de la plataforma.
 *
 * Lo escribe el decorador del proveedor en cada llamada, dentro del alcance
 * del consultorio que la hizo, y lo lee el SUPERADMIN en alcance global.
 */
export interface IRegistroUsoIARepositorio {
  registrar(uso: UsoIA): Promise<void>;
  resumir(desde: Date): Promise<ResumenUsoIA>;
  listar(
    filtro: FiltroRegistrosUsoIA,
  ): Promise<{ registros: RegistroUsoIA[]; total: number }>;
}
