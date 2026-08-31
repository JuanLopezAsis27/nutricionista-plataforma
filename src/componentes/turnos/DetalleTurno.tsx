"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  DollarSign,
  Pencil,
  StickyNote,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { aHora, aMinutos } from "@/lib/agenda";
import {
  ETIQUETAS_ESTADO_TURNO,
  formatearFechaLarga,
  formatearMoneda,
} from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";

/** Transiciones de estado permitidas (espejo de la máquina del dominio). */
const TRANSICIONES: Record<EstadoTurno, EstadoTurno[]> = {
  PENDIENTE: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["COMPLETADO", "CANCELADO"],
  COMPLETADO: [],
  CANCELADO: [],
};

interface PropsDetalleTurno {
  turno: TurnoSalidaDto;
  nombrePaciente: string;
  /** Abre el formulario de reprogramación (vive fuera del popup). */
  onReprogramar: (turno: TurnoSalidaDto) => void;
  onCerrar: () => void;
}

/**
 * Ficha de un turno, para el globo que abre el calendario al clickearlo.
 *
 * Es la misma información y las mismas acciones que ofrecía la fila de la
 * tabla, pero TODO se resuelve adentro del globo: sin desplegables, sin
 * diálogos de confirmación y sin un segundo popover para el cobro. La razón es
 * de comportamiento, no estética: cada una de esas capas es una superficie
 * flotante aparte, y al abrirla el navegador la cuenta como un click "afuera"
 * del globo, que se cierra. Las transiciones de estado son botones, el borrado
 * confirma en dos pasos en el mismo lugar, y el cobro se edita en línea.
 *
 * Reprogramar sí sale del globo: necesita la grilla de franjas libres del día
 * completo y no entra. El globo se cierra y el diálogo lo abre la pantalla.
 */
export function DetalleTurno({
  turno,
  nombrePaciente,
  onReprogramar,
  onCerrar,
}: PropsDetalleTurno) {
  const { actualizarEstado, cancelar, eliminar, registrarCobro } = useTurnos();
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [editandoCobro, setEditandoCobro] = useState(false);
  const [precio, setPrecio] = useState(
    turno.precio != null ? String(turno.precio) : "",
  );
  const [pagado, setPagado] = useState(turno.pagado);

  const transiciones = TRANSICIONES[turno.estado];
  const modificable =
    turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO";
  // El cobro lo vuelve a bloquear el dominio; acá se esconde el botón para no
  // ofrecer algo que va a fallar.
  const borrable =
    turno.estado === "CANCELADO" && turno.precio == null && !turno.pagado;

  const horaFin = aHora(aMinutos(turno.hora) + turno.duracionMinutos);

  function guardarCobro() {
    const valor = precio.trim() === "" ? null : Number(precio);
    if (valor != null && (Number.isNaN(valor) || valor < 0)) return;
    registrarCobro.mutate(
      { id: turno.id, precio: valor, pagado: valor == null ? false : pagado },
      { onSuccess: () => setEditandoCobro(false) },
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Link
            href={`/dashboard/pacientes/${turno.pacienteId}`}
            className="flex items-center gap-1.5 font-semibold leading-tight hover:underline"
          >
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{nombrePaciente}</span>
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="first-letter:uppercase">
              {formatearFechaLarga(turno.fecha)}
            </span>
          </p>
          <p className="pl-5 text-xs text-muted-foreground">
            {turno.hora} a {horaFin} · {turno.duracionMinutos} min
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {modificable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Cambiar día, hora o duración"
              aria-label="Modificar el turno"
              onClick={() => onReprogramar(turno)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Cerrar el detalle"
            onClick={onCerrar}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <EstadoBadge estado={turno.estado} />
        {transiciones.map((estado) => (
          <Button
            key={estado}
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            disabled={actualizarEstado.isPending}
            onClick={() => actualizarEstado.mutate({ id: turno.id, estado })}
          >
            {ETIQUETAS_ESTADO_TURNO[estado]}
          </Button>
        ))}
      </div>

      {turno.notas && (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/60 p-2 text-xs">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="whitespace-pre-line">{turno.notas}</span>
        </p>
      )}

      <div className="border-t pt-2">
        {editandoCobro ? (
          <div className="space-y-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              placeholder="Sin cargo"
              aria-label="Precio de la consulta"
              className="h-8"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary"
                checked={pagado}
                disabled={precio.trim() === ""}
                onChange={(e) => setPagado(e.target.checked)}
              />
              Pagado
            </label>
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={registrarCobro.isPending}
                onClick={() => setEditandoCobro(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={registrarCobro.isPending}
                onClick={guardarCobro}
              >
                Guardar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
            onClick={() => setEditandoCobro(true)}
          >
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            {turno.precio != null ? (
              <span className="tabular-nums">
                {formatearMoneda(turno.precio)}
                <span className="ml-1.5 text-muted-foreground">
                  {turno.pagado ? "· pagado" : "· sin pagar"}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Registrar cobro</span>
            )}
          </button>
        )}
      </div>

      {(modificable || borrable) && (
        <div className="flex flex-wrap justify-end gap-1.5 border-t pt-2">
          {modificable && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              disabled={cancelar.isPending}
              onClick={() => cancelar.mutate({ id: turno.id })}
            >
              <X className="h-3.5 w-3.5" />
              Cancelar turno
            </Button>
          )}
          {borrable && !confirmandoBorrado && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => setConfirmandoBorrado(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar de la agenda
            </Button>
          )}
          {borrable && confirmandoBorrado && (
            <div className="w-full space-y-1.5 rounded-md border border-destructive/40 p-2">
              <p className="text-xs">
                Se borra para siempre, junto con los recordatorios que se le
                hayan mandado.
              </p>
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={eliminar.isPending}
                  onClick={() => setConfirmandoBorrado(false)}
                >
                  No
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={eliminar.isPending}
                  onClick={() =>
                    eliminar.mutate({ id: turno.id }, { onSuccess: onCerrar })
                  }
                >
                  Sí, borrar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
