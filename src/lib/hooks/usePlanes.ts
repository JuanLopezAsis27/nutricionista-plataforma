"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/** Encapsula las llamadas tRPC de planes nutricionales. */
export function usePlanes() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.planes.crear.useMutation({
    onSuccess: () => {
      toast.success("Plan creado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizar = trpc.planes.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Plan actualizado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminar = trpc.planes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Plan eliminado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const archivar = trpc.planes.archivar.useMutation({
    onSuccess: (resultado) => {
      toast.success(
        resultado.archivado ? "Plan archivado." : "Plan restaurado.",
      );
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const crearDesdePlantilla = trpc.planes.crearDesdePlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plan creado desde la plantilla.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const asignar = trpc.planes.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan asignado al paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const asignarAVarios = trpc.planes.asignarAVarios.useMutation({
    onSuccess: (resultados) => {
      const asignados = resultados.filter((r) => r.asignado).length;
      const fallidos = resultados.length - asignados;
      if (asignados > 0) {
        toast.success(
          `Plan asignado a ${asignados} paciente${asignados > 1 ? "s" : ""}.`,
        );
      }
      if (fallidos > 0) {
        toast.error(
          `No se pudo asignar a ${fallidos} paciente${fallidos > 1 ? "s" : ""}.`,
        );
      }
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const crearParaPaciente = trpc.planes.crearParaPaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan creado y asignado al paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const mover = trpc.planes.moverAGrupo.useMutation({
    onSuccess: () => {
      toast.success("Plan movido.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const crearGrupo = trpc.planes.crearGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta creada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizarGrupo = trpc.planes.actualizarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta actualizada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminarGrupo = trpc.planes.eliminarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta eliminada. Sus planes quedaron sin carpeta.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const desasignar = trpc.planes.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan desasignado del paciente.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    utils,
    listar: trpc.planes.obtenerTodos.useQuery,
    listarPaginado: trpc.planes.listarPaginado.useQuery,
    obtenerPorId: trpc.planes.obtenerPorId.useQuery,
    delPaciente: trpc.planes.obtenerDelPaciente.useQuery,
    pacientesDelPlan: trpc.planes.obtenerPacientesDePlan.useQuery,
    grupos: trpc.planes.obtenerGrupos.useQuery,
    misPlanes: trpc.planes.obtenerMisPlanes.useQuery,
    crear,
    actualizar,
    eliminar,
    archivar,
    crearDesdePlantilla,
    asignar,
    asignarAVarios,
    crearParaPaciente,
    desasignar,
    mover,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  };
}
