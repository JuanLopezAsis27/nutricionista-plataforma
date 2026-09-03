"use client";

import { Plus, Trash2, Star } from "lucide-react";
import {
  DIAS_SEMANA,
  ETIQUETA_DIA,
  type DiaSemana,
} from "@/dominio/entidades/PlanSemanal";
import { Button } from "@/componentes/ui/button";
import type { Macros } from "@/componentes/comunes/alimentos/macros";
import {
  tieneContenido,
  SIN_RECETA,
  type ComidaFormulario,
  type DatosFormulario,
} from "./esquema";
import { macrosDeComida, type MacrosDeRecetas } from "./totales";
import { estiloDeFranja } from "@/componentes/comunes/paletaFranjas";

interface Props {
  franjas: DatosFormulario["franjas"];
  recetas: { id: string; nombre: string }[];
  macrosDeRecetas: MacrosDeRecetas;
  totales: Record<DiaSemana, Macros>;
  onAgregar: (indiceFranja: number, dia: DiaSemana) => void;
  onEditar: (indiceFranja: number, indiceComida: number) => void;
  onQuitar: (indiceFranja: number, indiceComida: number) => void;
  onHacerPrincipal: (indiceFranja: number, indiceComida: number) => void;
}

/**
 * La grilla del plan semanal: una fila por franja, una columna por día.
 *
 * Cada celda puede tener VARIAS comidas: la primera es la principal —lleva la
 * estrella y es la que suma al total del día— y las que siguen son
 * alternativas suyas («o esto, o esto otro»). Por eso «Hacer principal» existe
 * como acción propia: cambiar cuál rige es una decisión, no un reordenamiento
 * cosmético, y es lo que mueve el total de la columna.
 *
 * La última fila muestra ese total, que es contra lo que después se compara
 * con las metas del paciente.
 *
 * ## Por qué las celdas son tan compactas
 *
 * La semana completa tiene que entrar de alto en el modal: una grilla que hay
 * que scrollear para ver la cena no deja comparar los días, que es para lo que
 * existe. Por eso cada comida ocupa una línea o dos —el texto completo está en
 * el `title` y en el editor— y las acciones destructivas aparecen al pasar por
 * encima en vez de ocupar lugar fijo.
 */
