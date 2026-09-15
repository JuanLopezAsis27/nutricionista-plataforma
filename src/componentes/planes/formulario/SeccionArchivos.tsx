"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ArchivoDelPlanDto } from "@/aplicacion/dtos/plan.dto";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { FormField, FormItem, FormMessage } from "@/componentes/ui/form";
import { FilaArchivo, aFichaArchivo } from "./FilaArchivo";
import type { DatosFormulario } from "./esquema";

/**
 * PDF o Word: los dos formatos que el paciente puede leer adentro de la app
 * (el Word se le muestra convertido, ver `VisorArchivo`).
 */
const ACEPTA_DOCUMENTO =
  ".pdf,.doc,.docx,application/pdf,application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Los archivos que SON el plan. Solo en modalidad PDF (la del plan subido como
 * archivo, sea PDF o Word).
 *
 * Son VARIOS y no uno porque un plan armado afuera suele venir repartido —la
 * pauta en un PDF, las equivalencias en otro—, y con un solo campo el resto
 * terminaba de anexo abajo, leído como material de apoyo de sí mismo. El orden
 * en que se suben es el orden en que el paciente los lee.
 *
 * Recibe el `form` completo y no solo el `control` porque necesita
 * `setValue`: las fichas de los archivos viven en estado del componente (para
 * mostrar nombre y tamaño) mientras que lo que se valida son los ids, que sí
 * están en el formulario. Los dos tienen que moverse juntos.
 */
export function SeccionDocumentosDelPlan({
  form,
  documentos,
  alCambiar,
}: {
  form: UseFormReturn<DatosFormulario>;
  documentos: ArchivoDelPlanDto[];
  alCambiar: (documentos: ArchivoDelPlanDto[]) => void;
}) {
  /** Mueve las fichas y los ids juntos: el formulario valida los segundos. */
  function fijar(nuevos: ArchivoDelPlanDto[]) {
    alCambiar(nuevos);
    form.setValue(
      "documentoIds",
      nuevos.map((documento) => documento.id),
      { shouldValidate: true },
    );
  }

  return (
    <FormField
      control={form.control}
      name="documentoIds"
      render={() => (
        <FormItem>
          <fieldset className="space-y-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">
              El plan (PDF o Word)
            </legend>
            <p className="text-sm text-muted-foreground">
              Estos archivos SON el plan: es lo que el paciente ve al entrar a
              «Mi plan». Podés subir más de uno y se muestran en este orden.
            </p>
            {documentos.length > 0 && (
              <ul className="space-y-2">
                {documentos.map((documento) => (
                  <li key={documento.id}>
                    <FilaArchivo
                      archivo={documento}
                      etiquetaQuitar={`Quitar ${documento.nombreOriginal} del plan`}
                      onQuitar={() =>
                        fijar(documentos.filter((d) => d.id !== documento.id))
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
            <SubidorArchivo
              contexto="plan"
              accept={ACEPTA_DOCUMENTO}
              sinVistaPrevia
              onSubido={(archivo) =>
                fijar([...documentos, aFichaArchivo(archivo)])
              }
            />
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
 * subido como archivo.
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
          ? "PDFs o documentos de Word que acompañan al plan: la lista de compras, un instructivo, un recetario. El paciente los ve al final de su plan."
          : "PDFs o documentos de Word que acompañan al plan sin ser parte de él. El paciente los ve debajo del plan."}
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
        accept={ACEPTA_DOCUMENTO}
        onSubido={(archivo) => alCambiar([...adjuntos, aFichaArchivo(archivo)])}
      />
    </fieldset>
  );
}
