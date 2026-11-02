"use client";

import { useState } from "react";
import { Search, Loader2, Plus, ChevronDown } from "lucide-react";
import {
  LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS,
  type AlimentoNutricionalSalidaDto,
} from "@/aplicacion/dtos/nutricion.dto";
import { useNutricion } from "@/lib/hooks/useNutricion";
import { useCategoriasAlimento } from "@/lib/hooks/useCategoriasAlimento";
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
import { porCien } from "./cantidad";
import { SIMBOLO_UNIDAD_BASE } from "@/dominio/entidades/medidasAlimento";

/**
 * Cuántos resultados trae cada tanda del modal. «Mostrar más» pide la
 * siguiente, hasta `LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS`: nunca se trae la lista
 * entera de una vez. Más allá de ese tope se busca escribiendo.
 */
const TANDA = 24;

const ETIQUETA_FUENTE: Record<string, string> = {
  PROPIO: "Mío",
  BASE: "Plataforma",
  OFF: "Open Food Facts",
};

/**
 * Buscar un alimento y agregarlo, con sus macros por 100 g (o 100 ml) y sus
 * medidas caseras, para no cargarlas a mano.
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
 * Las categorías son las predeterminadas de la plataforma y, en un
 * consultorio, también las suyas (migración 93). Open Food Facts no conoce
 * nuestras categorías, así que con un filtro puesto solo aparecen alimentos
 * de las listas cargadas.
 *
 * Con «Todas» y sin escribir, el modal no arranca vacío: muestra los primeros
 * alimentos de las listas cargadas (los propios primero, por nombre) y
 * «Mostrar más» trae la siguiente tanda.
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
  const { categorias } = useCategoriasAlimento(
    enCatalogo ? "plataforma" : "consultorio",
  );
  const [termino, setTermino] = useState("");
  /** Id de la categoría elegida como filtro, o null para «Todas». */
  const [categoria, setCategoria] = useState<string | null>(null);
  const [limite, setLimite] = useState(TANDA);
  const debounced = useDebounce(termino.trim(), 350);
  // Una sola letra no es una búsqueda: se sigue hojeando.
  const busqueda = debounced.length >= 2 ? debounced : "";

  // Otra búsqueda u otra categoría vuelven a la primera tanda. Se ajusta al
  // renderizar y no en un efecto, para no pedir primero la tanda vieja.
  const [criterio, setCriterio] = useState({ busqueda, categoria });
  if (criterio.busqueda !== busqueda || criterio.categoria !== categoria) {
    setCriterio({ busqueda, categoria });
    setLimite(TANDA);
  }

  // Mientras llega la tanda siguiente se siguen viendo los que ya estaban.
  const opciones = {
    staleTime: 60_000,
    placeholderData: <T,>(previo: T | undefined) => previo,
  };
  const delConsultorio = buscarAlimento(
    {
      termino: busqueda,
      limite,
      categoriaId: categoria ?? undefined,
    },
    { ...opciones, enabled: !enCatalogo },
  );
  const delCatalogo = trpc.superadmin.listarAlimentosBase.useQuery(
    {
      busqueda: busqueda || undefined,
      categoriaId: categoria ?? undefined,
      pagina: 1,
      porPagina: limite,
    },
    { ...opciones, enabled: enCatalogo },
  );
  const consulta = enCatalogo ? delCatalogo : delConsultorio;
  const resultados: AlimentoNutricionalSalidaDto[] = enCatalogo
    ? (delCatalogo.data?.alimentos ?? []).map((a) => ({
        ...a,
        referenciaExterna: null,
        fuente: "BASE",
      }))
    : (delConsultorio.data ?? []);
  // Si la tanda vino llena, puede haber más.
  const hayMas = resultados.length >= limite;
  const enElTope = limite >= LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS;

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
          {consulta.isFetching && (
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
          {categorias.map((c) => (
            <FiltroCategoria
              key={c.id}
              activo={categoria === c.id}
              propia={c.propia}
              onClick={() => setCategoria(categoria === c.id ? null : c.id)}
            >
              {c.nombre}
            </FiltroCategoria>
          ))}
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto">
          {resultados.length === 0 && consulta.isFetching ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando alimentos…
            </p>
          ) : resultados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {busqueda || categoria ? "Sin resultados. " : ""}
              {categoria
                ? "Probá sin la categoría o con otro nombre."
                : busqueda
                  ? "Cargalo a mano."
                  : "Todavía no hay alimentos cargados: escribí para buscar."}
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
                        {macrosEnTexto(alimento)}
                        {alimento.cafeinaPor100 != null &&
                          ` · ${String(alimento.cafeinaPor100).replace(".", ",")} mg cafeína`}{" "}
                        (por {porCien(alimento.unidadBase)})
                      </span>
                      {alimento.descripcion && (
                        <span
                          className="line-clamp-2 block text-xs text-muted-foreground"
                          title={alimento.descripcion}
                        >
                          {alimento.descripcion}
                        </span>
                      )}
                      {alimento.medidas.length > 0 && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {alimento.medidas
                            .map(
                              (m) =>
                                `1 ${m.nombre} = ${String(m.cantidad).replace(".", ",")} ${SIMBOLO_UNIDAD_BASE[alimento.unidadBase]}`,
                            )
                            .join(" · ")}
                        </span>
                      )}
                      <span className="flex flex-wrap gap-1">
                        {alimento.categoria && (
                          <Badge variant="secondary" className="text-[0.65rem]">
                            {alimento.categoria.nombre}
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
          {hayMas && (
            <div className="flex flex-col items-center gap-1 pt-3">
              {enElTope ? (
                <p className="text-xs text-muted-foreground">
                  Hay más alimentos: escribí el nombre o elegí una categoría
                  para encontrarlos.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={consulta.isFetching}
                  onClick={() =>
                    setLimite((actual) =>
                      Math.min(
                        actual + TANDA,
                        LIMITE_MAXIMO_BUSQUEDA_ALIMENTOS,
                      ),
                    )
                  }
                >
                  {consulta.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Mostrar más
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FiltroCategoria({
  activo,
  propia = false,
  onClick,
  children,
}: {
  activo: boolean;
  /** Las propias del consultorio van con borde punteado: no son de todos. */
  propia?: boolean;
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
        propia && "border-dashed",
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
