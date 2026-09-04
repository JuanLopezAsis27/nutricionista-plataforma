"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { EvolucionSalidaDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  CAMPOS_EVOLUCION,
  ETIQUETAS_EVOLUCION,
} from "@/dominio/entidades/Evolucion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { SeccionDesplegable } from "@/componentes/comunes/SeccionDesplegable";
import { FormularioEvolucion } from "./FormularioEvolucion";

/**
 * Las evoluciones de control del paciente: una tarjeta por consulta, de la más
 * nueva a la más vieja.
 *
 * Es la contracara cualitativa de la antropometría. Ahí se ve qué se midió;
 * acá, qué contó el paciente: cómo le fue con la dieta y por qué, cómo
 * entrenó, cómo duerme, cómo se percibe. Van juntas en Evaluación porque es lo
 * que se repasa al abrir la consulta.
 *
 * Se cargan a mano o **salen del documento que se sube en la historia
 * clínica**: ahí la IA lee todas las que el cuaderno traiga y se importan de
 * una vez, tras revisarlas.
 */
export function EvolucionesPaciente({ pacienteId }: { pacienteId: string }) {
  const { obtenerEvoluciones, eliminarEvolucion, obtenerCamposEvolucion } =
    useEvaluacion();
  const evoluciones = obtenerEvoluciones({ pacienteId });
  const campos = obtenerCamposEvolucion();

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<EvolucionSalidaDto | null>(null);

  const lista = evoluciones.data ?? [];
  // La que se está editando se LEE de la query por id, no se congela en el
  // estado: el componente muestra datos que él mismo modifica, y una copia
  // guardada al abrir el diálogo se queda vieja apenas se guarda.
  const editando = lista.find((item) => item.id === editandoId) ?? null;

  // Estando plegada, la fecha de la última consulta es lo que se quiere saber.
  const resumen = evoluciones.isLoading
    ? "cargando…"
    : lista.length === 0
      ? "sin evoluciones"
      : `${lista.length} ${lista.length === 1 ? "consulta" : "consultas"} · última el ${formatearFecha(lista[0]?.fecha)}`;

  return (
    <div className="space-y-4">
      <SeccionDesplegable
        titulo="Evoluciones"
        resumen={resumen}
        acciones={
          <Button
            size="sm"
            onClick={() => {
              setEditandoId(null);
              setAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva evolución
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            El repaso de cada consulta: cumplimiento, entrenamiento, descanso y
            cómo se percibe el paciente. También se completan solas al subir un
            documento de seguimiento en la historia clínica.
          </p>

          {evoluciones.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : lista.length === 0 ? (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Todavía no hay evoluciones cargadas.
            </p>
          ) : (
            <ul className="space-y-3">
              {lista.map((evolucion) => (
                <li key={evolucion.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium tabular-nums">
                      {formatearFecha(evolucion.fecha)}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar la evolución del ${formatearFecha(evolucion.fecha)}`}
                        onClick={() => {
                          setEditandoId(evolucion.id);
                          setAbierto(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Eliminar la evolución del ${formatearFecha(evolucion.fecha)}`}
                        onClick={() => setAEliminar(evolucion)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <dl className="mt-2 space-y-1 text-sm">
                    {CAMPOS_EVOLUCION.filter(
                      (campo) => evolucion[campo] != null,
                    ).map((campo) => (
                      <div key={campo} className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-muted-foreground">
                          {ETIQUETAS_EVOLUCION[campo]}:
                        </dt>
                        <dd className="min-w-0 whitespace-pre-wrap">
                          {evolucion[campo]}
                        </dd>
                      </div>
                    ))}
                    {/* Los personalizados salen del valor guardado, que trae su
                    propia etiqueta: un campo que el consultorio borró después
                    se sigue leyendo con el nombre que tenía. */}
                    {evolucion.camposPersonalizados.map((campo) => (
                      <div key={campo.clave} className="flex flex-wrap gap-x-2">
                        <dt className="font-medium text-muted-foreground">
                          {campo.etiqueta}:
                        </dt>
                        <dd className="min-w-0 whitespace-pre-wrap">
                          {campo.valor}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SeccionDesplegable>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar la evolución del ${formatearFecha(editando.fecha)}`
                : "Nueva evolución"}
            </DialogTitle>
          </DialogHeader>
          {abierto && (
            <FormularioEvolucion
              pacienteId={pacienteId}
              evolucion={editando}
              camposDefinidos={campos.data ?? []}
              onTerminado={() => {
                setAbierto(false);
                setEditandoId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar evolución"
        descripcion={`¿Eliminar la evolución del ${formatearFecha(aEliminar?.fecha)}? Se pierde el repaso completo de esa consulta.`}
        textoConfirmar="Eliminar"
        cargando={eliminarEvolucion.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (aEliminar) {
            eliminarEvolucion.mutate(
              { id: aEliminar.id },
              { onSuccess: () => setAEliminar(null) },
            );
          }
        }}
      />
    </div>
  );
}
