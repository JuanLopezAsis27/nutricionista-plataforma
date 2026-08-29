"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/** Encapsula las llamadas tRPC de planes nutricionales. */
export function usePlanes() {
  const utils = trpc.useUtils();
  const invalidar = useInvalidar();

  const crear = trpc.planes.crear.useMutation({
    onSuccess: () => {
      toast.success("Plan creado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizar = trpc.planes.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Plan actualizado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.planes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Plan eliminado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const archivar = trpc.planes.archivar.useMutation({
    onSuccess: (resultado) => {
      toast.success(
        resultado.archivado ? "Plan archivado." : "Plan restaurado.",
      );
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const crearDesdePlantilla = trpc.planes.crearDesdePlantilla.useMutation({
    onSuccess: () => {
      toast.success("Plan creado desde la plantilla.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const asignar = trpc.planes.asignarAPaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan asignado al paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const mover = trpc.planes.moverAGrupo.useMutation({
    onSuccess: () => {
      toast.success("Plan movido.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const crearGrupo = trpc.planes.crearGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta creada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const actualizarGrupo = trpc.planes.actualizarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta actualizada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminarGrupo = trpc.planes.eliminarGrupo.useMutation({
    onSuccess: () => {
      toast.success("Carpeta eliminada. Sus planes quedaron sin carpeta.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const desasignar = trpc.planes.desasignarDePaciente.useMutation({
    onSuccess: () => {
      toast.success("Plan finalizado para el paciente.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    utils,
    listar: trpc.planes.obtenerTodos.useQuery,
    listarPaginado: trpc.planes.listarPaginado.useQuery,
    obtenerPorId: trpc.planes.obtenerPorId.useQuery,
    delPaciente: trpc.planes.obtenerDelPaciente.useQuery,
    pacientesDelPlan: trpc.planes.obtenerPacientesDePlan.useQuery,
    historialDelPaciente: trpc.planes.obtenerHistorialDePaciente.useQuery,
    grupos: trpc.planes.obtenerGrupos.useQuery,
    miPlan: trpc.planes.obtenerMiPlan.useQuery,
    crear,
    actualizar,
    eliminar,
    archivar,
    crearDesdePlantilla,
    asignar,
    desasignar,
    mover,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  };
}
