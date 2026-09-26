"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { avisarError } from "@/lib/errores";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Los consultorios donde se atiende el paciente y el cambio entre ellos
 * (migración 78, ver docs/CUENTAS-PACIENTE.md).
 *
 * Cambiar NO es una mutación de tRPC: reemite la cookie de sesión, así que va
 * por `/api/autenticacion/consultorio`. Después hay que renovar las TRES
 * copias de la sesión que tiene el navegador: la de `useSession` (la leen el
 * chat y el tiempo real), las páginas de servidor (`router.refresh`) y la
 * caché de React Query, que tiene todo lo del consultorio anterior. Se va a
 * `/mi-inicio` porque la pantalla abierta puede ser algo que en el otro
 * consultorio no existe (un plan, una receta).
 */
export function useConsultorios() {
  const [cambiando, setCambiando] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();
  const invalidar = useInvalidar();

  async function cambiar(pacienteId: string): Promise<void> {
    setCambiando(pacienteId);
    try {
      const respuesta = await fetch("/api/autenticacion/consultorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId }),
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(cuerpo?.error ?? "No se pudo cambiar de consultorio.");
      }
      // Sin datos: el servidor ya eligió; esto solo trae el JWT nuevo.
      await update();
      router.push("/mi-inicio");
      router.refresh();
      invalidar();
    } catch (error) {
      avisarError(error, "No se pudo cambiar de consultorio.");
    } finally {
      setCambiando(null);
    }
  }

  return {
    misConsultorios: trpc.autenticacion.misConsultorios.useQuery,
    cambiar,
    /** La ficha a la que se está cambiando, mientras dura el pedido. */
    cambiando,
  };
}
