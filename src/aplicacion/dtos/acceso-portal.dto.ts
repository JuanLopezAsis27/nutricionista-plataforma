import { z } from "zod";
import { passwordNuevaDto } from "./password";
import {
  LARGO_MAXIMO_NOMBRE_USUARIO,
  REGLA_NOMBRE_USUARIO,
  esNombreUsuarioValido,
  normalizarNombreUsuario,
} from "@/dominio/servicios/nombreUsuario";

/**
 * DTOs del acceso al portal de un paciente (migración 80): su cuenta, el
 * nombre de usuario y los códigos de invitación. Ver docs/CUENTAS-PACIENTE.md.
 */

/**
 * Nombre de usuario: se normaliza (minúsculas, sin espacios alrededor) y se
 * valida con la misma regla que la entidad y el CHECK de la base.
 */
export const nombreUsuarioDto = z
  .string()
  .max(LARGO_MAXIMO_NOMBRE_USUARIO + 10)
  .transform(normalizarNombreUsuario)
  .refine(esNombreUsuarioValido, REGLA_NOMBRE_USUARIO);

/** Con qué va a entrar: usuario opcional (según el caso) y contraseña. */
export const datosAccesoPortalDto = z.object({
  nombreUsuario: nombreUsuarioDto.optional().nullable(),
  password: passwordNuevaDto,
});
export type DatosAccesoPortalDto = z.infer<typeof datosAccesoPortalDto>;

export const darAccesoPortalDto = datosAccesoPortalDto.extend({
  pacienteId: z.string().min(1),
});
export type DarAccesoPortalDto = z.infer<typeof darAccesoPortalDto>;

export const pacienteAccesoDto = z.object({ pacienteId: z.string().min(1) });

export const generarInvitacionPortalDto = z.object({
  pacienteId: z.string().min(1),
  enviarPorEmail: z.boolean().default(false),
});
export type GenerarInvitacionPortalDto = z.infer<
  typeof generarInvitacionPortalDto
>;

/** La contraseña nueva: generada al azar o escrita por el profesional. */
export const restablecerPasswordPacienteDto = z.object({
  pacienteId: z.string().min(1),
  contrasena: z.discriminatedUnion("modo", [
    z.object({ modo: z.literal("GENERADA") }),
    z.object({ modo: z.literal("MANUAL"), valor: passwordNuevaDto }),
  ]),
});
export type RestablecerPasswordPacienteDto = z.infer<
  typeof restablecerPasswordPacienteDto
>;

/**
 * El usuario que le pone (o saca, con "" o null) el profesional a una cuenta
 * exclusiva de su consultorio.
 */
export const cambiarUsuarioPacienteDto = z.object({
  pacienteId: z.string().min(1),
  nombreUsuario: z
    .union([z.literal(""), nombreUsuarioDto])
    .nullable()
    .transform((valor) => valor || null),
});
export type CambiarUsuarioPacienteDto = z.infer<
  typeof cambiarUsuarioPacienteDto
>;

/** El email que se está escribiendo en el formulario de un paciente. */
export const revisarEmailPacienteDto = z.object({
  email: z.string().trim().email(),
  /** Al editar, la propia ficha no cuenta como repetida. */
  pacienteId: z.string().min(1).optional(),
});

export interface RevisionEmailSalidaDto {
  /** Otras fichas del consultorio con ese email de contacto. */
  otrasFichas: { pacienteId: string; nombre: string }[];
  /**
   * Ese email ya es con lo que entra otra cuenta de ESTE consultorio: el
   * paciente nuevo no puede usarlo para entrar y necesita un usuario.
   */
  esIngresoDeOtraCuenta: boolean;
  /** De quién es esa cuenta, visto desde este consultorio. */
  ingresoDe: string | null;
}

export const sugerirNombreUsuarioDto = z.object({
  nombre: z.string().max(100),
  apellido: z.string().max(100),
});

/** El código tal como lo tipea la persona (se normaliza en el dominio). */
export const codigoInvitacionDto = z.object({
  codigo: z.string().trim().min(1, "Ingresá el código").max(20),
});

// --- Salidas ------------------------------------------------------------------

export interface AccesoPortalSalidaDto {
  estado: "SIN_CUENTA" | "EXCLUSIVA" | "COMPARTIDA";
  email: string | null;
  nombreUsuario: string | null;
  activa: boolean;
  passwordProvisional: boolean;
  invitacionVigenteHasta: Date | null;
}

/** Una invitación recién emitida: el código se ve UNA vez. */
export interface InvitacionEmitidaSalidaDto {
  codigo: string;
  expiraEn: Date;
  /** A qué email salió, o null si no se mandó. */
  enviadaA: string | null;
  /** Por qué no salió el email, si se pidió y falló. */
  falloEnvio: string | null;
}

/** Credenciales para entregar en mano: se muestran una vez. */
export interface CredencialesPortalSalidaDto {
  identificador: string;
  contrasena: string;
}

/**
 * Cómo quedó el acceso al portal después del alta o de darlo desde la ficha.
 * `CUENTA_NUEVA` lleva con qué entra; `INVITACION`, el código emitido.
 */
export type ResultadoAccesoSalidaDto =
  | { tipo: "CUENTA_NUEVA"; identificador: string }
  | { tipo: "INVITACION"; invitacion: InvitacionEmitidaSalidaDto | null }
  | { tipo: "SIN_CUENTA" };

export interface VistaInvitacionSalidaDto {
  nombreProfesional: string;
  nombrePaciente: string;
}
