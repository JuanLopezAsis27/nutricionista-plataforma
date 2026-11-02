"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Lock,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import type { CategoriaAlimentoSalidaDto } from "@/aplicacion/dtos/categoriaAlimento.dto";
import { LARGO_MAXIMO_NOMBRE_CATEGORIA } from "@/dominio/entidades/CategoriaAlimento";
import { useCategoriasAlimento } from "@/lib/hooks/useCategoriasAlimento";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Las categorías de alimento (migración 93).
 *
 * En un consultorio muestra las PREDETERMINADAS como rótulos fijos (no se
 * editan ni se borran: son de la plataforma) y debajo las PROPIAS, que se
 * crean, renombran y borran acá. En el panel del SUPERADMIN (`plataforma`)
 * gestiona las predeterminadas, con su orden, que es el de los filtros del
 * buscador.
 *
 * Borrar una categoría no borra alimentos: quedan sin categoría.
 */
export function GestorCategoriasAlimento({
  plataforma = false,
}: {
  plataforma?: boolean;
}) {
  const { categorias, editables, cargando, crear, renombrar, eliminar, mover } =
    useCategoriasAlimento(plataforma ? "plataforma" : "consultorio");
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [aEliminar, setAEliminar] = useState<CategoriaAlimentoSalidaDto | null>(
    null,
  );
  const predeterminadas = plataforma ? [] : categorias.filter((c) => !c.propia);

  function agregar() {
    const nombre = nueva.trim();
    if (!nombre) return;
    crear.mutate({ nombre }, { onSuccess: () => setNueva("") });
  }

  function guardarNombre() {
    if (!editando || !editando.nombre.trim()) return;
    renombrar.mutate(
      { id: editando.id, nombre: editando.nombre.trim() },
      { onSuccess: () => setEditando(null) },
    );
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <Tags className="h-4 w-4 text-primary" />
          {plataforma ? "Categorías predeterminadas" : "Categorías"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {plataforma
            ? "Las ven todos los consultorios, en este orden, como filtros del buscador. Cada consultorio puede sumar las suyas."
            : "Ordenan tus alimentos y son los filtros del buscador. Las predeterminadas son de la plataforma; podés crear las tuyas y asignárselas a tus alimentos."}
        </p>
      </div>

      {cargando ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <>
          {predeterminadas.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3" /> Predeterminadas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {predeterminadas.map((c) => (
                  <Badge key={c.id} variant="secondary">
                    {c.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {!plataforma && (
              <p className="text-xs font-medium text-muted-foreground">
                Mis categorías
              </p>
            )}
            {editables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {plataforma
                  ? "No hay categorías predeterminadas."
                  : "Todavía no creaste ninguna."}
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {editables.map((c, indice) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
                  >
                    {editando?.id === c.id ? (
                      <Input
                        className="h-8"
                        maxLength={LARGO_MAXIMO_NOMBRE_CATEGORIA}
                        aria-label="Nombre de la categoría"
                        value={editando.nombre}
                        onChange={(e) =>
                          setEditando({ id: c.id, nombre: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") guardarNombre();
                          if (e.key === "Escape") setEditando(null);
                        }}
                      />
                    ) : (
                      <span className="min-w-0 truncate">{c.nombre}</span>
                    )}
                    <span className="flex shrink-0 gap-0.5">
                      {editando?.id === c.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Guardar"
                            disabled={renombrar.isPending}
                            onClick={guardarNombre}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Cancelar"
                            onClick={() => setEditando(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {mover && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Subir"
                                disabled={indice === 0 || mover.isPending}
                                onClick={() =>
                                  mover.mutate({
                                    id: c.id,
                                    direccion: "ARRIBA",
                                  })
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Bajar"
                                disabled={
                                  indice === editables.length - 1 ||
                                  mover.isPending
                                }
                                onClick={() =>
                                  mover.mutate({ id: c.id, direccion: "ABAJO" })
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Renombrar"
                            onClick={() =>
                              setEditando({ id: c.id, nombre: c.nombre })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Eliminar"
                            onClick={() => setAEliminar(c)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={
                plataforma ? "Nueva categoría" : "Nueva categoría propia"
              }
              aria-label="Nombre de la categoría nueva"
              maxLength={LARGO_MAXIMO_NOMBRE_CATEGORIA}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregar()}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!nueva.trim() || crear.isPending}
              onClick={agregar}
            >
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </>
      )}

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar categoría"
        descripcion={`¿Eliminar «${aEliminar?.nombre}»? Los alimentos que la tienen quedan sin categoría${plataforma ? ", en todos los consultorios" : ""}.`}
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </section>
  );
}
