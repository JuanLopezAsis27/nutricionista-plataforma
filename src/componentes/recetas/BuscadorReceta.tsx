"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, X, ChefHat } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/componentes/ui/tabs";
import { FiltroEtiquetas } from "./FiltroEtiquetas";
import { RecetasDeLaPlataforma } from "./RecetasDeLaPlataforma";

/** Una receta del recetario que se puede elegir. */
export interface RecetaParaElegir {
  id: string;
  nombre: string;
  etiquetas: string[];
  /** Foto que la representa (se sirve por /api/archivos/<id>/ver). */
  fotoId: string | null;
  /** Macros POR PORCIÓN. */
  macros: {
    calorias: number | null;
    proteinasG: number | null;
    carbohidratosG: number | null;
    grasasG: number | null;
  };
}

/**
 * Elegir la receta de una opción del plan: un botón con la receta elegida que
 * abre un MODAL de búsqueda (migración 84).
 *
 * Dos pestañas: el recetario del consultorio —filtrable por texto y por
 * etiqueta, con la foto de cada una— y las recetas de la plataforma, que al
 * usarse se COPIAN al recetario (ver `CopiarRecetaBaseAlRecetario`) y quedan
 * elegidas. Un desplegable con todas las recetas dejaba de servir pasadas las
 * veinte: no se podía buscar ni filtrar.
 *
 * El recetario ya está cargado en el formulario (lo necesita para sumar
 * macros), así que su filtro es local; el de la plataforma va al servidor.
 */
export function BuscadorReceta({
  recetaId,
  recetas,
  onCambiar,
}: {
  /** La elegida, o null. */
  recetaId: string | null;
  recetas: RecetaParaElegir[];
  onCambiar: (recetaId: string | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const elegida = recetas.find((r) => r.id === recetaId);

  return (
    <div className="flex min-w-0 items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-0 max-w-72 justify-start text-xs"
        onClick={() => setAbierto(true)}
        aria-label={
          recetaId
            ? `Receta vinculada: ${elegida?.nombre ?? ""}`
            : "Elegir receta"
        }
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {recetaId ? (elegida?.nombre ?? "Receta") : "Elegir receta"}
        </span>
      </Button>
      {recetaId && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Quitar receta"
          onClick={() => onCambiar(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {abierto && (
        <Dialog open onOpenChange={(a) => !a && setAbierto(false)}>
          <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-3">
            <DialogHeader>
              <DialogTitle>Elegir receta</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="recetario" className="flex min-h-0 flex-col">
              <TabsList className="self-start">
                <TabsTrigger value="recetario">Mi recetario</TabsTrigger>
                <TabsTrigger value="plataforma">De la plataforma</TabsTrigger>
              </TabsList>
              <TabsContent
                value="recetario"
                className="mt-3 min-h-0 flex-1 overflow-y-auto"
              >
                <MiRecetario
                  recetas={recetas}
                  elegidaId={recetaId}
                  onElegir={(id) => {
                    onCambiar(id);
                    setAbierto(false);
                  }}
                />
              </TabsContent>
              <TabsContent
                value="plataforma"
                className="mt-3 min-h-0 flex-1 overflow-y-auto"
              >
                <p className="mb-2 text-xs text-muted-foreground">
                  Al usarla se copia a tu recetario y queda elegida en la
                  opción.
                </p>
                <RecetasDeLaPlataforma
                  textoBoton="Usar"
                  alAgregar={(id) => {
                    onCambiar(id);
                    setAbierto(false);
                  }}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MiRecetario({
  recetas,
  elegidaId,
  onElegir,
}: {
  recetas: RecetaParaElegir[];
  elegidaId: string | null;
  onElegir: (id: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [etiqueta, setEtiqueta] = useState<string | null>(null);

  const etiquetas = useMemo(
    () =>
      [...new Set(recetas.flatMap((r) => r.etiquetas))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [recetas],
  );
  const buscado = texto.trim().toLowerCase();
  const visibles = recetas.filter(
    (r) =>
      (!etiqueta || r.etiquetas.includes(etiqueta)) &&
      (!buscado || r.nombre.toLowerCase().includes(buscado)),
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar en tu recetario…"
          aria-label="Buscar en tu recetario"
          className="pl-9"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <FiltroEtiquetas
        etiquetas={etiquetas}
        elegida={etiqueta}
        onElegir={setEtiqueta}
      />
      {visibles.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {recetas.length === 0
            ? "Tu recetario está vacío. Mirá las de la plataforma."
            : "No hay recetas que coincidan."}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visibles.map((receta) => (
            <li key={receta.id}>
              <button
                type="button"
                onClick={() => onElegir(receta.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent",
                  receta.id === elegidaId && "border-primary bg-primary/5",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {receta.fotoId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable
                    <img
                      src={`/api/archivos/${receta.fotoId}/ver`}
                      alt={receta.nombre}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ChefHat
                      className="h-6 w-6 text-muted-foreground/60"
                      aria-hidden
                    />
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {receta.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {macrosEnTexto(receta.macros)}
                  </span>
                  {receta.etiquetas.length > 0 && (
                    <span className="block truncate text-[0.7rem] text-muted-foreground">
                      {receta.etiquetas.join(" · ")}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function macrosEnTexto(m: RecetaParaElegir["macros"]): string {
  const partes = [
    m.calorias != null && `${m.calorias} kcal`,
    m.proteinasG != null && `${m.proteinasG} g P`,
    m.carbohidratosG != null && `${m.carbohidratosG} g C`,
    m.grasasG != null && `${m.grasasG} g G`,
  ].filter(Boolean);
  return partes.length > 0
    ? `Por porción: ${partes.join(" · ")}`
    : "Sin macros cargados";
}
