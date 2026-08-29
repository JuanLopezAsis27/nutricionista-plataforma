import { z } from "zod";
import { passwordNuevaDto } from "./password";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";

/**
 * DTOs de Paciente — esquemas Zod de entrada/salida.
 *
 * La validación con Zod ocurre en el borde de la aplicación (routers tRPC),
 * complementando los invariantes de negocio de la entidad Paciente. Aquí se
 * valida la *forma* de los datos; la entidad valida las *reglas de negocio*.
 */

export const crearPacienteDto = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  apellido: z.string().min(1, "El apellido es obligatorio").max(100),
  email: z.string().email("Email inválido"),
  telefono: z.string().max(30).optional().nullable(),
  fechaNacimiento: z.coerce.date().optional().nullable(),
  /** Lo necesita la antropometría; opcional para no frenar el alta rápida. */
  sexo: z.enum(SEXOS_BIOLOGICOS).optional().nullable(),
  notas: z.string().max(1000).optional().nullable(),
});
export type CrearPacienteDto = z.infer<typeof crearPacienteDto>;

/**
 * Alta de paciente con su cuenta de acceso (la app es multiusuario: el
 * paciente también inicia sesión). El nutricionista define la contraseña.
 */
export const crearPacienteConAccesoDto = crearPacienteDto.extend({
  // Política única para toda la app (ver dtos/password.ts). Antes acá el
  // mínimo era 6 y en el alta de nutricionista 8: dos criterios para la misma
  // decisión.
  password: passwordNuevaDto,
});
export type CrearPacienteConAccesoDto = z.infer<
  typeof crearPacienteConAccesoDto
>;

export const actualizarPacienteDto = crearPacienteDto.partial().extend({
  id: z.string().min(1),
});
export type ActualizarPacienteDto = z.infer<typeof actualizarPacienteDto>;

export const idPacienteDto = z.object({ id: z.string().min(1) });
export type IdPacienteDto = z.infer<typeof idPacienteDto>;

/** Baja lógica del paciente: conserva toda su historia clínica. */
export const archivarPacienteDto = z.object({
  id: z.string().min(1),
  motivo: z.string().max(500).optional().nullable(),
});
export type ArchivarPacienteDto = z.infer<typeof archivarPacienteDto>;

export const listarPacientesDto = z.object({
  busqueda: z.string().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(10),
  /** Los archivados quedan fuera salvo que se pidan explícitamente. */
  incluirArchivados: z.boolean().default(false),
});
export type ListarPacientesDto = z.infer<typeof listarPacientesDto>;

/** Forma de salida (lo que la presentación recibe). */
export const pacienteSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  telefonoE164: z.string().nullable(),
  fechaNacimiento: z.date().nullable(),
  sexo: z.enum(SEXOS_BIOLOGICOS).nullable(),
  notas: z.string().nullable(),
  archivadoEn: z.date().nullable(),
  motivoArchivado: z.string().nullable(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PacienteSalidaDto = z.infer<typeof pacienteSalidaDto>;

/** Resultado paginado de un listado de pacientes. */
export interface PacientesPaginados {
  pacientes: PacienteSalidaDto[];
  total: number;
  paginas: number;
}
