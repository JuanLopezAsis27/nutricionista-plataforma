"use client";

import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Encapsula las llamadas tRPC de "Mi perfil" (los dos roles).
 *
 * `cambiarFoto` invalida TODO como el resto de las mutaciones (ver
 * `useInvalidar`), y acá es especialmente necesario: la foto aparece en la
 * barra superior, en la bandeja de mensajes y en el hilo del otro extremo, que
 * son tres routers distintos del que se acaba de mutar.
 */
export function usePerfil() {
  const invalidar = useInvalidar();

  const cambiarFoto = trpc.perfil.cambiarFoto.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  // Sin `onError` con toast: los errores de este formulario son de CAMPO —la
  // contraseña actual no coincide, la nueva es previsible— y van debajo del
  // input que hay que corregir, no en una notificación que tapa el formulario.
  //
  // Sí invalida al terminar: cambiarla apaga el aviso de contraseña
  // provisional (`AvisoContrasenaProvisional`), que lee `perfil.mio`.
  const cambiarPassword = trpc.perfil.cambiarPassword.useMutation({
    onSuccess: () => invalidar(),
  });

  return {
    mio: trpc.perfil.mio.useQuery,
    cambiarFoto,
    cambiarPassword,
  };
}
