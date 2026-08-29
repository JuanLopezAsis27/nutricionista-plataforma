"use client";

import { useState } from "react";
import { AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react";
import type { AlertaAlimentariaSalidaDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  TIPOS_ALERTA_ALIMENTARIA,
  SEVERIDADES_ALERTA,
  type TipoAlertaAlimentaria,
  type SeveridadAlerta,
} from "@/dominio/entidades/AlertaAlimentaria";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { ETIQUETAS_TIPO_ALERTA, ETIQUETAS_SEVERIDAD } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/** Colores por severidad (estado, siempre acompañados de ícono + texto). */
const COLORES_SEVERIDAD: Record<SeveridadAlerta, string> = {
  LEVE: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  MODERADA:
    "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  SEVERA:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

/**
 * Badges de alergias/intolerancias SIEMPRE visibles en el encabezado de la
 * ficha del paciente, para que ninguna decisión nutricional las pase por alto.
 */
export function BadgesAlertas({ pacienteId }: { pacienteId: string }) {
  const { obtenerAlertas } = useEvaluacion();
  const alertas = obtenerAlertas({ pacienteId });

  if (!alertas.data || alertas.data.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {alertas.data.map((alerta) => (
        <span
          key={alerta.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            COLORES_SEVERIDAD[alerta.severidad],
          )}
          title={`${ETIQUETAS_TIPO_ALERTA[alerta.tipo]} · ${ETIQUETAS_SEVERIDAD[alerta.severidad]}${alerta.notas ? ` · ${alerta.notas}` : ""}`}
        >
          <AlertTriangle className="h-3 w-3" />
          {ETIQUETAS_TIPO_ALERTA[alerta.tipo]}: {alerta.descripcion}
        </span>
      ))}
    </div>
  );
}

/** Gestión de alertas alimentarias (alta, edición y baja) dentro de la evaluación. */
export function GestionAlertas({ pacienteId }: { pacienteId: string }) {
  const { obtenerAlertas, registrarAlerta, actualizarAlerta, eliminarAlerta } =
    useEvaluacion();
  const alertas = obtenerAlertas({ pacienteId });

  const [editando, setEditando] = useState<AlertaAlimentariaSalidaDto | null>(
    null,
  );
  const [abierta, setAbierta] = useState(false);
  const [eliminando, setEliminando] =
    useState<AlertaAlimentariaSalidaDto | null>(null);

  // Estado del formulario (simple, sin react-hook-form: 4 campos controlados).
  const [tipo, setTipo] = useState<TipoAlertaAlimentaria>("INTOLERANCIA");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<SeveridadAlerta>("MODERADA");
  const [notas, setNotas] = useState("");

  function abrirNueva() {
    setEditando(null);
    setTipo("INTOLERANCIA");
    setDescripcion("");
    setSeveridad("MODERADA");
    setNotas("");
    setAbierta(true);
  }

  function abrirEdicion(alerta: AlertaAlimentariaSalidaDto) {
    setEditando(alerta);
    setTipo(alerta.tipo);
    setDescripcion(alerta.descripcion);
    setSeveridad(alerta.severidad);
    setNotas(alerta.notas ?? "");
    setAbierta(true);
  }

  function guardar() {
    const datos = {
      tipo,
      descripcion,
      severidad,
      notas: notas.trim() ? notas : null,
    };
    if (editando) {
      actualizarAlerta.mutate(
        { id: editando.id, ...datos },
        { onSuccess: () => setAbierta(false) },
      );
    } else {
      registrarAlerta.mutate(
        { pacienteId, ...datos },
        { onSuccess: () => setAbierta(false) },
      );
    }
  }

  const enviando = registrarAlerta.isPending || actualizarAlerta.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Alertas de intolerancias y alergias</h3>
        <Button size="sm" variant="outline" onClick={abrirNueva}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {(alertas.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin alertas registradas. Cargá alergias, intolerancias o restricciones
          para que aparezcan destacadas en toda la ficha.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {alertas.data!.map((alerta) => (
            <li key={alerta.id} className="flex items-center gap-3 p-3 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  COLORES_SEVERIDAD[alerta.severidad],
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {ETIQUETAS_SEVERIDAD[alerta.severidad]}
              </span>
              <div className="flex-1">
                <p className="font-medium">
                  {ETIQUETAS_TIPO_ALERTA[alerta.tipo]}: {alerta.descripcion}
                </p>
                {alerta.notas && (
                  <p className="text-xs text-muted-foreground">
                    {alerta.notas}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar alerta"
                onClick={() => abrirEdicion(alerta)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar alerta"
                onClick={() => setEliminando(alerta)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar alerta" : "Nueva alerta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => setTipo(v as TipoAlertaAlimentaria)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ALERTA_ALIMENTARIA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ETIQUETAS_TIPO_ALERTA[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidad</Label>
                <Select
                  value={severidad}
                  onValueChange={(v) => setSeveridad(v as SeveridadAlerta)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES_ALERTA.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ETIQUETAS_SEVERIDAD[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alimento o condición</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Lactosa, maní, celiaquía…"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Reacción, desde cuándo, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAbierta(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={enviando || !descripcion.trim()}
              >
                {enviando ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar alerta"
        descripcion={`¿Eliminar la alerta "${eliminando?.descripcion}"?`}
        onConfirmar={() => {
          if (eliminando) {
            eliminarAlerta.mutate({ id: eliminando.id });
          }
          setEliminando(null);
        }}
        onCancelar={() => setEliminando(null)}
      />
    </div>
  );
}
