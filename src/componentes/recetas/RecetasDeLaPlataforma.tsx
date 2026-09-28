"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { RecetaBaseSalidaDto } from "@/aplicacion/dtos/recetaBase.dto";
import { useRecetasBase } from "@/lib/hooks/useRecetasBase";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ControlesPaginacion } from "@/componentes/comunes/ControlesPaginacion";
import { FiltroEtiquetas } from "./FiltroEtiquetas";

const POR_PAGINA = 8;

/**
 * Las recetas predeterminadas de la plataforma, vistas desde un consultorio.
 *
 * No se usan en su lugar: «Agregar a mi recetario» hace una COPIA que desde
 * ahí es del profesional —la edita, le pone fotos, la comparte—. Si ya la
 * había agregado, la operación devuelve esa misma copia y no duplica.
 *
 * `alAgregar` recibe el id de la copia: el recetario la abre, el plan la deja
 * elegida en la opción.
 */
export function RecetasDeLaPlataforma({
  alAgregar,
  textoBoton = "Agregar a mi recetario",
}: {
  alAgregar?: (recetaId: string, nombre: string) => void;
  textoBoton?: string;
}) {
  const { listar, copiar, etiquetas } = useRecetasBase();
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const consultaEtiquetas = etiquetas(undefined, { staleTime: 60_000 });
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);
  const debounced = useDebounce(busqueda.trim(), 300);

  const consulta = listar({
    texto: debounced || undefined,
    etiqueta: etiqueta ?? undefined,
    pagina,
    porPagina: POR_PAGINA,
  });
  const recetas = consulta.data?.recetas ?? [];

  function agregar(receta: RecetaBaseSalidaDto) {
    copiar.mutate(
      { id: receta.id },
      {
        onSuccess: ({ recetaId }) => {
          toast.success(`«${receta.nombre}» está en tu recetario.`);
          alAgregar?.(recetaId, receta.nombre);
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar receta…"
          className="pl-9"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
        />
      </div>

      <FiltroEtiquetas
        etiquetas={consultaEtiquetas.data ?? []}
        elegida={etiqueta}
        onElegir={(e) => {
          setEtiqueta(e);
          setPagina(1);
        }}
      />

      {consulta.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : recetas.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {debounced || etiqueta
            ? "No hay recetas que coincidan con la búsqueda."
            : "La plataforma todavía no tiene recetas predeterminadas."}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {recetas.map((receta) => (
            <li key={receta.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-1 text-left"
                  onClick={() =>
                    setAbierta(abierta === receta.id ? null : receta.id)
                  }
                >
                  {abierta === receta.id ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">{receta.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {resumenMacros(receta)}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={copiar.isPending}
                  onClick={() => agregar(receta)}
                >
                  <Plus className="h-4 w-4" /> {textoBoton}
                </Button>
              </div>
              {abierta === receta.id && (
                <div className="mt-2 space-y-2 pl-5 text-sm">
                  {receta.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {receta.etiquetas.map((e) => (
                        <Badge key={e} variant="secondary">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {receta.descripcion && (
                    <p className="text-muted-foreground">
                      {receta.descripcion}
                    </p>
                  )}
                  {receta.ingredientes.length > 0 && (
                    <ul className="list-disc pl-4 text-xs">
                      {receta.ingredientes.map((ing, i) => (
                        <li key={i}>
                          {ing.nombre}
                          {ing.cantidadGramos != null &&
                            ` · ${ing.cantidadGramos} g`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {(consulta.data?.paginas ?? 1) > 1 && (
        <ControlesPaginacion
          pagina={pagina}
          totalPaginas={consulta.data?.paginas ?? 1}
          onCambiar={setPagina}
        />
      )}
    </div>
  );
}

function resumenMacros(r: RecetaBaseSalidaDto): string {
  const partes = [
    r.calorias != null && `${r.calorias} kcal`,
    r.proteinasG != null && `${r.proteinasG} g P`,
    r.carbohidratosG != null && `${r.carbohidratosG} g C`,
    r.grasasG != null && `${r.grasasG} g G`,
  ].filter(Boolean);
  const porciones = r.porciones ? `${r.porciones} porc. · ` : "";
  return partes.length > 0
    ? `${porciones}por porción: ${partes.join(" · ")}`
    : `${porciones}sin macros cargados`;
}
