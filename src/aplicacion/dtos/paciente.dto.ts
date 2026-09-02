import { z } from "zod";
import { passwordNuevaDto } from "./password";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import {
  TIPOS_ALERTA_ALIMENTARIA,
  SEVERIDADES_ALERTA,
} from "@/dominio/entidades/AlertaAlimentaria";
import {
  campoPersonalizadoHistoriaDto,
  medidasAntropometricasDto,
} from "./evaluacion.dto";

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

// --- Alta desde un documento (ficha en PDF, Word o foto) ----------------------

/** Lee la ficha ya subida. El archivo todavía no tiene dueño: no hay paciente. */
export const interpretarFichaPacienteDto = z.object({
  archivoId: z.string().min(1),
});
export type InterpretarFichaPacienteDto = z.infer<
  typeof interpretarFichaPacienteDto
>;

const alertaSugeridaDto = z.object({
  tipo: z.enum(TIPOS_ALERTA_ALIMENTARIA),
  descripcion: z.string().min(1).max(300),
  severidad: z.enum(SEVERIDADES_ALERTA),
  notas: z.string().max(1000).nullable(),
});

const laboratorioSugeridoDto = z.object({
  /** ISO `YYYY-MM-DD`, o null si el documento no la traía legible. */
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  titulo: z.string().min(1).max(200),
  notas: z.string().max(5000).nullable(),
});

const antropometriaSugeridaDto = medidasAntropometricasDto.extend({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

/**
 * Lo que la IA reconoció en el documento. Nada de esto está guardado: es lo
 * que precarga el formulario de alta para que el profesional lo revise.
 *
 * Todos los datos del paciente son nullable —incluido el email, que la entidad
 * exige— porque una ficha en papel casi nunca lo trae y quien lo completa es
 * el profesional.
 */
export const fichaPacienteSugeridaDto = z.object({
  paciente: z.object({
    nombre: z.string().nullable(),
    apellido: z.string().nullable(),
    email: z.string().nullable(),
    telefono: z.string().nullable(),
    fechaNacimiento: z.string().nullable(),
    sexo: z.enum(SEXOS_BIOLOGICOS).nullable(),
    notas: z.string().nullable(),
  }),
  historiaClinica: z.object({
    motivoConsulta: z.string().nullable(),
    diagnosticos: z.string().nullable(),
    medicacion: z.string().nullable(),
    antecedentesPersonales: z.string().nullable(),
    antecedentesFamiliares: z.string().nullable(),
    habitos: z.string().nullable(),
    contexto: z.string().nullable(),
  }),
  camposPersonalizados: z.array(campoPersonalizadoHistoriaDto),
  alertas: z.array(alertaSugeridaDto),
  antropometria: antropometriaSugeridaDto.nullable(),
  laboratorios: z.array(laboratorioSugeridoDto),
});
export type FichaPacienteSugeridaDto = z.infer<typeof fichaPacienteSugeridaDto>;

/**
 * Alta confirmada por el profesional: el paciente con su cuenta, más los
 * registros asociados que decidió conservar de lo que trajo el documento.
 */
export const crearPacienteDesdeFichaDto = crearPacienteConAccesoDto.extend({
  historiaClinica: z
    .object({
      motivoConsulta: z.string().max(5000).nullable(),
      diagnosticos: z.string().max(5000).nullable(),
      medicacion: z.string().max(5000).nullable(),
      antecedentesPersonales: z.string().max(5000).nullable(),
      antecedentesFamiliares: z.string().max(5000).nullable(),
      habitos: z.string().max(5000).nullable(),
      contexto: z.string().max(5000).nullable(),
      camposPersonalizados: z.array(campoPersonalizadoHistoriaDto).default([]),
    })
    .optional()
    .nullable(),
  alertas: z.array(alertaSugeridaDto).max(50).default([]),
  antropometria: antropometriaSugeridaDto.optional().nullable(),
  laboratorios: z.array(laboratorioSugeridoDto).max(50).default([]),
  /** El documento leído, para que quede archivado en la ficha del paciente. */
  archivoId: z.string().min(1).optional().nullable(),
});
export type CrearPacienteDesdeFichaDto = z.infer<
  typeof crearPacienteDesdeFichaDto
>;

/** El paciente creado más lo que no se pudo guardar, para avisar en pantalla. */
export interface AltaDesdeFichaSalidaDto {
  paciente: PacienteSalidaDto;
  advertencias: string[];
}
