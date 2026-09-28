"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import type { RecetaBaseSalidaDto } from "@/aplicacion/dtos/recetaBase.dto";
import { useRecetasBase } from "@/lib/hooks/useRecetasBase";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/componentes/ui/dialog";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { BuscadorAlimento } from "@/componentes/comunes/alimentos/BuscadorAlimento";
import {
  aNumero,
  calcularTotales,
  porPorcion,
  hayMacros,
} from "@/componentes/comunes/alimentos/macros";
import { partirEtiquetas } from "@/lib/validacionListas";

const POR_PAGINA = 10;

interface IngredienteBorrador {
  nombre: string;
  cantidadGramos: string;
  caloriasPor100: string;
  proteinasPor100: string;
  carbohidratosPor100: string;
  grasasPor100: string;
  fuente: string;
  /** Alimento del catálogo del que salió (migración 85); vacío si es a mano. */
  alimentoOrigenId: string;
}

interface Borrador {
  id: string | null;
  nombre: string;
  descripcion: string;
  porciones: string;
  preparacion: string;
  etiquetas: string;
  ingredientes: IngredienteBorrador[];
  /** Macros por porción a mano: solo cuentan si ningún ingrediente trae datos. */
  calorias: string;
  proteinasG: string;
  carbohidratosG: string;
  grasasG: string;
}

const texto = (v: number | null | undefined): string =>
  v == null ? "" : String(v);

function borradorVacio(): Borrador {
  return {
    id: null,
    nombre: "",
    descripcion: "",
    porciones: "1",
    preparacion: "",
    etiquetas: "",
    ingredientes: [],
    calorias: "",
    proteinasG: "",
    carbohidratosG: "",
    grasasG: "",
  };
}

function aBorrador(r: RecetaBaseSalidaDto): Borrador {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion ?? "",
    porciones: texto(r.porciones),
    preparacion: r.preparacion ?? "",
    etiquetas: r.etiquetas.join(", "),
    ingredientes: r.ingredientes.map((i) => ({
      nombre: i.nombre,
      cantidadGramos: texto(i.cantidadGramos),
      caloriasPor100: texto(i.caloriasPor100),
      proteinasPor100: texto(i.proteinasPor100),
      carbohidratosPor100: texto(i.carbohidratosPor100),
      grasasPor100: texto(i.grasasPor100),
      fuente: i.fuente ?? "MANUAL",
      alimentoOrigenId: i.alimentoOrigenId ?? "",
    })),
    calorias: r.macrosCalculados ? "" : texto(r.calorias),
    proteinasG: r.macrosCalculados ? "" : texto(r.proteinasG),
    carbohidratosG: r.macrosCalculados ? "" : texto(r.carbohidratosG),
    grasasG: r.macrosCalculados ? "" : texto(r.grasasG),
  };
}

