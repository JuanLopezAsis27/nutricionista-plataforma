import { z } from "zod";
import {
  NIVELES_DEPORTIVOS,
  FASES_TEMPORADA,
} from "@/dominio/entidades/PerfilDeportivo";
import { IMPORTANCIAS_COMPETENCIA } from "@/dominio/entidades/Competencia";
import { numeroEnRango } from "@/lib/validacionListas";

/**
 * Esquemas del módulo deportivo. Exportados para el test de coherencia con
 * `guardarPerfilDeportivoDto` y `crearCompetenciaDto`.
 */

/** Esquemas del módulo deportivo. Exportados para el test de coherencia. */
export const esquemaPerfil = z.object({
  deporte: z.string().min(1, "Indicá el deporte").max(80),
  disciplina: z.string().max(80),
  nivel: z.enum(NIVELES_DEPORTIVOS),
  fase: z.enum(FASES_TEMPORADA),
  // Rangos de guardarPerfilDeportivoDto. El de peso tiene PISO 20 kg, no
  // solo techo: sin esto el formulario aceptaba 5 y el servidor lo rechazaba.
  diasEntrenamientoSemana: numeroEnRango(0, 14, "Entre 0 y 14 días"),
  horasSemana: numeroEnRango(0, 80, "Entre 0 y 80 horas"),
  pesoCategoriaKg: numeroEnRango(20, 400, "Entre 20 y 400 kg"),
  posicion: z.string().max(60),
  objetivo: z.string().max(500),
  notas: z.string().max(1000),
});
export type DatosPerfil = z.infer<typeof esquemaPerfil>;

export const esquemaCompetencia = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  lugar: z.string().max(160),
  importancia: z.enum(IMPORTANCIAS_COMPETENCIA),
  objetivo: z.string().max(300),
  resultado: z.string().max(300),
  notas: z.string().max(1000),
});
export type DatosCompetenciaForm = z.infer<typeof esquemaCompetencia>;
