"use client";

import { useState } from "react";
import { DollarSign, Check } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { formatearMoneda } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/componentes/ui/popover";

/**
 * Control compacto para registrar el cobro de un turno: muestra el precio y si
 * está pagado; al abrirlo permite editar el monto y marcar/desmarcar pagado.
 * Alimenta el cálculo de ingresos de las estadísticas.
 */
export function CobroTurno({ turno }: { turno: TurnoSalidaDto }) {
  const { registrarCobro } = useTurnos();
  const [abierto, setAbierto] = useState(false);
  const [precio, setPrecio] = useState(turno.precio != null ? String(turno.precio) : "");
  const [pagado, setPagado] = useState(turno.pagado);

  function guardar() {
    const valor = precio.trim() === "" ? null : Number(precio);
    if (valor != null && (Number.isNaN(valor) || valor < 0)) return;
    registrarCobro.mutate(
      { id: turno.id, precio: valor, pagado: valor == null ? false : pagado },
      { onSuccess: () => setAbierto(false) },
    );
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 font-normal"
          title="Registrar cobro"
        >
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          {turno.precio != null ? (
            <span className="tabular-nums">{formatearMoneda(turno.precio)}</span>
          ) : (
            <span className="text-muted-foreground">Cobro</span>
          )}
          {turno.pagado && <Check className="h-3.5 w-3.5 text-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1.5">
          <Label htmlFor={`precio-${turno.id}`}>Precio de la consulta</Label>
          <Input
            id={`precio-${turno.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            placeholder="Sin cargo"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={pagado}
            disabled={precio.trim() === ""}
            onChange={(e) => setPagado(e.target.checked)}
          />
          Pagado
        </label>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAbierto(false)}
            disabled={registrarCobro.isPending}
          >
            Cancelar
          </Button>
          <Button size="sm" onClick={guardar} disabled={registrarCobro.isPending}>
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