function macrosEnTexto(r: {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}): string {
  return (
    [
      r.calorias != null && `${r.calorias} kcal`,
      r.proteinasG != null && `${r.proteinasG} P`,
      r.carbohidratosG != null && `${r.carbohidratosG} C`,
      r.grasasG != null && `${r.grasasG} G`,
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  );
}

/**
 * Catálogo de recetas de la plataforma (solo SUPERADMIN).
 *
 * Los consultorios las ven en su recetario y en el selector de recetas del
 * plan, y al usarlas se COPIAN a su recetario: editar una acá no cambia las
 * copias que ya existen. Por eso el aviso al guardar y al borrar.
 */
export function CatalogoRecetas() {
  const { listarAdmin, crear, actualizar, eliminar } = useRecetasBase();
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, 300);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aEliminar, setAEliminar] = useState<RecetaBaseSalidaDto | null>(null);

  const consulta = listarAdmin({
    pagina,
    porPagina: POR_PAGINA,
    texto: busquedaDebounced || undefined,
  });

  const columnas: ColumnaTabla<RecetaBaseSalidaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Receta",
      render: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          {r.etiquetas.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {r.etiquetas.join(", ")}
            </p>
          )}
        </div>
      ),
    },
    {
      clave: "porciones",
      encabezado: "Porciones",
      render: (r) => r.porciones ?? "—",
    },
    {
      clave: "macros",
      encabezado: "Por porción",
      render: (r) => <span className="text-xs">{macrosEnTexto(r)}</span>,
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Editar"
            onClick={() => setBorrador(aBorrador(r))}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Eliminar"
            onClick={() => setAEliminar(r)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  function guardar(b: Borrador) {
    const datos = {
      nombre: b.nombre.trim(),
      descripcion: b.descripcion.trim() || null,
      porciones: aNumero(b.porciones) ?? null,
      preparacion: b.preparacion.trim() || null,
      etiquetas: partirEtiquetas(b.etiquetas),
      ingredientes: b.ingredientes
        .filter((i) => i.nombre.trim() !== "")
        .map((i) => ({
          nombre: i.nombre.trim(),
          cantidadGramos: aNumero(i.cantidadGramos),
          caloriasPor100: aNumero(i.caloriasPor100),
          proteinasPor100: aNumero(i.proteinasPor100),
          carbohidratosPor100: aNumero(i.carbohidratosPor100),
          grasasPor100: aNumero(i.grasasPor100),
          fuente: i.fuente,
          alimentoOrigenId: i.alimentoOrigenId || null,
        })),
      calorias:
        aNumero(b.calorias) != null ? Math.round(aNumero(b.calorias)!) : null,
      proteinasG: aNumero(b.proteinasG),
      carbohidratosG: aNumero(b.carbohidratosG),
      grasasG: aNumero(b.grasasG),
    };
    const cerrar = { onSuccess: () => setBorrador(null) };
    if (b.id) actualizar.mutate({ id: b.id, ...datos }, cerrar);
    else crear.mutate(datos, cerrar);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Recetas que ven todos los consultorios. Cuando un profesional usa una,
        se copia a su recetario y desde ahí es suya: los cambios que hagas acá
        no alcanzan a las copias que ya existen.
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
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
        <Button size="sm" onClick={() => setBorrador(borradorVacio())}>
          <Plus className="h-4 w-4" /> Nueva receta
        </Button>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={consulta.data?.recetas ?? []}
        obtenerClave={(r) => r.id}
        cargando={consulta.isLoading}
        mensajeVacio={
          busquedaDebounced
            ? "No hay recetas que coincidan con la búsqueda."
            : "Todavía no hay recetas predeterminadas."
        }
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiarPagina={setPagina}
      />

      {borrador && (
        <Dialog open onOpenChange={(a) => !a && setBorrador(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {borrador.id ? "Editar receta" : "Nueva receta predeterminada"}
              </DialogTitle>
            </DialogHeader>
            <FormularioRecetaBase
              inicial={borrador}
              guardando={crear.isPending || actualizar.isPending}
              onGuardar={guardar}
            />
          </DialogContent>
        </Dialog>
      )}

      <ModalConfirmacion
        abierto={aEliminar != null}
        titulo="Eliminar receta del catálogo"
        descripcion={`¿Eliminar «${aEliminar?.nombre ?? ""}»? Los consultorios que ya la copiaron la conservan en su recetario.`}
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() =>
          aEliminar &&
          eliminar.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          )
        }
      />
    </div>
  );
}

/**
 * El formulario de una receta de la plataforma. Estado local: hasta guardar,
 * lo que se escribe no es parte del catálogo.
 *
 * Los macros por porción se calculan en vivo de los ingredientes (espejo de lo
 * que hace el dominio al guardar, ver `comunes/alimentos/macros`); los campos
 * a mano solo cuentan si ningún ingrediente trae datos.
 */
function FormularioRecetaBase({
  inicial,
  guardando,
  onGuardar,
}: {
  inicial: Borrador;
  guardando: boolean;
  onGuardar: (b: Borrador) => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const totales = calcularTotales(b.ingredientes);
  const calculados = hayMacros(totales);
  const porcion = porPorcion(totales, aNumero(b.porciones));

  const cambiarIngrediente = (
    indice: number,
    campo: keyof IngredienteBorrador,
    valor: string,
  ) =>
    setB((actual) => ({
      ...actual,
      ingredientes: actual.ingredientes.map((ing, i) =>
        i === indice ? { ...ing, [campo]: valor } : ing,
      ),
    }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="space-y-1.5">
          <Label htmlFor="rb-nombre">Nombre</Label>
          <Input
            id="rb-nombre"
            value={b.nombre}
            onChange={(e) => setB({ ...b, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rb-porciones">Porciones</Label>
          <Input
            id="rb-porciones"
            inputMode="numeric"
            value={b.porciones}
            onChange={(e) => setB({ ...b, porciones: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rb-descripcion">Descripción</Label>
        <Textarea
          id="rb-descripcion"
          rows={2}
          value={b.descripcion}
          onChange={(e) => setB({ ...b, descripcion: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rb-etiquetas">Etiquetas (separadas por coma)</Label>
        <Input
          id="rb-etiquetas"
          placeholder="vegetariano, sin TACC"
          value={b.etiquetas}
          onChange={(e) => setB({ ...b, etiquetas: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Ingredientes</Label>
        <BuscadorAlimento
          enCatalogo
          onElegir={(a) =>
            setB((actual) => ({
              ...actual,
              ingredientes: [
                ...actual.ingredientes,
                {
                  nombre: a.marca ? `${a.nombre} (${a.marca})` : a.nombre,
                  cantidadGramos: "100",
                  caloriasPor100: texto(a.caloriasPor100),
                  proteinasPor100: texto(a.proteinasPor100),
                  carbohidratosPor100: texto(a.carbohidratosPor100),
                  grasasPor100: texto(a.grasasPor100),
                  fuente: a.fuente,
                  alimentoOrigenId: a.id ?? "",
                },
              ],
            }))
          }
        />
        {b.ingredientes.map((ing, indice) => (
          <div key={indice} className="rounded-md border border-dashed p-2">
            <div className="flex gap-2">
              <Input
                className="min-w-0 flex-1"
                aria-label="Ingrediente"
                value={ing.nombre}
                onChange={(e) =>
                  cambiarIngrediente(indice, "nombre", e.target.value)
                }
              />
              <Input
                className="w-20 shrink-0"
                inputMode="decimal"
                placeholder="g"
                aria-label="Gramos"
                value={ing.cantidadGramos}
                onChange={(e) =>
                  cambiarIngrediente(indice, "cantidadGramos", e.target.value)
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar ingrediente"
                onClick={() =>
                  setB((actual) => ({
                    ...actual,
                    ingredientes: actual.ingredientes.filter(
                      (_, i) => i !== indice,
                    ),
                  }))
                }
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 pr-10">
              {(
                [
                  ["caloriasPor100", "kcal/100g"],
                  ["proteinasPor100", "P/100g"],
                  ["carbohidratosPor100", "C/100g"],
                  ["grasasPor100", "G/100g"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <Input
                  key={campo}
                  className="h-8"
                  inputMode="decimal"
                  placeholder={etiqueta}
                  aria-label={etiqueta}
                  value={ing[campo]}
                  onChange={(e) =>
                    cambiarIngrediente(indice, campo, e.target.value)
                  }
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setB((actual) => ({
              ...actual,
              ingredientes: [
                ...actual.ingredientes,
                {
                  nombre: "",
                  cantidadGramos: "",
                  caloriasPor100: "",
                  proteinasPor100: "",
                  carbohidratosPor100: "",
                  grasasPor100: "",
                  fuente: "MANUAL",
                  alimentoOrigenId: "",
                },
              ],
            }))
          }
        >
          <Plus className="h-4 w-4" /> Ingrediente a mano
        </Button>
      </div>

      {calculados ? (
        <p className="rounded-md bg-muted/50 p-2 text-sm">
          <span className="font-medium">Por porción: </span>
          {macrosEnTexto(porcion)}
        </p>
      ) : (
        <div className="space-y-1.5">
          <Label>Macros por porción (a mano, sin ingredientes con datos)</Label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["calorias", "kcal"],
                ["proteinasG", "P (g)"],
                ["carbohidratosG", "C (g)"],
                ["grasasG", "G (g)"],
              ] as const
            ).map(([campo, etiqueta]) => (
              <Input
                key={campo}
                inputMode="decimal"
                placeholder={etiqueta}
                aria-label={etiqueta}
                value={b[campo]}
                onChange={(e) => setB({ ...b, [campo]: e.target.value })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="rb-preparacion">Preparación</Label>
        <Textarea
          id="rb-preparacion"
          rows={4}
          value={b.preparacion}
          onChange={(e) => setB({ ...b, preparacion: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button
          disabled={b.nombre.trim() === "" || guardando}
          onClick={() => onGuardar(b)}
        >
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
