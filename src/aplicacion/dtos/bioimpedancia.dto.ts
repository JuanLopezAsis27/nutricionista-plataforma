import { z } from "zod";
import { RANGOS_BIOIMPEDANCIA } from "@/dominio/entidades/Bioimpedancia";
import {
  VARIABLES_BIOIMPEDANCIA,
  type VariableBioimpedancia,
} from "@/dominio/entidades/ObjetivoBioimpedancia";
import { ESTADOS_OBJETIVO } from "@/dominio/entidades/Objetivo";
import type { EstadoObjetivo } from "@/dominio/entidades/Objetivo";
import type { ProyeccionMeta } from "@/dominio/servicios/proyeccionComposicion";

/** DTOs de Bioimpedancia — esquemas Zod de entrada y formas de salida. */

/** El rango del esquema es el mismo de la entidad: una sola regla. */
function acotada(campo: keyof typeof RANGOS_BIOIMPEDANCIA): z.ZodNumber {
  const { min, max, entero } = RANGOS_BIOIMPEDANCIA[campo];
  const numero = z.number().min(min).max(max);
  return entero ? numero.int() : numero;
}

const medidasBioimpedanciaDto = z.object({
  pesoKg: acotada("pesoKg"),
  masaMuscularKg: acotada("masaMuscularKg").optional().nullable(),
  masaGrasaKg: acotada("masaGrasaKg").optional().nullable(),
  porcentajeMuscular: acotada("porcentajeMuscular").optional().nullable(),
  porcentajeGrasa: acotada("porcentajeGrasa").optional().nullable(),
  nivelGrasaVisceral: acotada("nivelGrasaVisceral").optional().nullable(),
  observaciones: z.string().max(2000).optional().nullable(),
});

export const registrarBioimpedanciaDto = medidasBioimpedanciaDto.extend({
  pacienteId: z.string().min(1),
  fecha: z.coerce.date(),
});
export type RegistrarBioimpedanciaDto = z.infer<
  typeof registrarBioimpedanciaDto
>;

export const actualizarBioimpedanciaDto = medidasBioimpedanciaDto
  .partial()
  .extend({
    id: z.string().min(1),
    fecha: z.coerce.date().optional(),
  });
export type ActualizarBioimpedanciaDto = z.infer<
  typeof actualizarBioimpedanciaDto
>;

export const idBioimpedanciaDto = z.object({ id: z.string().min(1) });

export const idPacienteBioimpedanciaDto = z.object({
  pacienteId: z.string().min(1),
});

/** Una consulta con la balanza, tal como la informó el equipo. */
export interface MedicionBioimpedanciaDto {
  id: string;
  pacienteId: string;
  fecha: Date;
  pesoKg: number;
  masaMuscularKg: number | null;
  masaGrasaKg: number | null;
  porcentajeMuscular: number | null;
  porcentajeGrasa: number | null;
  /** Nivel de la escala del equipo: entero y sin unidad. */
  nivelGrasaVisceral: number | null;
  observaciones: string | null;
}

/** Meta de bioimpedancia + su proyección contra la serie. */
export interface ObjetivoBioimpedanciaDto {
  id: string;
  pacienteId: string;
  variable: VariableBioimpedancia;
  descripcion: string;
  valorObjetivo: number;
  fechaObjetivo: Date | null;
  estado: EstadoObjetivo;
  notas: string | null;
  creadoEn: Date;
  proyeccion: ProyeccionMeta<VariableBioimpedancia>;
}

export interface ValorActualBioimpedanciaDto {
  variable: VariableBioimpedancia;
  valor: number;
}

/** Todo lo que consume la pestaña Bioimpedancia. */
export interface SeguimientoBioimpedanciaDto {
  /** De la más vieja a la más nueva. */
  mediciones: MedicionBioimpedanciaDto[];
  objetivos: ObjetivoBioimpedanciaDto[];
  valoresActuales: ValorActualBioimpedanciaDto[];
}

export const guardarObjetivoBioimpedanciaDto = z.object({
  pacienteId: z.string().min(1),
  variable: z.enum(VARIABLES_BIOIMPEDANCIA),
  valorObjetivo: z.number().finite(),
  fechaObjetivo: z.coerce.date().optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
  estado: z.enum(ESTADOS_OBJETIVO).optional(),
});
export type GuardarObjetivoBioimpedanciaDto = z.infer<
  typeof guardarObjetivoBioimpedanciaDto
>;

export const idObjetivoBioimpedanciaDto = z.object({ id: z.string().min(1) });
