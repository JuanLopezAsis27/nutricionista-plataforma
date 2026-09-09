"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Encapsula todas las llamadas tRPC de pacientes.
 *
 * Las queries se devuelven como referencias de hook (el componente las invoca
 * con sus argumentos). Las mutations vienen preconfiguradas con toasts e
 * invalidación de la caché.
 */
export function usePacientes() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.pacientes.crear.useMutation({
    onSuccess: () => {
      toast.success("Paciente creado correctamente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.pacientes.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Paciente actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.pacientes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Paciente eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  /**
   * Lee la ficha subida. Sin `conToasts`: no persiste nada, así que no invalida
   * caché ni anuncia un éxito genérico —el formulario avisa al precargar—.
   */
  const interpretarFicha = trpc.pacientes.interpretarFicha.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const crearDesdeFicha = trpc.pacientes.crearDesdeFicha.useMutation({
    onSuccess: (resultado) => {
      toast.success("Paciente creado a partir del documento.");
      // Lo que no se pudo guardar se avisa uno por uno: el paciente YA existe
      // y el profesional tiene que saber qué le falta cargar a mano.
      for (const advertencia of resultado.advertencias) {
        toast.warning(advertencia);
      }
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.pacientes.obtenerTodos.useQuery,
    obtenerPorId: trpc.pacientes.obtenerPorId.useQuery,
    crear,
    actualizar,
    eliminar,
    interpretarFicha,
    crearDesdeFicha,
  };
}
