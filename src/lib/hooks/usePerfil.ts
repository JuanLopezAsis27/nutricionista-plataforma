"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

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
    onError: (error) => toast.error(error.message),
  });

  // Sin `onError` con toast: los errores de este formulario son de CAMPO —la
  // contraseña actual no coincide, la nueva es previsible— y van debajo del
  // input que hay que corregir, no en una notificación que tapa el formulario.
  const cambiarPassword = trpc.perfil.cambiarPassword.useMutation();

  return {
    mio: trpc.perfil.mio.useQuery,
    cambiarFoto,
    cambiarPassword,
  };
}