export function GrillaSemana({
  franjas,
  recetas,
  macrosDeRecetas,
  totales,
  onAgregar,
  onEditar,
  onQuitar,
  onHacerPrincipal,
}: Props) {
  const nombreDeReceta = new Map(recetas.map((r) => [r.id, r.nombre]));

  return (
    // A lo ancho: en pantallas grandes los siete días se reparten el espacio y
    // entran sin scroll (`lg:table-fixed`). En mobile eso daría columnas de
    // 40 px ilegibles, así que ahí la grilla conserva su ancho mínimo y se
    // barre de costado —una semana no entra en 375 px, y fingir que sí la
    // vuelve inservible—.
    <div className="overflow-x-auto lg:overflow-x-visible">
      <table className="w-full min-w-[56rem] border-separate border-spacing-0.5 text-sm lg:min-w-0 lg:table-fixed">
        {/* El encabezado y la fila de totales quedan pegados a los bordes del
            área que scrollea: sin eso, al mirar la cena ya no se sabe qué día
            es cada columna ni cuánto suma. */}
        <thead className="sticky top-0 z-20 bg-background">
          <tr>
            <th className="w-[7.5rem] text-left text-xs font-medium text-muted-foreground">
              Franja
            </th>
            {DIAS_SEMANA.map((dia) => (
              <th
                key={dia}
                className="text-center text-xs font-medium uppercase text-muted-foreground"
              >
                {ETIQUETA_DIA[dia]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {franjas.map((franja, indiceFranja) => {
            // El color es de la FILA y sale de su posición: ver paletaFranjas.
            const estilo = estiloDeFranja(indiceFranja);
            return (
              <tr key={indiceFranja} className="align-top">
                <th
                  className={`rounded-md border px-1.5 py-1 text-left align-middle ${estilo.rotulo}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${estilo.punto}`}
                    />
                    <span
                      className={`break-words text-xs font-semibold ${estilo.texto}`}
                    >
                      {franja.nombre || "Sin nombre"}
                    </span>
                  </span>
                  {(franja.horaDesde || franja.horaHasta) && (
                    <span className="block pl-3.5 text-xs font-normal text-muted-foreground">
                      {franja.horaDesde}
                      {franja.horaHasta ? ` – ${franja.horaHasta}` : ""}
                    </span>
                  )}
                </th>
                {DIAS_SEMANA.map((dia) => {
                  const celda = comidasDeCelda(franja.comidas, dia);
                  return (
                    <td key={dia} className="p-0 align-top">
                      <div
                        className={`space-y-0.5 rounded-md border p-1 ${estilo.celda}`}
                      >
                        {celda.map(({ comida, indice }, posicion) => {
                          const texto = resumen(comida, nombreDeReceta);
                          return (
                            <div
                              key={indice}
                              // La principal lleva el color de la franja; las
                              // alternativas, borde punteado: se distinguen sin
                              // depender del color.
                              className={`group/comida relative rounded-sm ${
                                posicion === 0
                                  ? estilo.principal
                                  : "border border-dashed"
                              }`}
                            >
                              {/* La comida ENTERA es el botón de editar: en
                                  celdas de este tamaño un lápiz aparte se come
                                  el espacio del texto, que es lo que hay que
                                  leer. */}
                              <button
                                type="button"
                                title={texto}
                                className="block w-full px-1 py-0.5 text-left"
                                onClick={() => onEditar(indiceFranja, indice)}
                              >
                                <span className="line-clamp-2 text-[0.7rem] leading-tight">
                                  {texto}
                                </span>
                                <span className="block text-[0.6rem] text-muted-foreground">
                                  {kcalDe(comida, macrosDeRecetas)}
                                </span>
                              </button>
                              {/* Hacer principal y quitar aparecen al pasar por
                                  encima o al tabular. Las dos están además en
                                  el editor, que es lo que las deja alcanzables
                                  sin hover. */}
                              <div className="absolute right-0.5 top-0.5 hidden gap-0.5 group-focus-within/comida:flex group-hover/comida:flex">
                                {posicion > 0 && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-5 w-5"
                                    title="Hacer principal (pasa a sumar al día)"
                                    onClick={() =>
                                      onHacerPrincipal(indiceFranja, indice)
                                    }
                                  >
                                    <Star className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon"
                                  className="h-5 w-5"
                                  title="Quitar"
                                  onClick={() => onQuitar(indiceFranja, indice)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-center p-0 text-[0.65rem] ${
                            celda.length === 0 ? "h-8" : "h-5"
                          }`}
                          title={
                            celda.length === 0
                              ? "Agregar comida"
                              : "Agregar una alternativa"
                          }
                          onClick={() => onAgregar(indiceFranja, dia)}
                        >
                          <Plus className="h-3 w-3" />
                          {celda.length === 0 && "Agregar"}
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-20 bg-background">
          <tr>
            <th className="px-1.5 py-1 text-left text-xs font-medium text-muted-foreground">
              Total del día
            </th>
            {DIAS_SEMANA.map((dia) => (
              <td key={dia} className="p-0.5 text-center">
                <span className="block text-sm font-medium">
                  {totales[dia].calorias != null
                    ? `${totales[dia].calorias} kcal`
                    : "—"}
                </span>
                <span className="block text-[0.65rem] text-muted-foreground">
                  {macrosEnTexto(totales[dia])}
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Las comidas de una celda con su índice dentro de la franja. */
function comidasDeCelda(
  comidas: ComidaFormulario[],
  dia: DiaSemana,
): { comida: ComidaFormulario; indice: number }[] {
  return comidas
    .map((comida, indice) => ({ comida, indice }))
    .filter(({ comida }) => comida.dia === dia);
}

/** Qué se lee en la celda: el texto, o la receta, o los alimentos. */
function resumen(
  comida: ComidaFormulario,
  nombreDeReceta: Map<string, string>,
): string {
  if (comida.descripcion.trim()) return comida.descripcion.trim();
  if (comida.recetaId !== SIN_RECETA) {
    return nombreDeReceta.get(comida.recetaId) ?? "Receta";
  }
  const alimentos = comida.items
    .map((item) => item.nombre.trim())
    .filter(Boolean);
  return alimentos.length > 0 ? alimentos.join(", ") : "Sin cargar";
}

function kcalDe(
  comida: ComidaFormulario,
  macrosDeRecetas: MacrosDeRecetas,
): string {
  if (!tieneContenido(comida)) return "";
  const macros = macrosDeComida(comida, macrosDeRecetas);
  return macros.calorias != null ? `${macros.calorias} kcal` : "sin macros";
}

function macrosEnTexto(macros: Macros): string {
  const partes = [
    macros.proteinasG != null && `${macros.proteinasG} P`,
    macros.carbohidratosG != null && `${macros.carbohidratosG} C`,
    macros.grasasG != null && `${macros.grasasG} G`,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "";
}
