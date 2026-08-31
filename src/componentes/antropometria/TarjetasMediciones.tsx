"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  formatearFecha,
  formatearMedida,
  formatearNumero,
} from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { DetalleMedicion } from "./DetalleMedicion";
import { signo } from "./dashboard/piezas";
import { ETIQUETAS_PROTOCOLO, grasaDestacada } from "./resumenMedicion";

interface PropsTarjetasMediciones {
  /** Mediciones en orden cronológico ascendente (la última, al final). */
  mediciones: MedicionComposicionDto[];
  onEditar: (medicion: MedicionComposicionDto) => void;
  onEliminar: (medicion: MedicionComposicionDto) => void;
}

/**
 * Las consultas del paciente, una tarjeta cada una, con su ficha completa a un
 * click.
 *
 * Reemplaza a la planilla de una columna por consulta. Esa tabla mostraba las
 * 40 filas de todas las mediciones a la vez y crecía hacia el costado con cada
 * consulta nueva: a partir de la cuarta había que hacer scroll horizontal para
 * llegar a la última, que es justamente la que se mira. Y la unidad de trabajo
 * del profesional no es la fila "peso a lo largo del tiempo" —para eso están
 * los gráficos de evolución del dashboard— sino LA CONSULTA: qué se midió ese
 * día y cómo quedó.
 *
 * La tarjeta muestra las cuatro cifras que se miran primero; el resto de la
 * planilla vive en la ficha, con la diferencia contra la consulta anterior.
 */
export function TarjetasMediciones({
  mediciones,
  onEditar,
  onEliminar,
}: PropsTarjetasMediciones) {
  const [abiertaId, setAbiertaId] = useState<string | null>(null);

  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Sin mediciones registradas. Cargá la primera consulta para empezar.
      </p>
    );
  }

  // De la más nueva a la más vieja: la que se busca casi siempre es la última.
  const enOrden = [...mediciones].reverse();

  const indiceAbierta = mediciones.findIndex((m) => m.id === abiertaId);
  const abierta = indiceAbierta >= 0 ? mediciones[indiceAbierta]! : null;
  const anteriorALaAbierta =
    indiceAbierta > 0 ? (mediciones[indiceAbierta - 1] ?? null) : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {enOrden.map((medicion, indice) => (
          <TarjetaMedicion
            key={medicion.id}
            medicion={medicion}
            // `enOrden` va al revés, así que la consulta anterior está DESPUÉS.
            anterior={enOrden[indice + 1] ?? null}
            esUltima={indice === 0}
            onAbrir={() => setAbiertaId(medicion.id)}
            onEditar={onEditar}
            onEliminar={onEliminar}
          />
        ))}
      </div>

      <Dialog
        open={abierta !== null}
        onOpenChange={(abierto) => !abierto && setAbiertaId(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Medición del {formatearFecha(abierta?.fecha)}
            </DialogTitle>
          </DialogHeader>
          {abierta && (
            <DetalleMedicion
              medicion={abierta}
              anterior={anteriorALaAbierta}
              onEditar={(m) => {
                setAbiertaId(null);
                onEditar(m);
              }}
              onEliminar={(m) => {
                setAbiertaId(null);
                onEliminar(m);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PropsTarjeta {
  medicion: MedicionComposicionDto;
  anterior: MedicionComposicionDto | null;
  esUltima: boolean;
  onAbrir: () => void;
  onEditar: (medicion: MedicionComposicionDto) => void;
  onEliminar: (medicion: MedicionComposicionDto) => void;
}

function TarjetaMedicion({
  medicion,
  anterior,
  esUltima,
  onAbrir,
  onEditar,
  onEliminar,
}: PropsTarjeta) {
  const grasa = grasaDestacada(medicion);
  const deltaPeso =
    anterior != null ? medicion.medidas.pesoKg - anterior.medidas.pesoKg : null;

  return (
    <Card className={cn("relative", esUltima && "border-primary/60")}>
      {/* Editar y eliminar van FUERA del botón que abre la ficha: un botón
          adentro de otro no es HTML válido y el click del de adentro burbujea
          igual, así que el tacho terminaba abriendo también el detalle. */}
      <div className="absolute right-1.5 top-1.5 z-10 flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Editar la medición del ${formatearFecha(medicion.fecha)}`}
          onClick={() => onEditar(medicion)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Eliminar la medición del ${formatearFecha(medicion.fecha)}`}
          onClick={() => onEliminar(medicion)}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <button
        type="button"
        onClick={onAbrir}
        className="block w-full rounded-lg text-left transition-colors hover:bg-accent/40"
        aria-label={`Ver la medición del ${formatearFecha(medicion.fecha)}`}
      >
        <CardContent className="space-y-3 p-4">
          <div className="pr-16">
            <p className="font-semibold leading-tight">
              {formatearFecha(medicion.fecha)}
              {esUltima && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  última
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {ETIQUETAS_PROTOCOLO[medicion.protocolo]}
              {medicion.edadAnios != null &&
                ` · ${formatearNumero(medicion.edadAnios)} años`}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Cifra
              etiqueta="Peso"
              valor={medicion.medidas.pesoKg}
              unidad="kg"
              nota={deltaPeso != null ? `${signo(deltaPeso)} kg` : undefined}
            />
            <Cifra
              etiqueta={grasa ? "Grasa" : "Masa adiposa"}
              valor={
                grasa
                  ? grasa.porcentajeGrasa
                  : (medicion.resultado.fraccionamiento?.adiposa.kg ?? null)
              }
              unidad={grasa ? "%" : "kg"}
              nota={grasa?.etiqueta}
            />
            <Cifra
              etiqueta="IMC"
              valor={medicion.resultado.indices.imc}
              unidad=""
            />
            <Cifra
              etiqueta="Σ 6 pliegues"
              valor={medicion.resultado.indices.sumatoria6Pliegues}
              unidad="mm"
            />
          </dl>
        </CardContent>
      </button>
    </Card>
  );
}

function Cifra({
  etiqueta,
  valor,
  unidad,
  nota,
}: {
  etiqueta: string;
  valor: number | null;
  unidad: string;
  nota?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-lg font-bold tabular-nums leading-tight">
        {formatearMedida(valor)}
        {unidad && valor != null && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {unidad}
          </span>
        )}
      </dd>
      {nota && (
        <p className="truncate text-[11px] text-muted-foreground">{nota}</p>
      )}
    </div>
  );
}
