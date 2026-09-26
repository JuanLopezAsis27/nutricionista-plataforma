"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Aviso de que el alta VINCULÓ una cuenta que ya existía: la persona es
 * paciente de otro consultorio y entra con su contraseña de siempre, así que
 * la que se cargó en el formulario no se usó. No dice de qué consultorio: eso
 * es de la otra ficha.
 */
const AVISO_CUENTA_EXISTENTE =
  "Ya tenía una cuenta en la plataforma: se la vinculó a esta ficha y sigue entrando con su contraseña de siempre (la que cargaste no se usó).";

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
    onSuccess: (resultado) => {
      toast.success("Paciente creado correctamente.");
      if (resultado.cuentaExistente) toast.info(AVISO_CUENTA_EXISTENTE);
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const actualizar = trpc.pacientes.actualizar.useMutation({
    onSuccess: () => {
      toast.success("Paciente actualizado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminar = trpc.pacientes.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Paciente eliminado.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  /**
   * Lee la ficha subida. Sin `conToasts`: no persiste nada, así que no invalida
   * caché ni anuncia un éxito genérico —el formulario avisa al precargar—.
   */
  const interpretarFicha = trpc.pacientes.interpretarFicha.useMutation({
    onError: (error) => avisarError(error),
  });

  const crearDesdeFicha = trpc.pacientes.crearDesdeFicha.useMutation({
    onSuccess: (resultado) => {
      toast.success("Paciente creado a partir del documento.");
      if (resultado.cuentaExistente) toast.info(AVISO_CUENTA_EXISTENTE);
      // Lo que no se pudo guardar se avisa uno por uno: el paciente YA existe
      // y el profesional tiene que saber qué le falta cargar a mano.
      for (const advertencia of resultado.advertencias) {
        toast.warning(advertencia);
      }
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const enviarBienvenidaManual =
    trpc.pacientes.enviarBienvenidaManual.useMutation({
      onSuccess: (resultado) => {
        if (resultado.enviados > 0) {
          toast.success(
            `Bienvenida enviada a ${resultado.enviados} paciente${
              resultado.enviados === 1 ? "" : "s"
            }.`,
          );
        }
        // Cuentas compartidas con otro consultorio: salió la bienvenida pero
        // sin contraseña, porque esa no la puede fijar este consultorio.
        const compartidas = resultado.detalles.filter(
          (d) => d.estado === "ENVIADO" && d.motivo,
        ).length;
        if (compartidas > 0) {
          toast.info(
            `${compartidas} paciente${
              compartidas === 1 ? " comparte" : "s comparten"
            } su cuenta con otro consultorio: la bienvenida salió sin contraseña y siguen entrando con la suya.`,
          );
        }
        // Los que ya la tenían no se avisan acá: la pantalla ofrece
        // reenviársela con su propia confirmación.
        if (resultado.omitidos > 0) {
          toast.info(
            `${resultado.omitidos} paciente${
              resultado.omitidos === 1 ? "" : "s"
            } sin email o sin plantilla de bienvenida.`,
          );
        }
        if (resultado.fallidos > 0) {
          toast.error(
            `No se pudo enviar a ${resultado.fallidos} paciente${
              resultado.fallidos === 1 ? "" : "s"
            }.`,
          );
        }
        invalidar();
      },
      onError: (error) => avisarError(error),
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
    enviarBienvenidaManual,
    bienvenidaPideContrasena: trpc.pacientes.bienvenidaPideContrasena.useQuery,
  };
}
