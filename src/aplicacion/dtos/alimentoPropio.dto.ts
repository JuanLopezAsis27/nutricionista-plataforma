import { z } from "zod";
import { CATEGORIAS_ALIMENTO } from "@/dominio/entidades/AlimentoPropio";
import {
  medidasAlimentoDto,
  medidaAlimentoDto,
  unidadBaseAlimentoDto,
} from "./medidasAlimento.dto";

/** Rubro del alimento (migración 84). */
const categoria = z.enum(CATEGORIAS_ALIMENTO).nullable().optional();

/** DTOs de los alimentos propios del nutricionista (Excel de macros). */

const macro = z.number().min(0).max(2000).nullable().optional();

/** Una fila de la planilla, ya parseada. */
export const filaAlimentoPropioDto = z.object({
  nombre: z.string().max(200),
  marca: z.string().max(120).nullable().optional(),
  caloriasPor100: macro,
  proteinasPor100: macro,
  carbohidratosPor100: macro,
  grasasPor100: macro,
  /** Null = la planilla no lo dice (sin columna o celda vacía). */
  unidadBase: unidadBaseAlimentoDto.nullable().optional(),
  /** Vacío = la planilla no trae medidas para esta fila. */
  medidas: medidasAlimentoDto.optional(),
  categoria,
});
export type FilaAlimentoPropioDto = z.infer<typeof filaAlimentoPropioDto>;

export const importarAlimentosDto = z.array(filaAlimentoPropioDto).max(20000);
export type ImportarAlimentosDto = z.infer<typeof importarAlimentosDto>;

/**
 * Qué hace la planilla con la lista: la REEMPLAZA (queda igual a la planilla)
 * o se le AGREGA (suma lo que no estaba y no toca lo que sí).
 */
export const modoImportacionAlimentosDto = z.enum(["REEMPLAZAR", "AGREGAR"]);
export type ModoImportacionAlimentosDto = z.infer<
  typeof modoImportacionAlimentosDto
>;

/** Lo que pasó con la planilla, igual para los dos modos. */
export interface ResultadoImportacionAlimentosDto {
  modo: ModoImportacionAlimentosDto;
  /** Al reemplazar, los que quedaron en la lista; al agregar, los que entraron. */
  importados: number;
  /** Filas descartadas por repetir un alimento que la planilla ya traía. */
  repetidos: number;
  /** Cuántos de los importados ya existen en la plataforma (se avisa, no se descarta). */
  enPlataforma: number;
  /** Solo al agregar: los que ya estaban en la lista y no se tocaron. */
  yaEstaban: number;
  /** Algunos de ellos, con la escritura de la lista. */
  ejemplosYaEstaban: string[];
  /** Las imágenes que traía la planilla en su columna «Imagen». */
  imagenes: {
    /** Las que quedaron guardadas en su alimento. */
    cargadas: number;
    /** Por qué no entró cada una de las otras («Avena: supera los 2 MB»). */
    descartadas: string[];
  };
}

/** Estado de la lista (para la UI). */
export const estadoAlimentosPropiosDto = z.object({
  cantidad: z.number().int(),
  activo: z.boolean(),
});
export type EstadoAlimentosPropiosDto = z.infer<
  typeof estadoAlimentosPropiosDto
>;

// --- Gestión manual (alta/edición/baja de un alimento y listado) ------------

export const crearAlimentoPropioDto = z.object({
  nombre: z.string().min(1, "Indicá el nombre").max(200),
  marca: z.string().max(120).nullable().optional(),
  caloriasPor100: macro,
  proteinasPor100: macro,
  carbohidratosPor100: macro,
  grasasPor100: macro,
  unidadBase: unidadBaseAlimentoDto.optional(),
  medidas: medidasAlimentoDto.optional(),
  categoria,
});
export type CrearAlimentoPropioDto = z.infer<typeof crearAlimentoPropioDto>;

export const actualizarAlimentoPropioDto = z.intersection(
  crearAlimentoPropioDto.partial(),
  z.object({ id: z.string().min(1) }),
);
export type ActualizarAlimentoPropioDto = z.infer<
  typeof actualizarAlimentoPropioDto
>;

export const idAlimentoPropioDto = z.object({ id: z.string().min(1) });

export const listarAlimentosPropiosDto = z.object({
  busqueda: z.string().optional(),
  categoria: z.enum(CATEGORIAS_ALIMENTO).optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20),
});
export type ListarAlimentosPropiosDto = z.infer<
  typeof listarAlimentosPropiosDto
>;

export const alimentoPropioSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  marca: z.string().nullable(),
  caloriasPor100: z.number().nullable(),
  proteinasPor100: z.number().nullable(),
  carbohidratosPor100: z.number().nullable(),
  grasasPor100: z.number().nullable(),
  unidadBase: unidadBaseAlimentoDto,
  medidas: z.array(medidaAlimentoDto),
  categoria: z.enum(CATEGORIAS_ALIMENTO).nullable(),
  /**
   * Cambia con cada imagen nueva; null si no tiene. La pantalla arma la URL
   * de la imagen con el id y esta versión (ver `urlImagenAlimento`).
   */
  imagenVersion: z.string().nullable(),
});
export type AlimentoPropioSalidaDto = z.infer<typeof alimentoPropioSalidaDto>;

/** Resultado paginado de la gestión manual. */
export interface AlimentosPropiosPaginados {
  alimentos: AlimentoPropioSalidaDto[];
  total: number;
  paginas: number;
}

/** Nombre y marca a comparar contra el catálogo de la plataforma. */
export const coincidenciaEnCatalogoDto = z.object({
  nombre: z.string().max(200),
  marca: z.string().max(120).nullable().optional(),
});
