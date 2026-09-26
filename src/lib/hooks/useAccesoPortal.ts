"use client";

import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Llamadas tRPC del acceso al portal de un paciente (migración 80): su cuenta,
 * la contraseña y los códigos de invitación.
 *
 * Las mutaciones no llevan toast de éxito: su resultado son credenciales o un
 * código que la pantalla muestra para copiar, y un toast que se va solo no es
 * lugar para eso.
 */
export function useAccesoPortal() {
  const invalidar = useInvalidar();
  const alTerminar = {
    onSuccess: () => invalidar(),
    onError: (error: unknown) => avisarError(error),
  };

  return {
    obtener: trpc.accesoPortal.obtener.useQuery,
    sugerirNombreUsuario: trpc.accesoPortal.sugerirNombreUsuario.useQuery,
    revisarEmail: trpc.accesoPortal.revisarEmail.useQuery,
    darAcceso: trpc.accesoPortal.darAcceso.useMutation(alTerminar),
    generarInvitacion:
      trpc.accesoPortal.generarInvitacion.useMutation(alTerminar),
    restablecerPassword:
      trpc.accesoPortal.restablecerPassword.useMutation(alTerminar),
    cambiarUsuario: trpc.accesoPortal.cambiarUsuario.useMutation(alTerminar),
    previsualizarInvitacion:
      trpc.accesoPortal.previsualizarInvitacion.useMutation({
        onError: (error) => avisarError(error),
      }),
    canjearInvitacion:
      trpc.accesoPortal.canjearInvitacion.useMutation(alTerminar),
  };
}
