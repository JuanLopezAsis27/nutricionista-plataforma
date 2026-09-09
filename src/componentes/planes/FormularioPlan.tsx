"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  PlanSalidaDto,
  ArchivoDelPlanDto,
} from "@/aplicacion/dtos/plan.dto";
import type { ModalidadPlan } from "@/dominio/entidades/PlanNutricional";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import {
  esquema,
  aNumero,
  FRANJAS_INICIALES,
  SIN_RECETA,
  SIN_CARPETA,
  type DatosFormulario,
} from "./formulario/esquema";
import { SeccionDatosGenerales } from "./formulario/SeccionDatosGenerales";
import { SeccionMetasMacros } from "./formulario/SeccionMetasMacros";
import {
  SeccionArchivoPrincipal,
  SeccionAdjuntos,
} from "./formulario/SeccionArchivos";
import { SeccionComidas } from "./formulario/SeccionComidas";
import {
  SeccionEquivalencias,
  SeccionRecomendaciones,
} from "./formulario/SeccionListas";

// El esquema se reexporta porque `coherencia-formularios-2.test.ts` lo importa
// desde acá, y porque este sigue siendo el punto de entrada del formulario.
export { esquema } from "./formulario/esquema";

interface PropsFormularioPlan {
  planInicial?: PlanSalidaDto | null;
  /** true → el formulario crea una plantilla (solo alta). */
  comoPlantilla?: boolean;
  /**
   * Qué clase de plan se está dando de alta. En edición manda la del plan: la
   * modalidad no se cambia sobre la marcha —pasar de PDF a APP dejaría un plan
   * sin comidas y al revés tiraría las que ya se cargaron—.
   */
  modalidad?: ModalidadPlan;
  /**
   * Carpeta en la que se está creando (la abierta en la pantalla). Solo aplica
   * al alta: en edición manda la del plan.
   */
  grupoIdInicial?: string | null;
  onTerminado: () => void;
}

/**
 * Editor de un plan nutricional, en sus dos modalidades.
 *
 * En modalidad APP: datos generales, metas, franjas con opciones (con receta
 * opcional), equivalencias y recomendaciones. En modalidad PDF: datos
 * generales, metas y el archivo que ES el plan; no hay franjas que cargar.
 *
 * El material adjunto está en las dos: es material de apoyo del plan, no el
 * plan, y eso vale igual para un plan cargado que para uno subido.
 *
 * ## Sobre la estructura
 *
 * Este archivo coordina; el contenido de cada sección vive en `./formulario/`.
 * Antes eran 913 líneas con 451 de JSX en un solo `return`, que es un tamaño en
 * el que los diffs se aprueban por confianza en vez de leerse. Cada sección
 * recibe el `control` del formulario y nada más, salvo las dos que necesitan
 * `formState` o `setValue` y reciben el `form` entero.
 */
