"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, X } from "lucide-react";
import type { LecturaHistoriaClinicaDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  CAMPOS_EVOLUCION,
  ETIQUETAS_EVOLUCION,
} from "@/dominio/entidades/Evolucion";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";

/** Una evolución leída del documento tal como se la revisa (fecha editable). */
type EvolucionLeida = LecturaHistoriaClinicaDto["evoluciones"][number];

interface FilaRevision {
  importar: boolean;
  fecha: string;
  leida: EvolucionLeida;
}

/**
 * Revisión de las evoluciones que la IA encontró en el documento de historia
 * clínica, antes de importarlas.
 *
 * Aparece sola cuando el documento traía alguna: un cuaderno de seguimiento es
 * el MISMO archivo que la ficha —la historia adelante, las consultas atrás— y
 * leer las dos cosas de una pasada evita subirlo dos veces.
 *
 * **Nada se guarda hasta que el profesional confirma**, igual que con los
 * campos de la historia: lo que sale de un modelo no entra solo al historial
 * de una persona. Lo único editable acá es la fecha, que es la identidad de la
 * consulta; el contenido se corrige después desde la evolución ya cargada, que
 * es donde está el formulario completo.
 */
export function RevisionEvolucionesLeidas({
  pacienteId,
  evoluciones,
  onCerrar,
}: {
  pacienteId: string;
  evoluciones: EvolucionLeida[];
  onCerrar: () => void;
}) {
  const { importarEvoluciones } = useEvaluacion();
  const [filas, setFilas] = useState<FilaRevision[]>(() =>
    evoluciones.map((leida) => ({
      // Una evolución sin fecha arranca DESMARCADA: importarla sin querer la
      // guardaría con una fecha que nadie eligió.
      importar: leida.fecha !== null,
      fecha: leida.fecha ?? "",
      leida,
    })),
  );

  const aImportar = filas.filter((fila) => fila.importar).length;

  function cambiar(indice: number, cambios: Partial<FilaRevision>) {
    setFilas((actuales) =>
      actuales.map((fila, i) =>
        i === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  function alImportar() {
    const elegidas = filas.filter((fila) => fila.importar);
    if (elegidas.some((fila) => !fila.fecha)) {
      toast.error(
        "Hay evoluciones marcadas sin fecha. Completala o desmarcalas para importar.",
      );
      return;
    }

    importarEvoluciones.mutate(
      {
        pacienteId,
        evoluciones: elegidas.map((fila) => ({
          // En UTC: `Evolucion.fecha` es un DATE a medianoche UTC y armarla en
          // la zona local correría el día.
          fecha: new Date(`${fila.fecha}T00:00:00.000Z`),
          cumplimientoDieta: fila.leida.cumplimientoDieta ?? null,
          entrenamiento: fila.leida.entrenamiento ?? null,
          deposiciones: fila.leida.deposiciones ?? null,
          orina: fila.leida.orina ?? null,
          descanso: fila.leida.descanso ?? null,
          indispuesta: fila.leida.indispuesta ?? null,
          sePercibe: fila.leida.sePercibe ?? null,
          camposPersonalizados: fila.leida.camposPersonalizados,
        })),
      },
      {
        onSuccess: (resultado) => {
          const afuera = resultado.resultados.filter(
            (item) => item.estado !== "REGISTRADA",
          );
          if (afuera.length === 0) {
            toast.success(
              `${resultado.registradas} evoluciones importadas a la ficha.`,
            );
          } else {
            toast.warning(
              `${resultado.registradas} importadas. ${afuera.length} quedaron afuera: ${afuera
                .map((item) => `${formatearFecha(item.fecha)} (${item.motivo})`)
                .join("; ")}`,
              { duration: 12000 },
            );
          }
          onCerrar();
        },
      },
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          El documento traía{" "}
          <span className="font-medium">
            {evoluciones.length === 1
              ? "1 evolución de control"
              : `${evoluciones.length} evoluciones de control`}
          </span>
          . Revisalas antes de importarlas.
        </p>
        <Button variant="ghost" size="sm" onClick={onCerrar}>
          <X className="mr-1 h-3.5 w-3.5" /> Descartar
        </Button>
      </div>

      <ul className="space-y-2">
        {filas.map((fila, indice) => (
          <li
            key={indice}
            className={cn(
              "rounded-md border bg-background p-3",
              !fila.importar && "opacity-60",
            )}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={fila.importar}
                  onChange={(evento) =>
                    cambiar(indice, { importar: evento.target.checked })
                  }
                  aria-label="Importar esta evolución"
                />
                <span className="text-xs text-muted-foreground">Importar</span>
              </label>
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input
                  type="date"
                  className="w-40"
                  value={fila.fecha}
                  onChange={(evento) =>
                    cambiar(indice, { fecha: evento.target.value })
                  }
                />
              </div>
              {!fila.fecha && (
                <p className="pb-2 text-xs text-destructive">
                  Sin fecha: completala para poder importarla.
                </p>
              )}
            </div>

            <dl className="mt-2 space-y-0.5 text-xs">
              {CAMPOS_EVOLUCION.filter(
                (campo) => fila.leida[campo] != null,
              ).map((campo) => (
                <div key={campo} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-muted-foreground">
                    {ETIQUETAS_EVOLUCION[campo]}:
                  </dt>
                  <dd className="min-w-0">{fila.leida[campo]}</dd>
                </div>
              ))}
              {fila.leida.camposPersonalizados.map((campo) => (
                <div key={campo.clave} className="flex flex-wrap gap-x-2">
                  <dt className="font-medium text-muted-foreground">
                    {campo.etiqueta}:
                  </dt>
                  <dd className="min-w-0">{campo.valor}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={aImportar === 0 || importarEvoluciones.isPending}
          onClick={alImportar}
        >
          {importarEvoluciones.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Importar {aImportar} {aImportar === 1 ? "evolución" : "evoluciones"}
        </Button>
      </div>
    </div>
  );
}
