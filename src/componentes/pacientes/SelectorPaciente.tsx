"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search, UserPlus } from "lucide-react";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/componentes/ui/popover";

interface PropsSelectorPaciente {
  valor: string | null;
  onCambiar: (pacienteId: string) => void;
  placeholder?: string;
  /**
   * Ofrece crear en el momento a quien no está cargado: solo nombre, apellido
   * y teléfono, sin email y sin portal. Es para agendar desde el calendario a
   * alguien que viene por primera vez; la ficha se completa después.
   */
  permitirAltaRapida?: boolean;
}

/**
 * Combobox con buscador para elegir un paciente.
 * Busca en el servidor con debounce y muestra el nombre seleccionado.
 */
export function SelectorPaciente({
  valor,
  onCambiar,
  placeholder = "Seleccionar paciente…",
  permitirAltaRapida = false,
}: PropsSelectorPaciente) {
  const { listar } = usePacientes();
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const debounced = useDebounce(busqueda, 300);

  const consulta = listar({
    pagina: 1,
    porPagina: 20,
    busqueda: debounced || undefined,
  });

  return (
    <Popover
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) setCreando(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal",
            !valor && "text-muted-foreground",
          )}
        >
          {valor && etiqueta ? etiqueta : placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {creando ? (
          <AltaRapidaPaciente
            texto={busqueda}
            onCreado={(id, nombre) => {
              onCambiar(id);
              setEtiqueta(nombre);
              setCreando(false);
              setAbierto(false);
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : (
          <>
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
                <p className="p-2 text-sm text-muted-foreground">
                  Sin resultados.
                </p>
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
                        className={cn(
                          "h-4 w-4",
                          valor === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span>{nombre}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {p.email ?? p.telefono ?? ""}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {permitirAltaRapida && (
              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() => setCreando(true)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-secondary"
                >
                  <UserPlus className="h-4 w-4" />
                  {busqueda.trim()
                    ? `Crear «${busqueda.trim()}» como paciente nuevo`
                    : "Crear un paciente nuevo"}
                </button>
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * El alta mínima, dentro del mismo desplegable: nombre, apellido y teléfono.
 * Sin email ni portal (se completan desde la ficha). Arranca con lo que se
 * buscó, partido en nombre y apellido.
 */
function AltaRapidaPaciente({
  texto,
  onCreado,
  onCancelar,
}: {
  texto: string;
  onCreado: (pacienteId: string, nombre: string) => void;
  onCancelar: () => void;
}) {
  const { crear } = usePacientes();
  const [palabras] = useState(() => texto.trim().split(/\s+/).filter(Boolean));
  const [nombre, setNombre] = useState(palabras[0] ?? "");
  const [apellido, setApellido] = useState(palabras.slice(1).join(" "));
  const [telefono, setTelefono] = useState("");

  function guardar() {
    crear.mutate(
      {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim() || null,
        email: null,
        acceso: null,
      },
      {
        onSuccess: (paciente) =>
          onCreado(paciente.id, `${paciente.nombre} ${paciente.apellido}`),
      },
    );
  }

  return (
    <div className="space-y-2 p-3">
      <p className="text-sm font-medium">Paciente nuevo</p>
      <Input
        autoFocus
        placeholder="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <Input
        placeholder="Apellido"
        value={apellido}
        onChange={(e) => setApellido(e.target.value)}
      />
      <Input
        placeholder="Teléfono (opcional)"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Queda sin email y sin portal: completá su ficha cuando quieras.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Volver
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!nombre.trim() || !apellido.trim() || crear.isPending}
          onClick={guardar}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
