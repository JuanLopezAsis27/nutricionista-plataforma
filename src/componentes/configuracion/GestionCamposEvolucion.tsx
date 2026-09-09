"use client";

import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { GestionCamposPersonalizados } from "./GestionCamposPersonalizados";

/**
 * Campos que el consultorio agrega a las EVOLUCIONES de todos sus pacientes.
 *
 * Es una lista aparte de la de historia clínica a propósito: aquella se carga
 * una vez y describe de dónde viene el paciente, esta se pregunta en cada
 * consulta. Un campo como «antecedentes familiares» no se repite consulta a
 * consulta, y uno como «horas de pantalla esta semana» no se congela en el
 * alta.
 */
export function GestionCamposEvolucion() {
  const {
    obtenerCamposEvolucion,
    guardarCampoEvolucion,
    eliminarCampoEvolucion,
  } = useEvaluacion();
  const campos = obtenerCamposEvolucion();

  return (
    <GestionCamposPersonalizados
      titulo="Campos de las evoluciones"
      descripcion="Se agregan a los campos fijos del control (cumplimiento, entrenamiento, deposiciones, orina, descanso, indispuesta y se percibe) y se piden en cada consulta. La descripción también le sirve a la IA para encontrar el dato cuando leés un documento de seguimiento."
      vacio="Todavía no agregaste campos propios. La evolución muestra solo los siete campos fijos."
      placeholderNombre="Suplementación"
      avisoRenombre="Renombrar el campo conserva lo que ya esté cargado en las evoluciones."
      avisoBorrado="El campo deja de pedirse al cargar una evolución. Lo que ya esté escrito en las consultas anteriores se conserva y se sigue viendo."
      campos={campos.data}
      cargando={campos.isLoading}
      onGuardar={(datos, alTerminar) =>
        guardarCampoEvolucion.mutate(datos, { onSuccess: alTerminar })
      }
      guardando={guardarCampoEvolucion.isPending}
      onEliminar={(id) => eliminarCampoEvolucion.mutate({ id })}
      eliminando={eliminarCampoEvolucion.isPending}
    />
  );
}
