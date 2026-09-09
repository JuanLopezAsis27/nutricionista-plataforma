"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import type { DiaSemana } from "@/dominio/entidades/PlanSemanal";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import { BuscadorAlimento } from "@/componentes/comunes/alimentos/BuscadorAlimento";
import type { Macros } from "@/componentes/comunes/alimentos/macros";
import {
  SIN_RECETA,
  itemVacio,
  comidaVacia,
  type ComidaFormulario,
  type ItemFormulario,
} from "./esquema";
import { macrosDeComida, type MacrosDeRecetas } from "./totales";

export interface RecetaElegible {
  id: string;
  nombre: string;
}

interface Props {
  abierto: boolean;
  /** Nombre de la franja y día, solo para el título del diálogo. */
  franja: string;
  dia: DiaSemana;
  etiquetaDia: string;
  /** La comida que se está editando, o null para una nueva alternativa. */
  comida: ComidaFormulario | null;
  recetas: RecetaElegible[];
  macrosDeRecetas: MacrosDeRecetas;
  onGuardar: (comida: ComidaFormulario) => void;
  /** Quitar la comida del plan. Ausente cuando se está creando una nueva. */
  onQuitar?: () => void;
  onCerrar: () => void;
}

/**
 * Editor de UNA comida del plan semanal: la celda de un día y una franja, o
 * una de sus alternativas.
 *
 * Las tres formas de cargarla conviven a propósito y se suman entre sí:
 *
 *  - **texto libre**, que es lo que el paciente lee («tostadas con palta»);
 *  - **una receta** del recetario, con sus porciones —de ahí salen sus macros
 *    ya calculados—;
 *  - **alimentos** buscados en la base nutricional, con gramos y macros por
 *    100 g.
 *
 * Se puede usar solo el texto: un menú entregado en palabras es un plan
 * válido, solo que sin macros para comparar. Los alimentos son lo que le da
 * números al día.
 *
 * El estado es local y no del formulario grande: mientras el diálogo está
 * abierto, lo que se escribe todavía no es parte del plan —cancelar tiene que
 * dejarlo como estaba—, y recién al guardar sube a la grilla.
 */
export function EditorComida({
  abierto,
  franja,
  dia,
  etiquetaDia,
  comida,
  recetas,
  macrosDeRecetas,
  onGuardar,
  onQuitar,
  onCerrar,
}: Props) {
  // El borrador arranca de la comida que llega y no se vuelve a sincronizar:
  // quien abre el editor lo remonta con una `key` por celda. Es a propósito
  // —si se sincronizara, cualquier refresco de la query de fondo pisaría lo
  // que se está escribiendo—.
  const [borrador, setBorrador] = useState<ComidaFormulario>(
    comida ?? comidaVacia(dia),
  );

  const macros: Macros = macrosDeComida(borrador, macrosDeRecetas);

  function cambiarItem(
    indice: number,
    campo: keyof ItemFormulario,
    valor: string,
  ) {
    setBorrador((actual) => ({
      ...actual,
      items: actual.items.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item,
      ),
    }));
  }

  function quitarItem(indice: number) {
    setBorrador((actual) => ({
      ...actual,
      items: actual.items.filter((_, i) => i !== indice),
    }));
  }

  function agregarItem(item: ItemFormulario) {
    setBorrador((actual) => ({ ...actual, items: [...actual.items, item] }));
  }

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {franja} · {etiquetaDia}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="descripcion-comida">Qué come</Label>
            <Textarea
              id="descripcion-comida"
              rows={2}
              placeholder="Tostadas con palta y queso + café"
              value={borrador.descripcion}
              onChange={(e) =>
                setBorrador((actual) => ({
                  ...actual,
                  descripcion: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Es lo que ve el paciente. Los alimentos de abajo son los que le
              ponen números al día.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <div className="space-y-1.5">
              <Label>Receta del recetario (opcional)</Label>
              <Select
                value={borrador.recetaId}
                onValueChange={(valor) =>
                  setBorrador((actual) => ({
                    ...actual,
                    recetaId: valor,
                    // Una receta recién elegida vale por una porción salvo que
                    // se diga otra cosa; sin receta, las porciones no aplican.
                    porciones:
                      valor === SIN_RECETA ? "" : actual.porciones || "1",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin receta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_RECETA}>Sin receta</SelectItem>
                  {recetas.map((receta) => (
                    <SelectItem key={receta.id} value={receta.id}>
                      {receta.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="porciones-comida">Porciones</Label>
              <Input
                id="porciones-comida"
                inputMode="decimal"
                placeholder="1"
                disabled={borrador.recetaId === SIN_RECETA}
                value={borrador.porciones}
                onChange={(e) =>
                  setBorrador((actual) => ({
                    ...actual,
                    porciones: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alimentos</Label>
            <BuscadorAlimento
              onElegir={(alimento) =>
                agregarItem({
                  ...itemVacio(),
                  nombre: alimento.marca
                    ? `${alimento.nombre} (${alimento.marca})`
                    : alimento.nombre,
                  cantidadGramos: "100",
                  caloriasPor100: textoDe(alimento.caloriasPor100),
                  proteinasPor100: textoDe(alimento.proteinasPor100),
                  carbohidratosPor100: textoDe(alimento.carbohidratosPor100),
                  grasasPor100: textoDe(alimento.grasasPor100),
                  fuente: alimento.fuente ?? "MANUAL",
                  referenciaExterna: alimento.referenciaExterna ?? "",
                })
              }
            />

            {borrador.items.map((item, indice) => (
              <div key={indice} className="rounded-md border border-dashed p-3">
                <div className="flex items-start gap-2">
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Alimento"
                    aria-label="Alimento"
                    value={item.nombre}
                    onChange={(e) =>
                      cambiarItem(indice, "nombre", e.target.value)
                    }
                  />
                  <Input
                    className="w-24 shrink-0"
                    inputMode="decimal"
                    placeholder="g"
                    aria-label="Gramos"
                    value={item.cantidadGramos}
                    onChange={(e) =>
                      cambiarItem(indice, "cantidadGramos", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar alimento"
                    className="shrink-0"
                    onClick={() => quitarItem(indice)}
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
                    <div key={campo} className="space-y-1">
                      <span className="text-[0.65rem] text-muted-foreground">
                        {etiqueta}
                      </span>
                      <Input
                        inputMode="decimal"
                        placeholder="—"
                        aria-label={etiqueta}
                        className="h-8"
                        value={item[campo]}
                        onChange={(e) =>
                          cambiarItem(indice, campo, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => agregarItem(itemVacio())}
            >
              <Plus className="h-4 w-4" />
              Cargar un alimento a mano
            </Button>
          </div>

          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">Esta comida: </span>
            {[
              macros.calorias != null && `${macros.calorias} kcal`,
              macros.proteinasG != null && `${macros.proteinasG} g P`,
              macros.carbohidratosG != null && `${macros.carbohidratosG} g C`,
              macros.grasasG != null && `${macros.grasasG} g G`,
            ]
              .filter(Boolean)
              .join(" · ") || "sin macros cargados"}
          </div>

          <div className="flex items-center justify-end gap-2">
            {/* Quitar también está acá y no solo en la grilla: en la celda
                aparece al pasar por encima, y con un touchpad o una pantalla
                táctil eso no alcanza. */}
            {onQuitar && (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive hover:text-destructive"
                onClick={onQuitar}
              >
                <Trash2 className="h-4 w-4" />
                Quitar comida
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onGuardar(borrador)}>
              Guardar comida
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function textoDe(valor: number | null | undefined): string {
  return valor == null ? "" : String(valor);
}