export function FormularioPlan({
  planInicial,
  comoPlantilla,
  modalidad: modalidadProp,
  grupoIdInicial,
  onTerminado,
}: PropsFormularioPlan) {
  const { crear, actualizar, grupos: listarGrupos } = usePlanes();
  const grupos = listarGrupos();
  // La del plan que se edita gana siempre: la modalidad no se cambia editando.
  const modalidad: ModalidadPlan =
    planInicial?.modalidad ?? modalidadProp ?? "APP";
  const esApp = modalidad === "APP";
  // Vale para el alta (comoPlantilla) y para la edición (lo que ya es el plan).
  const esPlantilla = planInicial?.esPlantilla ?? comoPlantilla ?? false;
  const { listar: listarRecetas } = useRecetas();
  const recetas = listarRecetas(undefined);
  const enviando = crear.isPending || actualizar.isPending;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: planInicial
      ? {
          nombre: planInicial.nombre,
          descripcion: planInicial.descripcion ?? "",
          esPlantilla: planInicial.esPlantilla,
          caloriasMeta: planInicial.caloriasMeta?.toString() ?? "",
          proteinasMetaG: planInicial.proteinasMetaG?.toString() ?? "",
          carbohidratosMetaG: planInicial.carbohidratosMetaG?.toString() ?? "",
          grasasMetaG: planInicial.grasasMetaG?.toString() ?? "",
          contactosUtiles: planInicial.contactosUtiles ?? "",
          comidas: planInicial.comidas.map((comida) => ({
            nombre: comida.nombre,
            horaDesde: comida.horaDesde ?? "",
            horaHasta: comida.horaHasta ?? "",
            opciones: comida.opciones.map((opcion) => ({
              contenido: opcion.contenido,
              recetaId: opcion.recetaId ?? SIN_RECETA,
            })),
          })),
          equivalencias: planInicial.equivalencias.map((e) => ({
            titulo: e.titulo,
            detalle: e.detalle,
          })),
          recomendaciones: planInicial.recomendaciones.map((r) => ({
            tipo: r.tipo,
            texto: r.texto,
          })),
          modalidad: planInicial.modalidad,
          grupoId: planInicial.grupoId ?? SIN_CARPETA,
          archivoPrincipalId: planInicial.archivoPrincipal?.id ?? null,
        }
      : {
          nombre: "",
          descripcion: "",
          esPlantilla: comoPlantilla ?? false,
          caloriasMeta: "",
          proteinasMetaG: "",
          carbohidratosMetaG: "",
          grasasMetaG: "",
          contactosUtiles: "",
          comidas: modalidad === "APP" ? FRANJAS_INICIALES : [],
          equivalencias: [],
          recomendaciones: [],
          modalidad,
          // Crear estando dentro de una carpeta guarda ahí, salvo que sea una
          // plantilla: esas no van a ninguna carpeta.
          grupoId: (comoPlantilla ? null : grupoIdInicial) ?? SIN_CARPETA,
          archivoPrincipalId: null,
        },
  });

  // Fichas de los archivos, para mostrar nombre y tamaño. Van en estado y no en
  // el formulario porque no se validan: lo único que se valida es que en un
  // plan PDF haya principal, y eso es `archivoPrincipalId`.
  const [principal, setPrincipal] = useState<ArchivoDelPlanDto | null>(
    planInicial?.archivoPrincipal ?? null,
  );
  const [adjuntos, setAdjuntos] = useState<ArchivoDelPlanDto[]>(
    planInicial?.adjuntos ?? [],
  );

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
      caloriasMeta:
        aNumero(datos.caloriasMeta) != null
          ? Math.round(aNumero(datos.caloriasMeta)!)
          : null,
      proteinasMetaG: aNumero(datos.proteinasMetaG),
      carbohidratosMetaG: aNumero(datos.carbohidratosMetaG),
      grasasMetaG: aNumero(datos.grasasMetaG),
      contactosUtiles: datos.contactosUtiles.trim() || null,
      comidas: datos.comidas.map((comida) => ({
        nombre: comida.nombre,
        horaDesde: comida.horaDesde || null,
        horaHasta: comida.horaHasta || null,
        opciones: comida.opciones.map((opcion) => ({
          contenido: opcion.contenido,
          recetaId: opcion.recetaId === SIN_RECETA ? null : opcion.recetaId,
        })),
      })),
      equivalencias: datos.equivalencias,
      recomendaciones: datos.recomendaciones,
      modalidad: datos.modalidad,
      grupoId:
        esPlantilla || datos.grupoId === SIN_CARPETA ? null : datos.grupoId,
      archivoPrincipalId: datos.archivoPrincipalId,
      // El principal también va en la lista: ser el plan no lo exime de estar
      // vinculado a él. Lo que no esté acá el servidor lo desvincula.
      archivoIds: [
        ...(datos.archivoPrincipalId ? [datos.archivoPrincipalId] : []),
        ...adjuntos.map((a) => a.id),
      ],
    };

    if (planInicial) {
      actualizar.mutate(
        { id: planInicial.id, ...cuerpo },
        { onSuccess: onTerminado },
      );
    } else {
      crear.mutate(
        { ...cuerpo, esPlantilla: datos.esPlantilla },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-6">
        <SeccionDatosGenerales
          control={form.control}
          grupos={grupos.data ?? []}
          conCarpeta={!esPlantilla}
        />

        <SeccionMetasMacros control={form.control} />

        {!esApp && (
          <SeccionArchivoPrincipal
            form={form}
            principal={principal}
            alCambiar={setPrincipal}
          />
        )}

        <SeccionAdjuntos
          esApp={esApp}
          adjuntos={adjuntos}
          alCambiar={setAdjuntos}
        />

        {/* Contenido del plan cargado en la app. Un plan en PDF no lo tiene:
            su contenido es el archivo, y ofrecer franjas vacías al lado
            invitaría a armar dos planes en el mismo registro. */}
        {esApp && (
          <>
            <SeccionComidas
              form={form}
              recetas={(recetas.data ?? []).map((r) => ({
                id: r.id,
                nombre: r.nombre,
              }))}
            />
            <SeccionEquivalencias control={form.control} />
            <SeccionRecomendaciones control={form.control} />
          </>
        )}

        <FormField
          control={form.control}
          name="contactosUtiles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contactos útiles (aparecen en el PDF)</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="Turnos: 351-…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : planInicial
                ? "Guardar cambios"
                : "Crear plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
