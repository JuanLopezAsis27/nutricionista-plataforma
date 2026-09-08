"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Hook de los alimentos propios (Excel de macros). La importación masiva va
 * por el route handler multipart /api/alimentos/importar; la gestión manual
 * (listado, alta, edición y baja de a uno) y el vaciado van por tRPC.
 */
export function useAlimentosPropios() {
  const invalidar = useInvalidar();
  const [importando, setImportando] = useState(false);

  const estado = trpc.nutricion.estadoAlimentosPropios.useQuery;
  const listar = trpc.nutricion.listarAlimentosPropios.useQuery;

  const vaciar = trpc.nutricion.vaciarAlimentosPropios.useMutation({
    onSuccess: () => invalidar(),
  });

  const crear = trpc.nutricion.crearAlimentoPropio.useMutation({
    onSuccess: () => {
      toast.success("Alimento agregado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.nutricion.actualizarAlimentoPropio.useMutation({
    onSuccess: () => {
      toast.success("Alimento actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.nutricion.eliminarAlimentoPropio.useMutation({
    onSuccess: () => {
      toast.success("Alimento eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
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
      invalidar();
      return cuerpo.importados;
    } finally {
      setImportando(false);
    }
  }

  return {
    estado,
    listar,
    importar,
    importando,
    vaciar,
    crear,
    actualizar,
    eliminar,
  };
}
