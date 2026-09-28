"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * De qué lista de alimentos se trata.
 *
 *  - `consultorio`: la propia del profesional, que la gestiona él.
 *  - `plataforma`: la predeterminada, gestionada por el SUPERADMIN (migración 82).
 *  - `predeterminados`: la misma lista de la plataforma vista desde un
 *    consultorio, que la usa pero no la edita.
 */
export type OrigenAlimentos = "consultorio" | "plataforma" | "predeterminados";

const URL_IMPORTAR: Record<OrigenAlimentos, string | null> = {
  consultorio: "/api/alimentos/importar",
  plataforma: "/api/catalogo/alimentos/importar",
  predeterminados: null,
};

/** Dónde vive la imagen de un alimento de cada lista (null: no se cambia desde acá). */
const URL_IMAGENES: Record<OrigenAlimentos, string | null> = {
  consultorio: "/api/alimentos",
  plataforma: "/api/catalogo/alimentos",
  predeterminados: null,
};

/** La fuente con la que el buscador marca a los alimentos de cada lista. */
export const FUENTE_DE_ORIGEN: Record<OrigenAlimentos, "PROPIO" | "BASE"> = {
  consultorio: "PROPIO",
  plataforma: "BASE",
  predeterminados: "BASE",
};

/**
 * Hook de una lista de alimentos (macros por 100 g). La importación masiva va
 * por un route handler multipart; la gestión manual (listado, alta, edición y
 * baja de a uno) y el vaciado van por tRPC.
 *
 * Las mutaciones de las dos listas se declaran siempre —los hooks no pueden
 * ser condicionales— y se usa la del origen pedido.
 */
export function useAlimentosPropios(origen: OrigenAlimentos = "consultorio") {
  const invalidar = useInvalidar();
  const [importando, setImportando] = useState(false);
  const deLaPlataforma = origen === "plataforma";

  const estado =
    origen === "plataforma"
      ? trpc.superadmin.estadoAlimentosBase.useQuery
      : trpc.nutricion.estadoAlimentosPropios.useQuery;
  const listar =
    origen === "plataforma"
      ? trpc.superadmin.listarAlimentosBase.useQuery
      : origen === "predeterminados"
        ? trpc.nutricion.listarAlimentosBase.useQuery
        : trpc.nutricion.listarAlimentosPropios.useQuery;

  // Dónde se usa un alimento: la lista del consultorio cuenta en el suyo; el
  // catálogo, en todos (alcance global del SUPERADMIN). Los predeterminados
  // vistos desde un consultorio no se editan, así que no lo necesitan.
  const usos =
    origen === "plataforma"
      ? trpc.superadmin.usosDeAlimentoBase.useQuery
      : trpc.nutricion.usosDeAlimento.useQuery;
  /** Solo la lista del consultorio: si lo que carga ya está en la plataforma. */
  const coincidenciaEnCatalogo = trpc.nutricion.coincidenciaEnCatalogo.useQuery;

  const alTerminar = (mensaje: string) => ({
    onSuccess: () => {
      toast.success(mensaje);
      invalidar();
    },
    onError: (error: Parameters<typeof avisarError>[0]) => avisarError(error),
  });

  const vaciarPropios = trpc.nutricion.vaciarAlimentosPropios.useMutation({
    onSuccess: () => invalidar(),
  });
  const vaciarBase = trpc.superadmin.vaciarAlimentosBase.useMutation({
    onSuccess: () => invalidar(),
  });
  const crearPropio = trpc.nutricion.crearAlimentoPropio.useMutation(
    alTerminar("Alimento agregado."),
  );
  const crearBase = trpc.superadmin.crearAlimentoBase.useMutation(
    alTerminar("Alimento agregado al catálogo."),
  );
  const actualizarPropio = trpc.nutricion.actualizarAlimentoPropio.useMutation(
    alTerminar("Alimento actualizado."),
  );
  const actualizarBase = trpc.superadmin.actualizarAlimentoBase.useMutation(
    alTerminar("Alimento actualizado."),
  );
  const eliminarPropio = trpc.nutricion.eliminarAlimentoPropio.useMutation(
    alTerminar("Alimento eliminado."),
  );
  const eliminarBase = trpc.superadmin.eliminarAlimentoBase.useMutation(
    alTerminar("Alimento eliminado del catálogo."),
  );

  async function importar(
    archivo: File,
  ): Promise<{ importados: number; repetidos: number; enPlataforma: number }> {
    const url = URL_IMPORTAR[origen];
    if (!url) throw new Error("Esta lista no se importa desde acá.");
    setImportando(true);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      const respuesta = await fetch(url, {
        method: "POST",
        body: formulario,
      });
      const cuerpo = (await respuesta.json()) as
        | { importados: number; repetidos: number; enPlataforma: number }
        | { error: string };
      if (!respuesta.ok || "error" in cuerpo) {
        throw new Error(
          "error" in cuerpo ? cuerpo.error : "No se pudo importar la planilla.",
        );
      }
      invalidar();
      return cuerpo;
    } finally {
      setImportando(false);
    }
  }

  /**
   * Pone, reemplaza o (con null) quita la imagen de un alimento (multipart:
   * no pasa por tRPC). Devuelve la versión nueva de la imagen.
   * Los errores del servidor ya vienen redactados para el usuario.
   */
  async function cambiarImagen(
    id: string,
    archivo: File | null,
  ): Promise<string | null> {
    const base = URL_IMAGENES[origen];
    if (!base) throw new Error("Esta lista no se edita desde acá.");
    let respuesta: Response;
    if (archivo) {
      const formulario = new FormData();
      formulario.append("imagen", archivo);
      respuesta = await fetch(`${base}/${id}/imagen`, {
        method: "POST",
        body: formulario,
      });
    } else {
      respuesta = await fetch(`${base}/${id}/imagen`, { method: "DELETE" });
    }
    if (!respuesta.ok) {
      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(cuerpo.error ?? "No se pudo guardar la imagen.");
    }
    invalidar();
    // La versión nueva: quien muestra la imagen la necesita para no ver la
    // vieja de la caché.
    const alimento = (await respuesta.json()) as {
      imagenVersion: string | null;
    };
    return alimento.imagenVersion;
  }

  return {
    estado,
    listar,
    usos,
    coincidenciaEnCatalogo,
    importar,
    cambiarImagen,
    importando,
    vaciar: deLaPlataforma ? vaciarBase : vaciarPropios,
    crear: deLaPlataforma ? crearBase : crearPropio,
    actualizar: deLaPlataforma ? actualizarBase : actualizarPropio,
    eliminar: deLaPlataforma ? eliminarBase : eliminarPropio,
  };
}
