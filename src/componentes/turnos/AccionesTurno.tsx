"use client";

import { Pencil, X } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { Button } from "@/componentes/ui/button";
import { SelectorEstado } from "@/componentes/turnos/SelectorEstado";
import { BotonRecordatorioWhatsapp } from "@/componentes/turnos/BotonRecordatorioWhatsapp";

interface PropsAccionesTurno {
  turno: TurnoSalidaDto;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  /** Teléfono del paciente, para habilitar el recordatorio por WhatsApp. */
  telefonoPaciente?: string | null;
}

/**
 * Acciones sobre un turno: cambiar estado (confirmar/completar/cancelar),
 * cancelar rápido y modificar (reprogramar). Reutilizado en la lista y en el
 * detalle del día del calendario.
 */
export function AccionesTurno({ turno, onReprogramar, telefonoPaciente }: PropsAccionesTurno) {
  const { actualizarEstado, cancelar } = useTurnos();
  const modificable = turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO";

  return (
    <div className="flex items-center justify-end gap-1">
      <SelectorEstado
        estadoActual={turno.estado}
        deshabilitado={actualizarEstado.isPending}
        onCambiar={(estado) => actualizarEstado.mutate({ id: turno.id, estado })}
      />
      {modificable && (
        <BotonRecordatorioWhatsapp turno={turno} telefonoPaciente={telefonoPaciente} />
      )}
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
    </div>
  );
}
