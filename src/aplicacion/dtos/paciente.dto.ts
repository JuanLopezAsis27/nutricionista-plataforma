import { z } from "zod";

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
  notas: z.string().max(1000).optional().nullable(),
});
export type CrearPacienteDto = z.infer<typeof crearPacienteDto>;

/**
 * Alta de paciente con su cuenta de acceso (la app es multiusuario: el
 * paciente también inicia sesión). El nutricionista define la contraseña.
 */
export const crearPacienteConAccesoDto = crearPacienteDto.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
});
export type CrearPacienteConAccesoDto = z.infer<typeof crearPacienteConAccesoDto>;

export const actualizarPacienteDto = crearPacienteDto.partial().extend({
  id: z.string().min(1),
});
export type ActualizarPacienteDto = z.infer<typeof actualizarPacienteDto>;

export const idPacienteDto = z.object({ id: z.string().min(1) });
export type IdPacienteDto = z.infer<typeof idPacienteDto>;

export const listarPacientesDto = z.object({
  busqueda: z.string().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(20),
});
export type ListarPacientesDto = z.infer<typeof listarPacientesDto>;

/** Forma de salida (lo que la presentación recibe). */
export const pacienteSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  fechaNacimiento: z.date().nullable(),
  notas: z.string().nullable(),
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
