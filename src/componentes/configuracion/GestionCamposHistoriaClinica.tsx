"use client";

import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { GestionCamposPersonalizados } from "./GestionCamposPersonalizados";

/**
 * Campos que el consultorio agrega a la historia clínica de TODOS sus
 * pacientes.
 *
 * Los siete campos fijos son el mínimo común; acá se declara lo que sigue este
 * profesional en particular. La mecánica —renombrar conserva lo cargado,
 * borrar saca el campo del formulario pero no los valores— la pone
 * `GestionCamposPersonalizados`, que comparte con los campos de evolución.
 */
export function GestionCamposHistoriaClinica() {
  const { obtenerCamposHistoria, guardarCampoHistoria, eliminarCampoHistoria } =
    useEvaluacion();
  const campos = obtenerCamposHistoria();

  return (
    <GestionCamposPersonalizados
      titulo="Campos de la historia clínica"
      descripcion="Se agregan a los campos fijos y aparecen en la historia clínica de todos tus pacientes. La descripción también le sirve a la IA para encontrar el dato cuando cargás un paciente desde un documento."
      vacio="Todavía no agregaste campos propios. La historia clínica muestra solo los siete campos fijos."
      placeholderNombre="Adherencia previa"
      avisoRenombre="Renombrar el campo conserva lo que ya esté cargado en las fichas."
      avisoBorrado="El campo deja de pedirse en la historia clínica de tus pacientes. Lo que ya esté cargado en cada ficha se conserva y se sigue viendo."
      campos={campos.data}
      cargando={campos.isLoading}
      onGuardar={(datos, alTerminar) =>
        guardarCampoHistoria.mutate(datos, { onSuccess: alTerminar })
      }
      guardando={guardarCampoHistoria.isPending}
      onEliminar={(id) => eliminarCampoHistoria.mutate({ id })}
      eliminando={eliminarCampoHistoria.isPending}
    />
  );
}
