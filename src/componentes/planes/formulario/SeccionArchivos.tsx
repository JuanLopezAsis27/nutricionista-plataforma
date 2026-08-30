"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ArchivoDelPlanDto } from "@/aplicacion/dtos/plan.dto";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { FormField, FormItem, FormMessage } from "@/componentes/ui/form";
import { FilaArchivo, aFichaArchivo } from "./FilaArchivo";
import type { DatosFormulario } from "./esquema";

/**
 * El archivo que ES el plan. Solo en modalidad PDF.
 *
 * Recibe el `form` completo y no solo el `control` porque necesita
 * `setValue`: la ficha del archivo vive en estado del componente (para mostrar
 * nombre y tamaño) mientras que lo que se valida es el id, que sí está en el
 * formulario. Los dos tienen que moverse juntos.
 */
export function SeccionArchivoPrincipal({
  form,
  principal,
  alCambiar,
}: {
  form: UseFormReturn<DatosFormulario>;
  principal: ArchivoDelPlanDto | null;
  alCambiar: (archivo: ArchivoDelPlanDto | null) => void;
}) {
  return (
    <FormField
      control={form.control}
      name="archivoPrincipalId"
      render={() => (
        <FormItem>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">
              El plan (PDF)
            </legend>
            <p className="text-sm text-muted-foreground">
              Este archivo ES el plan: es lo que el paciente ve al entrar a «Mi
              plan».
            </p>
            {principal ? (
              <FilaArchivo
                archivo={principal}
                etiquetaQuitar="Quitar el archivo del plan"
                onQuitar={() => {
                  alCambiar(null);
                  form.setValue("archivoPrincipalId", null, {
                    shouldValidate: true,
                  });
                }}
              />
            ) : (
              <SubidorArchivo
                contexto="plan"
                accept="application/pdf"
                onSubido={(archivo) => {
                  alCambiar(aFichaArchivo(archivo));
                  form.setValue("archivoPrincipalId", archivo.id, {
                    shouldValidate: true,
                  });
                }}
              />
            )}
            <FormMessage />
          </fieldset>
        </FormItem>
      )}
    />
  );
}

/**
 * Material de apoyo. Va en las DOS modalidades: acompaña al plan, no lo
 * reemplaza, y eso vale igual para un plan cargado en la app que para uno
 * subido en PDF.
 */
export function SeccionAdjuntos({
  esApp,
  adjuntos,
  alCambiar,
}: {
  esApp: boolean;
  adjuntos: ArchivoDelPlanDto[];
  alCambiar: (adjuntos: ArchivoDelPlanDto[]) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">
        Material adjunto (opcional)
      </legend>
      <p className="text-sm text-muted-foreground">
        {esApp
          ? "PDFs que acompañan al plan: la lista de compras, un instructivo, un recetario. El paciente los ve al final de su plan."
          : "PDFs que acompañan al plan principal. El paciente los ve debajo del plan."}
      </p>

      {adjuntos.length > 0 && (
        <ul className="space-y-2">
          {adjuntos.map((adjunto) => (
            <li key={adjunto.id}>
              <FilaArchivo
                archivo={adjunto}
                etiquetaQuitar={`Quitar ${adjunto.nombreOriginal}`}
                onQuitar={() =>
                  alCambiar(adjuntos.filter((a) => a.id !== adjunto.id))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <SubidorArchivo
        contexto="plan"
        accept="application/pdf"
        onSubido={(archivo) => alCambiar([...adjuntos, aFichaArchivo(archivo)])}
      />
    </fieldset>
  );
}
