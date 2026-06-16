"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/componentes/ui/popover";

interface PropsSelectorPaciente {
  valor: string | null;
  onCambiar: (pacienteId: string) => void;
  placeholder?: string;
}

/**
 * Combobox con buscador para elegir un paciente.
 * Busca en el servidor con debounce y muestra el nombre seleccionado.
 */
export function SelectorPaciente({
  valor,
  onCambiar,
  placeholder = "Seleccionar paciente…",
}: PropsSelectorPaciente) {
  const { listar } = usePacientes();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const debounced = useDebounce(busqueda, 300);

  const consulta = listar({ pagina: 1, porPagina: 20, busqueda: debounced || undefined });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", !valor && "text-muted-foreground")}
        >
          {valor && etiqueta ? etiqueta : placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar paciente…"
            className="pl-8"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {consulta.isLoading ? (
            <p className="p-2 text-sm text-muted-foreground">Buscando…</p>
          ) : (consulta.data?.pacientes ?? []).length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            consulta.data!.pacientes.map((p) => {
              const nombre = `${p.nombre} ${p.apellido}`;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onCambiar(p.id);
                    setEtiqueta(nombre);
                    setAbierto(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <Check
                    className={cn("h-4 w-4", valor === p.id ? "opacity-100" : "opacity-0")}
                  />
                  <span>{nombre}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.email}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
