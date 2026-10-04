import { z } from "zod";
import { TIPOS_MATERIAL } from "@/dominio/entidades/MaterialBiblioteca";

/** DTOs de la Biblioteca — esquemas Zod de entrada/salida. */

const materialBase = z.object({
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
  categoria: z.string().max(80).optional().nullable(),
  etiquetas: z.array(z.string().max(60)).max(30).optional(),
});

export const crearMaterialDto = materialBase.extend({
  tipo: z.enum(TIPOS_MATERIAL),
  archivoId: z.string().min(1).optional().nullable(),
  /** Carpeta en la que nace; null o ausente = suelto. */
  grupoId: z.string().min(1).optional().nullable(),
});
export type CrearMaterialDto = z.infer<typeof crearMaterialDto>;

export const actualizarMaterialDto = materialBase.extend({
  id: z.string().min(1),
});
export type ActualizarMaterialDto = z.infer<typeof actualizarMaterialDto>;

export const idMaterialDto = z.object({ id: z.string().min(1) });
export type IdMaterialDto = z.infer<typeof idMaterialDto>;

export const filtroMaterialesDto = z
  .object({
    texto: z.string().max(160).optional(),
    categoria: z.string().max(80).optional(),
    etiqueta: z.string().max(60).optional(),
  })
  .optional();
export type FiltroMaterialesDto = z.infer<typeof filtroMaterialesDto>;

/** Listado paginado de la biblioteca (10 por página por defecto). */
export const listarMaterialesPaginadoDto = z.object({
  texto: z.string().max(160).optional(),
  categoria: z.string().max(80).optional(),
  etiqueta: z.string().max(60).optional(),
  /** null filtra los SUELTOS; ausente no filtra por carpeta. */
  grupoId: z.string().min(1).nullable().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(10),
});
export type ListarMaterialesPaginadoDto = z.infer<
  typeof listarMaterialesPaginadoDto
>;

export const asignarMaterialDto = z.object({
  materialId: z.string().min(1),
  pacienteId: z.string().min(1),
});
export type AsignarMaterialDto = z.infer<typeof asignarMaterialDto>;

export const materialSalidaDto = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_MATERIAL),
  titulo: z.string(),
  descripcion: z.string().nullable(),
  url: z.string().nullable(),
  categoria: z.string().nullable(),
  etiquetas: z.array(z.string()),
  grupoId: z.string().nullable(),
  archivo: z
    .object({
      id: z.string(),
      nombreOriginal: z.string(),
      mimeType: z.string(),
    })
    .nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type MaterialSalidaDto = z.infer<typeof materialSalidaDto>;

/** Resultado paginado de la biblioteca. */
export interface MaterialesPaginados {
  materiales: MaterialSalidaDto[];
  total: number;
  paginas: number;
}

// --- Carpetas de la biblioteca -----------------------------------------------

export const grupoMaterialDto = z.object({
  nombre: z.string().min(1, "La carpeta necesita un nombre").max(80),
  descripcion: z.string().max(500).optional().nullable(),
});
export type GrupoMaterialDto = z.infer<typeof grupoMaterialDto>;

export const actualizarGrupoMaterialDto = grupoMaterialDto.extend({
  id: z.string().min(1),
});
export type ActualizarGrupoMaterialDto = z.infer<
  typeof actualizarGrupoMaterialDto
>;

export const idGrupoMaterialDto = z.object({ id: z.string().min(1) });
export type IdGrupoMaterialDto = z.infer<typeof idGrupoMaterialDto>;

export const grupoMaterialSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  /** Materiales adentro. */
  cantidadMateriales: z.number(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type GrupoMaterialSalidaDto = z.infer<typeof grupoMaterialSalidaDto>;

export const moverMaterialDto = z.object({
  materialId: z.string().min(1),
  /** null saca el material de la carpeta en la que esté. */
  grupoId: z.string().min(1).nullable(),
});
export type MoverMaterialDto = z.infer<typeof moverMaterialDto>;
