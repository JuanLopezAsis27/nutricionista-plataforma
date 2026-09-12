"use client";

import type { ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/componentes/ui/table";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ColumnaTabla<T> {
  clave: string;
  encabezado: string;
  /** Render personalizado de la celda. Si se omite, se muestra fila[clave]. */
  render?: (fila: T) => ReactNode;
  className?: string;
}

interface PropsTablaDatos<T> {
  columnas: ColumnaTabla<T>[];
  datos: T[];
  obtenerClave: (fila: T) => string;
  cargando?: boolean;
  mensajeVacio?: string;
  // Paginación (opcional)
  pagina?: number;
  totalPaginas?: number;
  onCambiarPagina?: (pagina: number) => void;
  // Selección de filas por checkbox (opcional): pasando estas tres props
  // aparece una columna de tilde a la izquierda, para acciones en lote.
  seleccionados?: Set<string>;
  onCambiarSeleccion?: (clave: string, marcado: boolean) => void;
  onCambiarSeleccionTodos?: (marcado: boolean) => void;
}

/**
 * Tabla genérica con columnas configurables, estados de carga (skeleton),
 * vacío y paginación integrada.
 */
export function TablaDatos<T>({
  columnas,
  datos,
  obtenerClave,
  cargando = false,
  mensajeVacio = "No hay datos para mostrar.",
  pagina,
  totalPaginas,
  onCambiarPagina,
  seleccionados,
  onCambiarSeleccion,
  onCambiarSeleccionTodos,
}: PropsTablaDatos<T>) {
  const hayPaginacion =
    pagina !== undefined &&
    totalPaginas !== undefined &&
    onCambiarPagina !== undefined;
  const haySeleccion =
    seleccionados !== undefined &&
    onCambiarSeleccion !== undefined &&
    onCambiarSeleccionTodos !== undefined;
  const todosSeleccionados =
    haySeleccion &&
    datos.length > 0 &&
    datos.every((fila) => seleccionados.has(obtenerClave(fila)));

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {haySeleccion && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={todosSeleccionados}
                    onChange={(e) => onCambiarSeleccionTodos(e.target.checked)}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
              )}
              {columnas.map((columna) => (
                <TableHead key={columna.clave} className={columna.className}>
                  {columna.encabezado}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {haySeleccion && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columnas.map((columna) => (
                    <TableCell key={columna.clave}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : datos.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnas.length + (haySeleccion ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {mensajeVacio}
                </TableCell>
              </TableRow>
            ) : (
              datos.map((fila) => {
                const clave = obtenerClave(fila);
                return (
                  <TableRow key={clave}>
                    {haySeleccion && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={seleccionados.has(clave)}
                          onChange={(e) =>
                            onCambiarSeleccion(clave, e.target.checked)
                          }
                          aria-label="Seleccionar fila"
                        />
                      </TableCell>
                    )}
                    {columnas.map((columna) => (
                      <TableCell
                        key={columna.clave}
                        className={columna.className}
                      >
                        {columna.render
                          ? columna.render(fila)
                          : aTexto(
                              (fila as Record<string, unknown>)[columna.clave],
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {hayPaginacion && totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onCambiarPagina(pagina - 1)}
            disabled={pagina <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onCambiarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Valor de celda a texto, sin caer nunca en "[object Object]".
 *
 * Una columna sin `render` se dibuja tal cual, y `String()` sobre un objeto
 * imprime "[object Object]" en la pantalla del profesional sin que nada falle.
 * Ante un valor no imprimible se muestra el guion: es lo mismo que ya se hace
 * con null, y deja claro que ahí falta un `render` en la definición de la
 * columna.
 */
function aTexto(valor: unknown): string {
  switch (typeof valor) {
    case "string":
      return valor;
    case "number":
    case "bigint":
    case "boolean":
      return valor.toString();
    default:
      // null, undefined, objetos, arrays, funciones y símbolos.
      return "—";
  }
}
