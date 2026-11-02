"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/componentes/ui/popover";

export interface OpcionSelector {
  id: string;
  nombre: string;
}

interface Props extends Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "id" | "aria-describedby" | "aria-invalid"
> {
  opciones: OpcionSelector[];
  valor: string | null;
  onCambiar: (id: string) => void;
  placeholder?: string;
  placeholderBusqueda?: string;
  cargando?: boolean;
  /** Lo que se muestra cuando la búsqueda no encuentra nada. */
  sinResultados?: ReactNode;
}

/**
 * Combobox con buscador para elegir UNA opción de una lista corta que viaja
 * entera (los deportes de la plataforma): filtra en la pantalla, sin ir al
 * servidor por cada tecla.
 *
 * Busca palabra por palabra y sin tildes ni mayúsculas, como el buscador de
 * pacientes: «futbol» encuentra «Fútbol» y «trail run» encuentra «Trail
 * running». Con el teclado: flechas para moverse, Enter para elegir.
 *
 * Recibe `id` y los `aria-*` de `FormControl` y se los pasa al botón, para
 * que la etiqueta y el mensaje de error del formulario queden atados a él.
 *
 * El Popover es `modal` porque se usa adentro de diálogos (el perfil
 * deportivo). La lista se monta en un portal, fuera del diálogo, y el bloqueo
 * de scroll del diálogo cancela la rueda del mouse en todo lo que no es suyo:
 * la lista no se deslizaba. Siendo modal, el Popover pone su propio bloqueo
 * encima, que deja deslizar su contenido.
 */
export function SelectorConBuscador({
  opciones,
  valor,
  onCambiar,
  placeholder = "Elegí una opción…",
  placeholderBusqueda = "Buscar…",
  cargando = false,
  sinResultados = "Sin resultados.",
  ...aria
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resaltada, setResaltada] = useState(0);

  const elegida = opciones.find((o) => o.id === valor) ?? null;
  const visibles = filtrarOpciones(opciones, busqueda);

  function elegir(opcion: OpcionSelector) {
    onCambiar(opcion.id);
    setAbierto(false);
    setBusqueda("");
  }

  return (
    <Popover
      modal
      open={abierto}
      onOpenChange={(a) => {
        setAbierto(a);
        if (!a) setBusqueda("");
        setResaltada(0);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          {...aria}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          className={cn(
            "w-full justify-between font-normal",
            !elegida && "text-muted-foreground",
          )}
        >
          <span className="truncate">{elegida?.nombre ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={placeholderBusqueda}
            aria-label={placeholderBusqueda}
            className="pl-8"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setResaltada(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setResaltada((i) => Math.min(i + 1, visibles.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setResaltada((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const opcion = visibles[resaltada];
                if (opcion) elegir(opcion);
              }
            }}
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1" role="listbox">
          {cargando ? (
            <p className="p-2 text-sm text-muted-foreground">Cargando…</p>
          ) : visibles.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {sinResultados}
            </div>
          ) : (
            visibles.map((opcion, i) => (
              <button
                key={opcion.id}
                type="button"
                role="option"
                aria-selected={opcion.id === valor}
                onClick={() => elegir(opcion)}
                onMouseEnter={() => setResaltada(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  i === resaltada && "bg-secondary",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    opcion.id === valor ? "opacity-100" : "opacity-0",
                  )}
                />
                <span>{opcion.nombre}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Las opciones cuyo nombre tiene TODAS las palabras buscadas, sin tildes ni
 * mayúsculas. Sin búsqueda, todas.
 */
export function filtrarOpciones<T extends OpcionSelector>(
  opciones: T[],
  busqueda: string,
): T[] {
  const palabras = normalizar(busqueda).split(" ").filter(Boolean);
  if (palabras.length === 0) return opciones;
  return opciones.filter((o) => {
    const nombre = normalizar(o.nombre);
    return palabras.every((p) => nombre.includes(p));
  });
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
