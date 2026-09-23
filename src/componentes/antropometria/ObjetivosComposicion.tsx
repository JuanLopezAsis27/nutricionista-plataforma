"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type {
  MedicionComposicionDto,
  ObjetivoComposicionDto,
  ValorActualVariableDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioObjetivoComposicion } from "./FormularioObjetivoComposicion";
import { TortaPlieguesProyectados } from "./TortaPlieguesProyectados";
import { TarjetaMeta } from "./TarjetaMeta";
import {
  TortaMasasConObjetivos,
  SinFraccionamientoParaObjetivos,
} from "./TortaMasasConObjetivos";
import { useTemaComposicion } from "./useTemaComposicion";
import type { TemaComposicion } from "./paleta";

/** Objetivos cuantitativos de composición + su proyección. */
export function ObjetivosComposicion({
  pacienteId,
  objetivos,
  valoresActuales,
  ultimaMedicion,
}: {
  pacienteId: string;
  objetivos: ObjetivoComposicionDto[];
  /** Última medición: de ahí arranca el slider al plantear una meta nueva. */
  valoresActuales: ValorActualVariableDto[];
  /** Para dibujar el reparto de masas con las metas marcadas encima. */
  ultimaMedicion: MedicionComposicionDto | null;
}) {
  const { eliminarObjetivoComposicion } = useEvaluacion();
  const { tema, montado } = useTemaComposicion();
  const [editando, setEditando] = useState<ObjetivoComposicionDto | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eliminando, setEliminando] = useState<ObjetivoComposicionDto | null>(
    null,
  );

  if (!montado) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Objetivos de composición</h3>
          <p className="text-sm text-muted-foreground">
            Metas numéricas sobre las variables que mide la antropometría.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </Button>
      </div>

      {/* El reparto de las cinco masas con las metas marcadas encima: una sola
          figura para todos los objetivos de masa, no una por tarjeta. */}
      {objetivos.length > 0 &&
        (ultimaMedicion?.resultado.fraccionamiento ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Las 5 masas hoy y con los objetivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TortaMasasConObjetivos
                medicion={ultimaMedicion}
                objetivos={objetivos}
                tema={tema}
              />
            </CardContent>
          </Card>
        ) : (
          <SinFraccionamientoParaObjetivos objetivos={objetivos} />
        ))}

      {objetivos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay objetivos. Planteá uno y el dashboard va a mostrar la
          brecha, el ritmo del paciente y si llega a la fecha.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {objetivos.map((objetivo) => (
            <TarjetaObjetivo
              key={objetivo.id}
              objetivo={objetivo}
              tema={tema}
              onEditar={() => {
                setEditando(objetivo);
                setAbierto(true);
              }}
              onEliminar={() => setEliminando(objetivo)}
            />
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Objetivo de ${editando.descripcion}`
                : "Nuevo objetivo de composición"}
            </DialogTitle>
          </DialogHeader>
          <FormularioObjetivoComposicion
            pacienteId={pacienteId}
            objetivoInicial={editando}
            // Ocupada es la COMBINACIÓN, no la variable: el % graso por
            // Yuhasz y el % graso por Durnin & Womersley son dos metas
            // distintas porque son dos formas de medir distintas.
            combinacionesOcupadas={objetivos.map((o) => ({
              variable: o.variable,
              metodoGrasa: o.metodoGrasa,
            }))}
            valoresActuales={valoresActuales}
            onTerminado={() => setAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar objetivo"
        descripcion={`¿Eliminar el objetivo de ${eliminando?.descripcion}?`}
        cargando={eliminarObjetivoComposicion.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarObjetivoComposicion.mutate(
              { id: eliminando.id },
              { onSuccess: () => setEliminando(null) },
            );
          }
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}

function TarjetaObjetivo({
  objetivo,
  tema,
  onEditar,
  onEliminar,
}: {
  objetivo: ObjetivoComposicionDto;
  tema: TemaComposicion;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <TarjetaMeta
      descripcion={objetivo.descripcion}
      proyeccion={objetivo.proyeccion}
      tema={tema}
      onEditar={onEditar}
      onEliminar={onEliminar}
    >
      {/* El reparto de masas ya se dibuja una sola vez arriba; acá va el
          detalle por pliegue, que es información distinta y no un gráfico
          repetido. */}
      {objetivo.proyeccionPliegues && (
        <details className="border-t pt-3 text-xs">
          <summary className="cursor-pointer font-semibold">
            Cómo quedarían los pliegues
          </summary>
          <div className="pt-2">
            <TortaPlieguesProyectados
              proyeccion={objetivo.proyeccionPliegues}
              tema={tema}
            />
          </div>
        </details>
      )}
    </TarjetaMeta>
  );
}
