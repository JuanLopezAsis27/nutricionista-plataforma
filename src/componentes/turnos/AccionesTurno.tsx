"use client";

import { useState } from "react";
import { Pencil, X, Trash2 } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { Button } from "@/componentes/ui/button";
import { SelectorEstado } from "@/componentes/turnos/SelectorEstado";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

interface PropsAccionesTurno {
  turno: TurnoSalidaDto;
  onReprogramar: (turno: TurnoSalidaDto) => void;
}

/**
 * Acciones sobre un turno: cambiar estado (confirmar/completar/cancelar),
 * cancelar rápido, modificar (reprogramar) y —solo si ya está cancelado y sin
 * cobro— borrarlo de la agenda. Reutilizado en la lista y en el detalle del
 * día del calendario.
 *
 * Cancelar y borrar son cosas distintas y la UI las separa: cancelar deja
 * constancia de que alguien no vino, que es información clínica y de cobranza;
 * borrar es para el turno que se cargó mal y solo ensucia la grilla. Por eso el
 * tacho aparece recién sobre un turno cancelado, y el dominio además exige que
 * no tenga cobro registrado.
 *
 * El recordatorio por WhatsApp NO está acá. Avisar es una tarea de secretaría
 * —se elige a quién, con qué texto y se confirma cuál salió— y desde la grilla
 * de turnos era un botón suelto que además no tenía dónde mostrar el paso que
 * le sigue: la confirmación de que el mensaje efectivamente se mandó. Vive en
 * Recordatorios, junto al resto de esa tarea.
 */
export function AccionesTurno({ turno, onReprogramar }: PropsAccionesTurno) {
  const { actualizarEstado, cancelar, eliminar } = useTurnos();
  const [confirmando, setConfirmando] = useState(false);

  const modificable =
    turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO";
  // El cobro lo vuelve a bloquear el dominio; acá se esconde el botón para no
  // ofrecer algo que va a fallar.
  const borrable =
    turno.estado === "CANCELADO" && turno.precio == null && !turno.pagado;

  return (
    <div className="flex items-center justify-end gap-1">
      <SelectorEstado
        estadoActual={turno.estado}
        deshabilitado={actualizarEstado.isPending}
        onCambiar={(estado) =>
          actualizarEstado.mutate({ id: turno.id, estado })
        }
      />
      {modificable && (
        <Button
          variant="ghost"
          size="icon"
          title="Modificar día/hora"
          onClick={() => onReprogramar(turno)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {modificable && (
        <Button
          variant="ghost"
          size="icon"
          title="Cancelar turno"
          disabled={cancelar.isPending}
          onClick={() => cancelar.mutate({ id: turno.id })}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      )}
      {borrable && (
        <Button
          variant="ghost"
          size="icon"
          title="Borrar de la agenda"
          disabled={eliminar.isPending}
          onClick={() => setConfirmando(true)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      <ModalConfirmacion
        abierto={confirmando}
        titulo="Borrar el turno"
        descripcion="Se borra de la agenda para siempre, junto con los recordatorios que se le hayan mandado. Esta acción no se puede deshacer."
        cargando={eliminar.isPending}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() =>
          eliminar.mutate(
            { id: turno.id },
            { onSuccess: () => setConfirmando(false) },
          )
        }
      />
    </div>
  );
}
