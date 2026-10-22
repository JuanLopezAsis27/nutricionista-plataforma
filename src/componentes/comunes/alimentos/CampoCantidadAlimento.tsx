"use client";

import { Input } from "@/componentes/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { cn } from "@/lib/utilidades";
import { SIMBOLO_UNIDAD_BASE } from "@/dominio/entidades/medidasAlimento";
import {
  cambiarMedida,
  gramosEnFormulario,
  opcionesDeMedida,
  valorDeMedida,
  VALOR_BASE,
  type CantidadEnFormulario,
} from "./cantidad";

/** Valores del selector para cambiar la unidad de un alimento cargado a mano. */
const VALOR_GRAMOS = "base:GRAMO";
const VALOR_MILILITROS = "base:MILILITRO";

/**
 * La cantidad de un alimento: el número y, al lado, en qué se mide —g o ml,
 * o una de sus medidas («taza (240 ml)», «unidad (50 g)»)—. Debajo, cuando la
 * cantidad está en una medida, cuánto es en g/ml.
 *
 * Lo usan los cuatro editores que cargan alimentos. Es controlado (valor +
 * `onCambiar`) para servir igual a los formularios de react-hook-form y a los
 * que llevan su propio estado.
 *
 * `unidadEditable`: un alimento cargado a mano (sin lista de origen) puede
 * pasar de g a ml; uno de la lista no, porque sus macros son por 100 de SU
 * unidad y cambiarla los volvería falsos.
 */
export function CampoCantidadAlimento({
  valor,
  onCambiar,
  unidadEditable = false,
  className,
  altoCompacto = true,
}: {
  valor: CantidadEnFormulario;
  onCambiar: (nuevo: CantidadEnFormulario) => void;
  unidadEditable?: boolean;
  className?: string;
  altoCompacto?: boolean;
}) {
  const opciones = opcionesDeMedida(valor);
  const conMedida = valor.medida.trim() !== "";
  const gramos = gramosEnFormulario(valor);
  const simbolo = SIMBOLO_UNIDAD_BASE[valor.unidadBase];
  const alto = altoCompacto ? "h-8" : "h-9";

  function elegir(seleccion: string) {
    if (seleccion === VALOR_GRAMOS || seleccion === VALOR_MILILITROS) {
      onCambiar({
        ...cambiarMedida(valor, opciones[0]!),
        unidadBase: seleccion === VALOR_GRAMOS ? "GRAMO" : "MILILITRO",
      });
      return;
    }
    const opcion = opciones.find((o) => o.valor === seleccion);
    if (opcion) onCambiar(cambiarMedida(valor, opcion));
  }

  // Con la unidad editable, la base se elige entre g y ml en el mismo menú.
  const valorSelector =
    unidadEditable && !conMedida
      ? valor.unidadBase === "GRAMO"
        ? VALOR_GRAMOS
        : VALOR_MILILITROS
      : valorDeMedida(valor);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex gap-1">
        <Input
          className={cn(alto, "w-16 shrink-0 px-2")}
          inputMode="decimal"
          aria-label="Cantidad"
          placeholder={conMedida ? "1" : simbolo}
          value={conMedida ? valor.cantidadMedida : valor.cantidadGramos}
          onChange={(e) =>
            onCambiar(
              conMedida
                ? { ...valor, cantidadMedida: e.target.value }
                : { ...valor, cantidadGramos: e.target.value },
            )
          }
        />
        <Select value={valorSelector} onValueChange={elegir}>
          <SelectTrigger
            className={cn(alto, "min-w-0 flex-1 px-2 text-xs")}
            aria-label="Medida"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {unidadEditable ? (
              <>
                <SelectItem value={VALOR_GRAMOS}>g</SelectItem>
                <SelectItem value={VALOR_MILILITROS}>ml</SelectItem>
              </>
            ) : (
              <SelectItem value={VALOR_BASE}>{simbolo}</SelectItem>
            )}
            {opciones
              .filter((o) => o.medida)
              .map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {conMedida && (
        <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
          {gramos != null
            ? `= ${String(gramos).replace(".", ",")} ${simbolo}`
            : "—"}
        </p>
      )}
    </div>
  );
}
