"use client";

import { KeyRound, Shuffle } from "lucide-react";
import { passwordNuevaDto } from "@/aplicacion/dtos/password";
import { cn } from "@/lib/utilidades";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";

/** Lo que eligió el profesional: generarla o escribirla él. */
export interface EleccionContrasena {
  modo: "GENERADA" | "MANUAL";
  /** Lo tipeado; solo cuenta en modo MANUAL. */
  valor: string;
}

export const ELECCION_CONTRASENA_INICIAL: EleccionContrasena = {
  modo: "GENERADA",
  valor: "",
};

/**
 * El error de la contraseña escrita, o null si se puede mandar. Es la misma
 * política del servidor (`passwordNuevaDto`): si el formulario aceptara lo que
 * el servidor rechaza, el botón mandaría y volvería con un error.
 */
export function errorEleccionContrasena(
  eleccion: EleccionContrasena,
): string | null {
  if (eleccion.modo === "GENERADA") return null;
  const resultado = passwordNuevaDto.safeParse(eleccion.valor);
  return resultado.success
    ? null
    : (resultado.error.issues[0]?.message ?? "Contraseña inválida");
}

/** Lo que viaja en `enviarBienvenidaManual`. */
export function contrasenaParaEnvio(
  eleccion: EleccionContrasena,
): { modo: "GENERADA" } | { modo: "MANUAL"; valor: string } {
  return eleccion.modo === "MANUAL"
    ? { modo: "MANUAL", valor: eleccion.valor }
    : { modo: "GENERADA" };
}

interface Props {
  valor: EleccionContrasena;
  onCambiar: (valor: EleccionContrasena) => void;
  /** Cuántos pacientes reciben la bienvenida: la escrita es la misma para todos. */
  cantidadPacientes: number;
  deshabilitado?: boolean;
}

/**
 * La contraseña que viaja en la bienvenida manual cuando la plantilla lleva
 * {{contrasena}}. La del alta ya no existe (se guarda solo su hash), así que
 * siempre es una NUEVA: la elige la app al azar o la escribe el profesional.
 */
export function EleccionContrasenaBienvenida({
  valor,
  onCambiar,
  cantidadPacientes,
  deshabilitado,
}: Props) {
  const error = valor.valor ? errorEleccionContrasena(valor) : null;

  const opciones = [
    {
      modo: "GENERADA" as const,
      icono: Shuffle,
      titulo: "Generarla",
      detalle:
        cantidadPacientes > 1 ? "Una distinta por paciente" : "Al azar, segura",
    },
    {
      modo: "MANUAL" as const,
      icono: KeyRound,
      titulo: "Escribirla yo",
      detalle:
        cantidadPacientes > 1 ? "La misma para todos" : "La que le indique",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Contraseña que se envía</p>
        <p className="text-xs text-muted-foreground">
          Se le asigna a la cuenta del paciente: la anterior deja de funcionar.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Contraseña que se envía"
        className="grid grid-cols-2 gap-2"
      >
        {opciones.map(({ modo, icono: Icono, titulo, detalle }) => {
          const activa = valor.modo === modo;
          return (
            <button
              key={modo}
              type="button"
              role="radio"
              aria-checked={activa}
              disabled={deshabilitado}
              onClick={() => onCambiar({ ...valor, modo })}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                activa
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/60 disabled:hover:bg-transparent",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icono className="h-4 w-4 text-primary" />
                {titulo}
              </span>
              <span className="text-xs text-muted-foreground">{detalle}</span>
            </button>
          );
        })}
      </div>
      {valor.modo === "MANUAL" && (
        <div className="space-y-1.5">
          <Label htmlFor="contrasena-bienvenida">Contraseña</Label>
          <Input
            id="contrasena-bienvenida"
            type="text"
            autoComplete="off"
            value={valor.valor}
            disabled={deshabilitado}
            aria-invalid={Boolean(error)}
            onChange={(e) => onCambiar({ ...valor, valor: e.target.value })}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
