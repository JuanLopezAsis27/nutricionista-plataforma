"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, DollarSign, Check, X } from "lucide-react";
import type {
  ResultadoLoteTurnosDto,
  TurnoSalidaDto,
} from "@/aplicacion/dtos/turno.dto";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { ETIQUETAS_ESTADO_TURNO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/componentes/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/componentes/ui/popover";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Estados a los que se puede llevar una selección. PENDIENTE no está: es el
 * estado inicial y ninguna transición vuelve a él.
 */
const ESTADOS_DESTINO: EstadoTurno[] = [
  "CONFIRMADO",
  "COMPLETADO",
  "CANCELADO",
];

/** Qué hacer con el pago en el cobro en lote. */
type CambioPago = "NO_TOCAR" | "PAGADO" | "NO_PAGADO";

interface PropsAccionesLoteTurnos {
  /** Los turnos elegidos, ya recortados a los que están a la vista. */
  seleccionados: TurnoSalidaDto[];
  onLimpiar: () => void;
}

/**
 * Barra de acciones sobre los turnos tildados en la lista: estado, cobro y
 * «marcar pagados».
 *
 * Las reglas son las de cada turno —la máquina de estados, «no se marca
 * pagado sin precio»— y las aplica el servidor uno por uno. El lote no es
 * todo-o-nada: lo que no admite el cambio queda como estaba y se nombra en el
 * aviso, con el motivo, para que el profesional sepa cuál mirar.
 */
export function AccionesLoteTurnos({
  seleccionados,
  onLimpiar,
}: PropsAccionesLoteTurnos) {
  const { actualizarEstadoLote, registrarCobroLote } = useTurnos();
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [precio, setPrecio] = useState("");
  const [pago, setPago] = useState<CambioPago>("NO_TOCAR");

  const ids = seleccionados.map((t) => t.id);
  const ocupado =
    actualizarEstadoLote.isPending || registrarCobroLote.isPending;

  /** Un aviso que dice cuántos salieron y, si hubo, cuáles no y por qué. */
  function informar(resultado: ResultadoLoteTurnosDto) {
    const nombres = new Map(seleccionados.map((t) => [t.id, t]));
    if (resultado.actualizados > 0) {
      toast.success(
        resultado.actualizados === 1
          ? "1 turno actualizado."
          : `${resultado.actualizados} turnos actualizados.`,
      );
    }
    if (resultado.omitidos.length > 0) {
      const detalle = (
        <ul className="space-y-0.5">
          {resultado.omitidos.map(({ id, motivo }) => {
            const turno = nombres.get(id);
            const quien = turno
              ? `${turno.pacienteNombre} (${turno.hora})`
              : "Un turno";
            return <li key={id}>{`${quien}: ${motivo}`}</li>;
          })}
        </ul>
      );
      toast.warning(
        resultado.omitidos.length === 1
          ? "1 turno quedó como estaba"
          : `${resultado.omitidos.length} turnos quedaron como estaban`,
        { description: detalle, duration: 10000 },
      );
    }
    // Lo que quedó sin tocar sigue tildado: es justo lo que hay que revisar.
    if (resultado.omitidos.length === 0) onLimpiar();
  }

  function cambiarEstado(estado: EstadoTurno) {
    actualizarEstadoLote.mutate(
      { ids, estado },
      {
        onSuccess: (resultado) => {
          setConfirmandoCancelar(false);
          informar(resultado);
        },
      },
    );
  }

  function guardarCobro() {
    const texto = precio.trim();
    const valor = texto === "" ? undefined : Number(texto);
    if (valor !== undefined && (Number.isNaN(valor) || valor < 0)) {
      toast.error("El precio no puede ser negativo.");
      return;
    }
    const pagado =
      pago === "NO_TOCAR" ? undefined : pago === "PAGADO" ? true : false;
    if (valor === undefined && pagado === undefined) {
      toast.error("Indicá un precio, el pago o los dos.");
      return;
    }
    registrarCobroLote.mutate(
      { ids, precio: valor, pagado },
      {
        onSuccess: (resultado) => {
          setCobroAbierto(false);
          setPrecio("");
          setPago("NO_TOCAR");
          informar(resultado);
        },
      },
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-sm font-medium">
        {seleccionados.length === 1
          ? "1 turno seleccionado"
          : `${seleccionados.length} turnos seleccionados`}
      </span>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={ocupado}>
              Cambiar estado
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ESTADOS_DESTINO.map((estado) => (
              <DropdownMenuItem
                key={estado}
                onClick={() =>
                  estado === "CANCELADO"
                    ? setConfirmandoCancelar(true)
                    : cambiarEstado(estado)
                }
              >
                {ETIQUETAS_ESTADO_TURNO[estado]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover open={cobroAbierto} onOpenChange={setCobroAbierto}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={ocupado}>
              <DollarSign className="h-4 w-4" />
              Cobro
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="precio-lote">Precio de la consulta</Label>
              <Input
                id="precio-lote"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                placeholder="Sin cambios"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vacío deja a cada turno con el precio que ya tenía.
              </p>
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Pago</legend>
              {(
                [
                  ["NO_TOCAR", "Sin cambios"],
                  ["PAGADO", "Pagado"],
                  ["NO_PAGADO", "No pagado"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <label key={valor} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pago-lote"
                    className="h-4 w-4 accent-primary"
                    checked={pago === valor}
                    onChange={() => setPago(valor)}
                  />
                  {etiqueta}
                </label>
              ))}
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCobroAbierto(false)}
                disabled={registrarCobroLote.isPending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={guardarCobro}
                disabled={registrarCobroLote.isPending}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          disabled={ocupado}
          onClick={() =>
            registrarCobroLote.mutate(
              { ids, pagado: true },
              { onSuccess: informar },
            )
          }
        >
          <Check className="h-4 w-4" />
          Marcar pagados
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLimpiar}
          title="Quitar la selección"
        >
          <X className="h-4 w-4" />
          Quitar selección
        </Button>
      </div>

      <ModalConfirmacion
        abierto={confirmandoCancelar}
        titulo="Cancelar los turnos"
        descripcion={`Se cancelan ${seleccionados.length === 1 ? "el turno seleccionado" : `los ${seleccionados.length} turnos seleccionados`}. Quedan en la agenda como cancelados por el consultorio y se quitan del calendario sincronizado.`}
        textoConfirmar="Cancelar turnos"
        cargando={actualizarEstadoLote.isPending}
        onCancelar={() => setConfirmandoCancelar(false)}
        onConfirmar={() => cambiarEstado("CANCELADO")}
      />
    </div>
  );
}
