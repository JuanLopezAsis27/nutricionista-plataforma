"use client";

import { useState } from "react";
import { Loader2, TicketCheck } from "lucide-react";
import type { VistaInvitacionSalidaDto } from "@/aplicacion/dtos/acceso-portal.dto";
import { useAccesoPortal } from "@/lib/hooks/useAccesoPortal";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";

/**
 * Sumar un consultorio a la cuenta con un código de invitación (migración 80).
 *
 * Dos pasos a propósito: primero se ve de QUÉ profesional es y A NOMBRE DE
 * QUIÉN está la ficha, y recién después se confirma. Un código que llegó al
 * email de la madre puede ser el de un hermano, y canjearlo desde la cuenta
 * equivocada le mostraría a una persona la ficha de otra.
 *
 * `codigoInicial` viene del enlace del email (`?codigo=`).
 */
export function AgregarConsultorio({
  codigoInicial,
  onAgregado,
}: {
  codigoInicial?: string;
  /** Con la ficha que se sumó, para entrar directo a ese consultorio. */
  onAgregado: (pacienteId: string) => void;
}) {
  const { previsualizarInvitacion, canjearInvitacion } = useAccesoPortal();
  const [codigo, setCodigo] = useState(codigoInicial ?? "");
  const [vista, setVista] = useState<VistaInvitacionSalidaDto | null>(null);

  function revisar() {
    previsualizarInvitacion.mutate({ codigo }, { onSuccess: setVista });
  }

  function confirmar() {
    canjearInvitacion.mutate(
      { codigo },
      { onSuccess: (resultado) => onAgregado(resultado.pacienteId) },
    );
  }

  if (vista) {
    return (
      <div className="space-y-3 rounded-lg border p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <TicketCheck className="h-4 w-4 text-primary" />
          {vista.nombreProfesional}
        </p>
        <p className="text-sm text-muted-foreground">
          Vas a sumar a tu cuenta la ficha de{" "}
          <strong className="text-foreground">{vista.nombrePaciente}</strong>.
          Si no sos vos, no sigas: esa persona tiene que usar su propia cuenta.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setVista(null)}
            disabled={canjearInvitacion.isPending}
          >
            Volver
          </Button>
          <Button
            className="flex-1"
            onClick={confirmar}
            disabled={canjearInvitacion.isPending}
          >
            {canjearInvitacion.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Sumar consultorio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-2 rounded-lg border p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        if (codigo.trim()) revisar();
      }}
    >
      <Label htmlFor="codigo-invitacion">
        ¿Te atendés con otro profesional? Cargá su código
      </Label>
      <div className="flex gap-2">
        <Input
          id="codigo-invitacion"
          placeholder="K7PM-X3QD"
          autoCapitalize="characters"
          autoComplete="off"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!codigo.trim() || previsualizarInvitacion.isPending}
        >
          {previsualizarInvitacion.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Revisar"
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Te lo da tu profesional. Así usás esta misma cuenta con los dos, sin
        crear otra.
      </p>
    </form>
  );
}
