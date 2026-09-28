"use client";

import { useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import type { AlimentoNutricionalSalidaDto } from "@/aplicacion/dtos/nutricion.dto";
import {
  CATEGORIAS_ALIMENTO,
  NOMBRES_CATEGORIA_ALIMENTO,
  type CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";
import { useNutricion } from "@/lib/hooks/useNutricion";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ImagenAlimento, urlImagenAlimento } from "./ImagenAlimento";

/** Cuántos resultados trae una búsqueda del modal. */
const LIMITE = 24;

const ETIQUETA_FUENTE: Record<string, string> = {
  PROPIO: "Mío",
  BASE: "Plataforma",
  OFF: "Open Food Facts",
};

/**
 * Buscar un alimento y agregarlo, con sus macros por 100 g, para no cargarlas
 * a mano.
 *
 * Es un botón que abre un MODAL de búsqueda (migración 84): con imágenes,
 * categorías y veinte resultados a la vista, una lista desplegable debajo de
 * un input quedaba chica. Elegir uno lo agrega y cierra el modal.
 *
 * En un consultorio busca en su lista, en los predeterminados de la
 * plataforma y, si no hay ninguno cargado, en Open Food Facts. En el panel del
 * SUPERADMIN (`enCatalogo`) busca solo en el catálogo de la plataforma: es con
 * lo que arma las recetas predeterminadas.
 *
 * Con una categoría elegida no hace falta escribir: es «mostrame los lácteos».
 * Open Food Facts no conoce nuestras categorías, así que con un filtro puesto
 * solo aparecen alimentos de las listas cargadas.
 */
export function BuscadorAlimento({
  onElegir,
  enCatalogo = false,
  textoBoton = "Buscar alimento",
}: {
  onElegir: (alimento: AlimentoNutricionalSalidaDto) => void;
  enCatalogo?: boolean;
  textoBoton?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAbierto(true)}
      >
        <Search className="h-4 w-4" /> {textoBoton}
      </Button>
      {/* Montado solo abierto: cada apertura arranca con la búsqueda vacía. */}
      {abierto && (
        <ModalBuscadorAlimento
          enCatalogo={enCatalogo}
          onCerrar={() => setAbierto(false)}
          onElegir={(alimento) => {
            onElegir(alimento);
            setAbierto(false);
          }}
        />
      )}
    </>
  );
}

function ModalBuscadorAlimento({
  enCatalogo,
  onElegir,
  onCerrar,
}: {
  enCatalogo: boolean;
  onElegir: (alimento: AlimentoNutricionalSalidaDto) => void;
  onCerrar: () => void;
}) {
  const { buscarAlimento } = useNutricion();
  const [termino, setTermino] = useState("");
  const [categoria, setCategoria] = useState<CategoriaAlimento | null>(null);
  const debounced = useDebounce(termino.trim(), 350);

  const habilitado = debounced.length >= 2 || categoria !== null;
  const delConsultorio = buscarAlimento(
    {
      termino: debounced,
      limite: LIMITE,
      categoria: categoria ?? undefined,
    },
    { enabled: habilitado && !enCatalogo, staleTime: 60_000 },
  );
  const delCatalogo = trpc.superadmin.listarAlimentosBase.useQuery(
    {
      busqueda: debounced || undefined,
      categoria: categoria ?? undefined,
      pagina: 1,
      porPagina: LIMITE,
    },
    { enabled: habilitado && enCatalogo, staleTime: 60_000 },
  );
  const consulta = enCatalogo ? delCatalogo : delConsultorio;
  const resultados: AlimentoNutricionalSalidaDto[] = enCatalogo
    ? (delCatalogo.data?.alimentos ?? []).map((a) => ({
        ...a,
        referenciaExterna: null,
        fuente: "BASE",
      }))
    : (delConsultorio.data ?? []);

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Buscar alimento</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-md border px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
            placeholder="Arroz, pollo, yogur…"
            aria-label="Buscar alimento"
            className="border-0 px-1 shadow-none focus-visible:ring-0"
          />
          {consulta.isFetching && habilitado && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrar por categoría"
        >
          <FiltroCategoria
            activo={categoria === null}
            onClick={() => setCategoria(null)}
          >
            Todas
          </FiltroCategoria>
          {CATEGORIAS_ALIMENTO.map((c) => (
            <FiltroCategoria
              key={c}
              activo={categoria === c}
              onClick={() => setCategoria(categoria === c ? null : c)}
            >
              {NOMBRES_CATEGORIA_ALIMENTO[c]}
            </FiltroCategoria>
          ))}
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto">
          {!habilitado ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Escribí al menos 2 letras o elegí una categoría.
            </p>
          ) : resultados.length === 0 && !consulta.isFetching ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin resultados.{" "}
              {categoria
                ? "Probá sin la categoría o con otro nombre."
                : "Cargalo a mano."}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {resultados.map((alimento, i) => (
                <li
                  key={`${alimento.fuente}-${alimento.id ?? alimento.referenciaExterna ?? alimento.nombre}-${i}`}
                >
                  <button
                    type="button"
                    onClick={() => onElegir(alimento)}
                    className="flex w-full items-center gap-3 rounded-md border p-2 text-left text-sm transition-colors hover:border-primary hover:bg-accent"
                  >
                    <ImagenAlimento
                      url={urlImagenAlimento(alimento)}
                      nombre={alimento.nombre}
                    />
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block truncate font-medium">
                        {alimento.nombre}
                        {alimento.marca && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {alimento.marca}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {macrosEnTexto(alimento)} (por 100 g)
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {alimento.categoria && (
                          <Badge variant="secondary" className="text-[0.65rem]">
                            {NOMBRES_CATEGORIA_ALIMENTO[alimento.categoria]}
                          </Badge>
                        )}
                        {!enCatalogo && (
                          <Badge variant="outline" className="text-[0.65rem]">
                            {ETIQUETA_FUENTE[alimento.fuente] ??
                              alimento.fuente}
                          </Badge>
                        )}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FiltroCategoria({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function macrosEnTexto(a: AlimentoNutricionalSalidaDto): string {
  return (
    [
      a.caloriasPor100 != null && `${a.caloriasPor100} kcal`,
      a.proteinasPor100 != null && `${a.proteinasPor100} P`,
      a.carbohidratosPor100 != null && `${a.carbohidratosPor100} C`,
      a.grasasPor100 != null && `${a.grasasPor100} G`,
    ]
      .filter(Boolean)
      .join(" · ") || "sin macros"
  );
}
