"use client";

import { useState } from "react";
import { FolderInput, UserPlus } from "lucide-react";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Input } from "@/componentes/ui/input";
import { useDeportivo } from "@/lib/hooks/useDeportivo";
import { esFechaPasada, formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { SelectorPaciente } from "@/componentes/pacientes/SelectorPaciente";

/** Sentinelas: Radix Select no admite value="". */
const SIN_COMPETENCIA = "__ninguna__";
const SUELTA = "__suelta__";

/** Lo mínimo de una planificación para estos diálogos. */
interface PlanificacionElegida {
  id: string;
  nombre: string;
  grupoId: string | null;
}

/**
 * Asignar una planificación a un paciente, opcionalmente para una competencia
 * de su calendario. Se entra por las dos puntas, como los planes:
 *
 *  - desde la planificación (`planificacion`): se elige el paciente;
 *  - desde la ficha (`pacienteId`): se elige la planificación.
 *
 * El lado fijado no se muestra: cambiarlo ahí sería asignar algo distinto de
 * lo que dice la pantalla. Asignar otra vez la misma al mismo paciente no la
 * duplica: le cambia la competencia.
 */
export function DialogoAsignarPlanificacion({
  abierto,
  planificacion,
  pacienteId: pacienteFijo,
  competenciaIdInicial,
  onCerrar,
}: {
  abierto: boolean;
  planificacion?: PlanificacionElegida | null;
  pacienteId?: string;
  competenciaIdInicial?: string | null;
  onCerrar: () => void;
}) {
  const { asignar, listar } = usePlanificacionDeportiva();
  const { listarCompetencias } = useDeportivo();
  const [pacienteId, setPacienteId] = useState<string | null>(
    pacienteFijo ?? null,
  );
  const [planificacionId, setPlanificacionId] = useState<string | null>(
    planificacion?.id ?? null,
  );
  const [competenciaId, setCompetenciaId] = useState<string>(
    competenciaIdInicial ?? SIN_COMPETENCIA,
  );

  // Se busca en el servidor y se muestran las primeras: con una página fija,
  // las que quedaban afuera no se podían asignar desde acá.
  const [busqueda, setBusqueda] = useState("");
  const texto = useDebounce(busqueda.trim(), 300);
  const planificaciones = listar(
    { pagina: 1, porPagina: 20, texto: texto || undefined },
    { enabled: abierto && !planificacion },
  );
  const competencias = listarCompetencias(
    { pacienteId: pacienteId ?? "" },
    { enabled: abierto && Boolean(pacienteId) },
  );
  const proximas = (competencias.data ?? []).filter(
    (c) => !esFechaPasada(c.fecha) || c.id === competenciaId,
  );

  function cerrar() {
    setPacienteId(pacienteFijo ?? null);
    setPlanificacionId(planificacion?.id ?? null);
    setCompetenciaId(competenciaIdInicial ?? SIN_COMPETENCIA);
    onCerrar();
  }

  const destino = planificacion?.id ?? planificacionId;

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {planificacion
              ? `Asignar «${planificacion.nombre}»`
              : "Asignar una planificación"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!pacienteFijo && (
            <div className="space-y-1.5">
              <Label>Paciente</Label>
              <SelectorPaciente
                valor={pacienteId}
                onCambiar={(id) => {
                  setPacienteId(id);
                  setCompetenciaId(SIN_COMPETENCIA);
                }}
              />
            </div>
          )}

          {!planificacion && (
            <div className="space-y-1.5">
              <Label htmlFor="planificacion-elegida">Planificación</Label>
              <Input
                placeholder="Buscar por nombre…"
                aria-label="Buscar planificación"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <Select
                value={planificacionId ?? undefined}
                onValueChange={setPlanificacionId}
              >
                <SelectTrigger id="planificacion-elegida">
                  <SelectValue placeholder="Elegí una planificación" />
                </SelectTrigger>
                <SelectContent>
                  {(planificaciones.data?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                  {(planificaciones.data?.total ?? 0) >
                    (planificaciones.data?.items.length ?? 0) && (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      Hay más: escribí parte del nombre para encontrarla.
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="competencia-elegida">
              Para la competencia (opcional)
            </Label>
            <Select
              value={competenciaId}
              onValueChange={setCompetenciaId}
              disabled={!pacienteId}
            >
              <SelectTrigger id="competencia-elegida">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_COMPETENCIA}>Sin competencia</SelectItem>
                {proximas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} · {formatearFecha(c.fecha)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Las competencias salen del calendario del paciente (pestaña
              Deporte de su ficha).
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!pacienteId || !destino || asignar.isPending}
              onClick={() => {
                if (!pacienteId || !destino) return;
                asignar.mutate(
                  {
                    planificacionId: destino,
                    pacienteId,
                    competenciaId:
                      competenciaId === SIN_COMPETENCIA ? null : competenciaId,
                  },
                  { onSuccess: cerrar },
                );
              }}
            >
              <UserPlus className="h-4 w-4" /> Asignar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Mover una planificación de carpeta desde la lista, sin abrir el editor. */
export function DialogoMoverPlanificacion({
  planificacion,
  onCerrar,
}: {
  planificacion: PlanificacionElegida | null;
  onCerrar: () => void;
}) {
  const { grupos, mover } = usePlanificacionDeportiva();
  const carpetas = grupos(undefined, { enabled: planificacion !== null });
  const [destino, setDestino] = useState<string | null>(null);
  const valor = destino ?? planificacion?.grupoId ?? SUELTA;

  function cerrar() {
    setDestino(null);
    onCerrar();
  }

  return (
    <Dialog open={planificacion !== null} onOpenChange={(a) => !a && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover «{planificacion?.nombre}»</DialogTitle>
        </DialogHeader>
        <Select value={valor} onValueChange={setDestino}>
          <SelectTrigger aria-label="Carpeta de destino">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SUELTA}>Sin carpeta</SelectItem>
            {(carpetas.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mover.isPending}
            onClick={() => {
              if (!planificacion) return;
              mover.mutate(
                {
                  planificacionId: planificacion.id,
                  grupoId: valor === SUELTA ? null : valor,
                },
                { onSuccess: cerrar },
              );
            }}
          >
            <FolderInput className="h-4 w-4" /> Mover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
