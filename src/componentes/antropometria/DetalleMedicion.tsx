"use client";

import { Fragment } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import {
  formatearFecha,
  formatearMedida,
  formatearNumero,
} from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { GRUPOS } from "./filasMedicion";
import { AvisoFaltantes } from "./dashboard/AvisoFaltantes";
import { signo } from "./dashboard/piezas";
import { ETIQUETAS_PROTOCOLO } from "./resumenMedicion";

interface PropsDetalleMedicion {
  medicion: MedicionComposicionDto;
  /** La consulta inmediatamente anterior, para la columna de diferencia. */
  anterior: MedicionComposicionDto | null;
  onEditar: (medicion: MedicionComposicionDto) => void;
  onEliminar: (medicion: MedicionComposicionDto) => void;
}

/**
 * La planilla de UNA consulta: lo que se midió ese día y lo que el dominio
 * derivó, con la diferencia contra la consulta anterior al lado.
 *
 * Muestra solo las filas que esta medición tiene cargadas. La planilla ISAK
 * son 25 medidas y en consulta se toman seis: listar las diecinueve restantes
 * en blanco no informa nada y esconde lo que sí se midió. Lo que falta para
 * completar un cálculo lo dice `AvisoFaltantes`, que además explica PARA QUÉ
 * haría falta cada medida.
 *
 * Los derivados sí aparecen aunque sean nulos: ahí el blanco es información
 * —"con estas medidas no se puede calcular"—, no ausencia de carga.
 */
export function DetalleMedicion({
  medicion,
  anterior,
  onEditar,
  onEliminar,
}: PropsDetalleMedicion) {
  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    filas: grupo.filas.filter(
      (fila) => fila.derivada || fila.valor(medicion) != null,
    ),
  })).filter((grupo) => grupo.filas.some((f) => f.valor(medicion) != null));

  const metodoDestacado =
    medicion.metodoGrasa != null
      ? DEFINICIONES_METODO[medicion.metodoGrasa].etiqueta
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <p>
            {ETIQUETAS_PROTOCOLO[medicion.protocolo]}
            {metodoDestacado && ` · ecuación destacada: ${metodoDestacado}`}
          </p>
          <p>
            {medicion.edadAnios != null &&
              `${formatearNumero(medicion.edadAnios)} años · `}
            {anterior
              ? `Comparada con la del ${formatearFecha(anterior.fecha)}`
              : "Primera medición del paciente"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditar(medicion)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onEliminar(medicion)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      </div>

      {medicion.observaciones && (
        <p className="whitespace-pre-line rounded-md bg-muted/60 p-3 text-sm">
          {medicion.observaciones}
        </p>
      )}

      <AvisoFaltantes faltantes={medicion.resultado.faltantes} />

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-semibold">Medida</th>
              <th className="w-24 p-2 text-right font-semibold">
                {formatearFecha(medicion.fecha)}
              </th>
              {anterior && (
                <th className="w-24 p-2 text-right font-semibold">
                  Vs. anterior
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <Fragment key={grupo.titulo}>
                <tr className="border-b bg-muted/30">
                  <td
                    className="p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    colSpan={anterior ? 3 : 2}
                  >
                    {grupo.titulo}
                  </td>
                </tr>
                {grupo.filas.map((fila) => {
                  const valor = fila.valor(medicion);
                  const previo = anterior ? fila.valor(anterior) : null;
                  const delta =
                    valor != null && previo != null ? valor - previo : null;

                  return (
                    <tr
                      key={`${grupo.titulo}-${fila.etiqueta}`}
                      className={cn(
                        "border-b last:border-0",
                        fila.derivada && "bg-accent/40",
                      )}
                    >
                      <td
                        className={cn(
                          "p-2 font-medium",
                          fila.derivada && "text-accent-foreground",
                        )}
                      >
                        {fila.etiqueta}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {formatearMedida(valor)}
                      </td>
                      {anterior && (
                        <td className="p-2 text-right tabular-nums text-muted-foreground">
                          {delta == null || delta === 0 ? "—" : signo(delta)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
