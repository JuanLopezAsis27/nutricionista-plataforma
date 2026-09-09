import { z } from "zod";
import { ROLES_USUARIO } from "@/dominio/entidades/Usuario";
import { passwordNuevaDto } from "./password";

/** DTOs de "Mi perfil" — la cuenta propia: foto y contraseña. */

export const perfilSalidaDto = z.object({
  usuarioId: z.string(),
  email: z.string(),
  rol: z.enum(ROLES_USUARIO),
  /** Nombre para mostrar; sale de la ficha o de la configuración, no de Usuario. */
  nombre: z.string(),
  fotoArchivoId: z.string().nullable(),
});
export type PerfilSalidaDto = z.infer<typeof perfilSalidaDto>;

/**
 * Elegir la foto. `archivoId` en null es "quitar la foto que tenía": son la
 * misma operación —a qué archivo apunta la cuenta— y separarlas en dos
 * endpoints obligaría a repetir el borrado de la anterior en los dos.
 */
export const cambiarFotoPerfilDto = z.object({
  archivoId: z.string().min(1).nullable(),
});
export type CambiarFotoPerfilDto = z.infer<typeof cambiarFotoPerfilDto>;

/**
 * Cambiar la contraseña desde la sesión abierta.
 *
 * Tres campos y no dos. La ACTUAL prueba que quien escribe es el dueño de la
 * cuenta y no alguien que encontró la sesión abierta; la verifica el caso de
 * uso contra el hash, que es lo único que puede hacerlo.
 *
 * La CONFIRMACIÓN se valida acá y no en el formulario a propósito. Es una regla
 * de la operación, no del widget: el día que la misma mutación se llame desde
 * la app de Capacitor o desde un script, "escribila dos veces" tiene que seguir
 * valiendo. Además hace que el mensaje de "no coinciden" salga del mismo lugar
 * que el resto de los errores de validación.
 *
 * `path` en cada refine es lo que hace que el error se pinte DEBAJO del campo
 * que hay que corregir; sin eso, Zod lo cuelga de la raíz del formulario y
 * react-hook-form no lo muestra en ningún lado.
 */
export const cambiarPasswordDto = z
  .object({
    passwordActual: z.string().min(1, "Escribí tu contraseña actual"),
    passwordNueva: passwordNuevaDto,
    confirmacion: z.string().min(1, "Repetí la contraseña nueva"),
  })
  .refine((datos) => datos.passwordNueva === datos.confirmacion, {
    message: "Las dos contraseñas nuevas no coinciden.",
    path: ["confirmacion"],
  })
  .refine((datos) => datos.passwordNueva !== datos.passwordActual, {
    message: "La contraseña nueva tiene que ser distinta de la actual.",
    path: ["passwordNueva"],
  });
export type CambiarPasswordDto = z.infer<typeof cambiarPasswordDto>;
