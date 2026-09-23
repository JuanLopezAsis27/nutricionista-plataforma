"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type {
  ObjetivoBioimpedanciaDto,
  ValorActualBioimpedanciaDto,
} from "@/aplicacion/dtos/bioimpedancia.dto";
import { RANGOS_BIOIMPEDANCIA } from "@/dominio/entidades/Bioimpedancia";
import {
  MEDIDA_DE_VARIABLE_BIOIMPEDANCIA,
  VARIABLES_BIOIMPEDANCIA,
  type VariableBioimpedancia,
} from "@/dominio/entidades/ObjetivoBioimpedancia";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { aFechaISO, formatearMedida } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { TarjetaMeta } from "@/componentes/antropometria/TarjetaMeta";
import { useTemaComposicion } from "@/componentes/antropometria/useTemaComposicion";

/** Etiqueta, unidad y rango de una variable: los de la medida de la que sale. */
function definicion(variable: VariableBioimpedancia): {
  etiqueta: string;
  unidad: string;
  min: number;
  max: number;
} {
  return RANGOS_BIOIMPEDANCIA[MEDIDA_DE_VARIABLE_BIOIMPEDANCIA[variable]];
}

/**
 * Metas numéricas sobre lo que mide la balanza, con su proyección contra la
 * serie de bioimpedancia. La tarjeta es la misma que la de los objetivos de
 * antropometría (`TarjetaMeta`) porque la proyección es la misma.
 */
export function ObjetivosBioimpedancia({
  pacienteId,
  objetivos,
  valoresActuales,
}: {
  pacienteId: string;
  objetivos: ObjetivoBioimpedanciaDto[];
  valoresActuales: ValorActualBioimpedanciaDto[];
}) {
  const { eliminarObjetivoBioimpedancia } = useEvaluacion();
  const { tema, montado } = useTemaComposicion();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ObjetivoBioimpedanciaDto | null>(
    null,
  );
  const [eliminando, setEliminando] = useState<ObjetivoBioimpedanciaDto | null>(
    null,
  );

  if (!montado) return null;

  const ocupadas = new Set(objetivos.map((o) => o.variable));
  const todasOcupadas = VARIABLES_BIOIMPEDANCIA.every((v) => ocupadas.has(v));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Objetivos de bioimpedancia</h3>
          <p className="text-sm text-muted-foreground">
            Metas sobre lo que informa la balanza. Se siguen contra las
            mediciones de bioimpedancia, no contra la antropometría.
          </p>
        </div>
        <Button
          size="sm"
          disabled={todasOcupadas}
          title={
            todasOcupadas
              ? "Ya hay una meta por cada variable: editá la que quieras replantear."
              : undefined
          }
          onClick={() => {
            setEditando(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo objetivo
        </Button>
      </div>

      {objetivos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no hay objetivos. Planteá uno y vas a ver la brecha, el ritmo
          del paciente y si llega a la fecha.
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {objetivos.map((objetivo) => (
            <TarjetaMeta
              key={objetivo.id}
              descripcion={objetivo.descripcion}
              proyeccion={objetivo.proyeccion}
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
                : "Nuevo objetivo de bioimpedancia"}
            </DialogTitle>
          </DialogHeader>
          {/* Se monta de nuevo en cada apertura: arranca de la meta elegida y
              no de lo que quedó escrito la vez anterior. */}
          {abierto && (
            <FormularioObjetivoBioimpedancia
              pacienteId={pacienteId}
              objetivoInicial={editando}
              ocupadas={ocupadas}
              valoresActuales={valoresActuales}
              onTerminado={() => setAbierto(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar objetivo"
        descripcion={`¿Eliminar el objetivo de ${eliminando?.descripcion}?`}
        cargando={eliminarObjetivoBioimpedancia.isPending}
        onConfirmar={() => {
          if (eliminando) {
            eliminarObjetivoBioimpedancia.mutate(
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

function FormularioObjetivoBioimpedancia({
  pacienteId,
  objetivoInicial,
  ocupadas,
  valoresActuales,
  onTerminado,
}: {
  pacienteId: string;
  objetivoInicial: ObjetivoBioimpedanciaDto | null;
  ocupadas: ReadonlySet<VariableBioimpedancia>;
  valoresActuales: ValorActualBioimpedanciaDto[];
  onTerminado: () => void;
}) {
  const { guardarObjetivoBioimpedancia } = useEvaluacion();
  const actualDe = (variable: VariableBioimpedancia): number | null =>
    valoresActuales.find((v) => v.variable === variable)?.valor ?? null;

  // Una variable con meta ya planteada no se ofrece para una nueva: guardarla
  // pisaría la existente sin que nadie lo haya pedido. Se replantea editando.
  const libres = VARIABLES_BIOIMPEDANCIA.filter((v) => !ocupadas.has(v));
  const [variable, setVariable] = useState<VariableBioimpedancia>(
    objetivoInicial?.variable ?? libres[0] ?? "PESO",
  );
  const [valor, setValor] = useState<string>(
    objetivoInicial
      ? String(objetivoInicial.valorObjetivo)
      : String(actualDe(variable) ?? ""),
  );
  const [fecha, setFecha] = useState<string>(
    aFechaISO(objetivoInicial?.fechaObjetivo),
  );
  const [notas, setNotas] = useState<string>(objetivoInicial?.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  const { etiqueta, unidad, min, max } = definicion(variable);
  const actual = actualDe(variable);

  const alCambiarVariable = (nueva: VariableBioimpedancia) => {
    setVariable(nueva);
    // Arranca del dato real, no de una casilla vacía.
    setValor(String(actualDe(nueva) ?? ""));
    setError(null);
  };

  const alEnviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const numero = Number(valor.trim().replace(",", "."));
    if (valor.trim() === "" || !Number.isFinite(numero)) {
      setError("Ingresá el valor objetivo.");
      return;
    }
    if (numero < min || numero > max) {
      setError(`Tiene que estar entre ${min} y ${max} ${unidad}.`);
      return;
    }
    guardarObjetivoBioimpedancia.mutate(
      {
        pacienteId,
        variable,
        valorObjetivo: numero,
        fechaObjetivo: fecha ? new Date(fecha) : null,
        notas: notas.trim() || null,
      },
      { onSuccess: onTerminado },
    );
  };

  return (
    <form onSubmit={alEnviar} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Variable</Label>
        <Select
          value={variable}
          onValueChange={(v) => alCambiarVariable(v as VariableBioimpedancia)}
          disabled={objetivoInicial != null}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VARIABLES_BIOIMPEDANCIA.map((v) => (
              <SelectItem
                key={v}
                value={v}
                disabled={objetivoInicial == null && ocupadas.has(v)}
              >
                {definicion(v).etiqueta}
                {objetivoInicial == null &&
                  ocupadas.has(v) &&
                  " — ya tiene objetivo"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bia-meta-valor">
            {etiqueta} objetivo ({unidad})
          </Label>
          <Input
            id="bia-meta-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setError(null);
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            {actual != null
              ? `Hoy: ${formatearMedida(actual)} ${unidad}`
              : "Sin dato en la última medición"}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bia-meta-fecha">Para el (opcional)</Label>
          <Input
            id="bia-meta-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bia-meta-notas">Notas</Label>
        <Textarea
          id="bia-meta-notas"
          rows={2}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={guardarObjetivoBioimpedancia.isPending}>
          {guardarObjetivoBioimpedancia.isPending
            ? "Guardando…"
            : "Guardar objetivo"}
        </Button>
      </div>
    </form>
  );
}
