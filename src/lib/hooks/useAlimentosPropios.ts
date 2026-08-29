"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Hook de los alimentos propios (Excel de macros). La importación va por el
 * route handler multipart /api/alimentos/importar; el estado y el vaciado por
 * tRPC. Tras importar/vaciar, invalida el estado para refrescar la UI.
 */
export function useAlimentosPropios() {
  const utils = trpc.useUtils();
  const [importando, setImportando] = useState(false);

  const estado = trpc.nutricion.estadoAlimentosPropios.useQuery;
  const vaciar = trpc.nutricion.vaciarAlimentosPropios.useMutation({
    onSuccess: () => utils.nutricion.estadoAlimentosPropios.invalidate(),
  });

  async function importar(archivo: File): Promise<number> {
    setImportando(true);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      const respuesta = await fetch("/api/alimentos/importar", {
        method: "POST",
        body: formulario,
      });
      const cuerpo = (await respuesta.json()) as
        { importados: number } | { error: string };
      if (!respuesta.ok || "error" in cuerpo) {
        throw new Error(
          "error" in cuerpo ? cuerpo.error : "No se pudo importar la planilla.",
        );
      }
      await utils.nutricion.estadoAlimentosPropios.invalidate();
      return cuerpo.importados;
    } finally {
      setImportando(false);
    }
  }

  return { estado, importar, importando, vaciar };
}
