"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

export const esquema = z.object({
  nombre: z.string().min(1, "La carpeta necesita un nombre").max(80),
  descripcion: z.string().max(500),
});
export type DatosCarpeta = z.infer<typeof esquema>;

/** Una carpeta como la ve el navegador, sin saber de qué módulo viene. */
export interface CarpetaNavegable {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Cuántos elementos tiene adentro, ya contados para lo que se está listando. */
  cantidad: number;
}

interface Props {
  carpetas: CarpetaNavegable[];
  cargando: boolean;
  /** Carpeta abierta, o null en la raíz. */
  carpetaId: string | null;
  onAbrir: (carpetaId: string | null) => void;
  /**
   * Cómo se llama lo que se guarda adentro. El plural va explícito: derivarlo
   * agregando "es" servía para "plan" y rompía en "receta".
   */
  singular: string;
  plural: string;
  /** Ejemplos de nombre para el campo, propios del módulo. */
  ejemplos: string;
  onCrear: (datos: DatosCarpeta, alTerminar: () => void) => void;
  onActualizar: (
    id: string,
    datos: DatosCarpeta,
    alTerminar: () => void,
  ) => void;
  onEliminar: (id: string, alTerminar: () => void) => void;
  guardando: boolean;
  eliminando: boolean;
}

/**
 * Las carpetas como directorios: se ven, se abren y adentro se guarda.
 *
 * En la raíz lista las carpetas y debajo va lo que está suelto; abierta una,
 * muestra la ruta con la salida a la raíz y la pantalla pasa a listar solo lo
 * que hay adentro. Es a propósito la interacción de un explorador de archivos y
 * no un desplegable de filtro: "guardar el plan de Julia en la carpeta de
 * Julia" es una idea espacial, y un filtro no da la sensación de haber entrado
 * a ningún lado —además de que nada indica que la carpeta EXISTE hasta que la
 * desplegás—.
 *
 * No hay carpetas dentro de carpetas: un nivel alcanza para el volumen de un
 * consultorio, y el anidamiento traería mover, romper ciclos y migas de pan.
 *
 * Es compartido entre planes y recetario, y no dos componentes parecidos: los
 * dos módulos tienen que navegarse IGUAL —quien aprendió a ordenar sus planes
 * ya sabe ordenar sus recetas— y con dos copias eso dura hasta el primer arreglo
 * que se aplique en una sola.
 */
export function NavegadorCarpetas({
  carpetas,
  cargando,
  carpetaId,
  onAbrir,
  singular,
  plural,
  ejemplos,
  onCrear,
  onActualizar,
  onEliminar,
  guardando,
  eliminando,
}: Props) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<CarpetaNavegable | null>(null);
  const [porEliminar, setPorEliminar] = useState<CarpetaNavegable | null>(null);

  const form = useForm<DatosCarpeta>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", descripcion: "" },
  });

  const abierta = carpetas.find((c) => c.id === carpetaId) ?? null;

  function abrirNueva() {
    setEditando(null);
    form.reset({ nombre: "", descripcion: "" });
    setFormAbierto(true);
  }

  function abrirEdicion(carpeta: CarpetaNavegable) {
    setEditando(carpeta);
    form.reset({
      nombre: carpeta.nombre,
      descripcion: carpeta.descripcion ?? "",
    });
    setFormAbierto(true);
  }

  function alEnviar(datos: DatosCarpeta) {
    const cerrar = () => setFormAbierto(false);
    if (editando) {
      onActualizar(editando.id, datos, cerrar);
    } else {
      onCrear(datos, cerrar);
    }
  }

  return (
    <div className="space-y-3">
      {/* Ruta: dice dónde estás y es la salida. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav
          aria-label="Ruta de carpetas"
          className="flex items-center gap-1 text-sm"
        >
          <button
            type="button"
            onClick={() => onAbrir(null)}
            className={
              abierta
                ? "text-muted-foreground hover:text-foreground"
                : "font-medium text-foreground"
            }
          >
            Todos los {plural}
          </button>
          {abierta && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1.5 font-medium">
                <FolderOpen className="h-4 w-4 text-primary" />
                {abierta.nombre}
              </span>
            </>
          )}
        </nav>

        {!abierta && (
          <Button variant="outline" size="sm" onClick={abrirNueva}>
            <FolderPlus className="h-4 w-4" />
            Nueva carpeta
          </Button>
        )}
      </div>

      {abierta?.descripcion && (
        <p className="text-sm text-muted-foreground">{abierta.descripcion}</p>
      )}

      {/* Las carpetas solo se listan en la raíz: adentro estorbarían, porque no
          hay carpetas dentro de carpetas. */}
      {!abierta &&
        (cargando ? (
          <Skeleton className="h-16 w-full" />
        ) : carpetas.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {carpetas.map((carpeta) => (
              <li key={carpeta.id}>
                <div className="group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50">
                  <button
                    type="button"
                    onClick={() => onAbrir(carpeta.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Folder className="h-5 w-5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {carpeta.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {carpeta.cantidad}{" "}
                        {carpeta.cantidad === 1 ? singular : plural}
                      </span>
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Renombrar ${carpeta.nombre}`}
                    onClick={() => abrirEdicion(carpeta)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${carpeta.nombre}`}
                    onClick={() => setPorEliminar(carpeta)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Todavía no hay carpetas. Creá una para agrupar por paciente, por
            objetivo o como te sirva.
          </p>
        ))}

      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? "Renombrar carpeta" : "Nueva carpeta"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder={ejemplos} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                  {editando ? "Guardar" : "Crear carpeta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={porEliminar !== null}
        titulo="Eliminar carpeta"
        descripcion={`¿Eliminar «${porEliminar?.nombre ?? ""}»? Lo que tenga adentro NO se borra: los ${plural} quedan sin carpeta.`}
        cargando={eliminando}
        onCancelar={() => setPorEliminar(null)}
        onConfirmar={() => {
          if (!porEliminar) return;
          const id = porEliminar.id;
          onEliminar(id, () => {
            // Si se borró la carpeta abierta, la pantalla vuelve a la raíz:
            // quedarse "adentro" de algo que ya no existe muestra una lista
            // vacía sin explicar por qué.
            if (id === carpetaId) onAbrir(null);
            setPorEliminar(null);
          });
        }}
      />
    </div>
  );
}
