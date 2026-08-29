"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/componentes/ui/dropdown-menu";

const OPCIONES = [
  { valor: "light", etiqueta: "Claro", icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", icono: Moon },
  { valor: "system", etiqueta: "Sistema", icono: Monitor },
] as const;

/**
 * Selector de tema claro/oscuro/sistema.
 * El guard `montado` evita el desajuste de hidratación: el tema real solo se
 * conoce en el cliente (localStorage / prefers-color-scheme).
 */
export function ToggleTema() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  if (!montado) {
    return (
      <Button variant="ghost" size="icon" aria-label="Cambiar tema" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPCIONES.map((opcion) => {
          const Icono = opcion.icono;
          return (
            <DropdownMenuItem
              key={opcion.valor}
              onClick={() => setTheme(opcion.valor)}
              className={
                theme === opcion.valor
                  ? "bg-accent text-accent-foreground"
                  : undefined
              }
            >
              <Icono className="h-4 w-4" />
              {opcion.etiqueta}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
