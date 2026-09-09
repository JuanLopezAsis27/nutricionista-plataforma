"use client";

import * as React from "react";
import { cn } from "@/lib/utilidades";

/**
 * Slider sobre `<input type="range">` nativo.
 *
 * Nativo y no Radix a propósito: el rango del navegador ya trae teclado
 * (flechas, Home/End), foco, `aria-valuenow` y soporte táctil sin JavaScript
 * extra ni una dependencia más. Lo único que agrega este envoltorio es el
 * pintado del tramo recorrido y el estilo del pulgar en los dos motores.
 *
 * Nunca va solo: quien lo usa acompaña con un input numérico, porque un
 * slider no permite tipear un valor exacto.
 */
export const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<
    React.ComponentPropsWithoutRef<"input">,
    "type" | "value" | "onChange"
  > & {
    value: number;
    min: number;
    max: number;
    step?: number;
    onValueChange: (valor: number) => void;
  }
>(({ className, value, min, max, step = 1, onValueChange, ...props }, ref) => {
  const recorrido = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <input
      ref={ref}
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(evento) => onValueChange(Number(evento.target.value))}
      className={cn(
        "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Pulgar: 18px para que sea cómodo con el dedo, con anillo del color
        // de la superficie para que se despegue de la barra.
        "[&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
        "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
        "[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow",
        "[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px]",
        "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
        "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary",
        className,
      )}
      // El tramo recorrido se pinta con un degradado duro sobre el fondo:
      // es la forma de teñirlo que funciona igual en WebKit y en Gecko.
      style={{
        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${recorrido}%, hsl(var(--muted)) ${recorrido}%, hsl(var(--muted)) 100%)`,
      }}
      {...props}
    />
  );
});
Slider.displayName = "Slider";
