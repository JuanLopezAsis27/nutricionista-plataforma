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
import type { GrupoPlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
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

const esquema = z.object({
  nombre: z.string().min(1, "La carpeta necesita un nombre").max(80),
  descripcion: z.string().max(500),
});
type DatosFormulario = z.infer<typeof esquema>;

interface Props {
  /** Carpeta abierta, o null en la raíz. */
  carpetaId: string | null;
  onAbrir: (carpetaId: string | null) => void;
  /** Qué se está listando: decide qué número muestra cada carpeta. */
  esPlantilla: boolean;
}

/**
 * Las carpetas como directorios: se ven, se abren y adentro se guarda.
 *
 * En la raíz lista las carpetas y debajo van los planes sueltos; abierta una,
 * muestra la ruta con la salida a la raíz y la pantalla pasa a listar solo lo
 * que hay adentro. Es a propósito la interacción de un explorador de archivos y
 * no un desplegable de filtro: "guardar el plan de Julia en la carpeta de
 * Julia" es una idea espacial, y un filtro no da la sensación de haber entrado
 * a ningún lado —además de que nada indica que la carpeta EXISTE hasta que la
 * desplegás—.
 *
 * No hay carpetas dentro de carpetas: un nivel alcanza para el volumen de un
 * consultorio, y el anidamiento traería mover, romper ciclos y migas de pan.
 */
export function NavegadorCarpetas({ carpetaId, onAbrir, esPlantilla }: Props) {
  const {
    grupos: listarGrupos,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo,
  } = usePlanes();
  const consulta = listarGrupos();

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<GrupoPlanSalidaDto | null>(null);
  const [eliminando, setEliminando] = useState<GrupoPlanSalidaDto | null>(null);

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", descripcion: "" },
  });

  const carpetas = consulta.data ?? [];
  const abierta = carpetas.find((c) => c.id === carpetaId) ?? null;
  const cuantos = (carpeta: GrupoPlanSalidaDto): number =>
    esPlantilla ? carpeta.cantidadPlantillas : carpeta.cantidadPlanes;
  const etiqueta = esPlantilla ? "plantilla" : "plan";

  function abrirNueva() {
    setEditando(null);
    form.reset({ nombre: "", descripcion: "" });
    setFormAbierto(true);
  }

  function abrirEdicion(carpeta: GrupoPlanSalidaDto) {
    setEditando(carpeta);
    form.reset({
      nombre: carpeta.nombre,
      descripcion: carpeta.descripcion ?? "",
    });
    setFormAbierto(true);
  }

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      descripcion: datos.descripcion.trim() || null,
    };
    const cerrar = { onSuccess: () => setFormAbierto(false) };
    if (editando) {
      actualizarGrupo.mutate({ id: editando.id, ...cuerpo }, cerrar);
    } else {
      crearGrupo.mutate(cuerpo, cerrar);
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
            Todos los {etiqueta}es
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
        (consulta.isLoading ? (
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
                        {cuantos(carpeta)} {etiqueta}
                        {cuantos(carpeta) === 1 ? "" : "es"}
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
                    onClick={() => setEliminando(carpeta)}
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
                      <Input
                        placeholder="Julia Pérez, Descenso, Deportistas…"
                        {...field}
                      />
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
                <Button
                  type="submit"
                  disabled={crearGrupo.isPending || actualizarGrupo.isPending}
                >
                  {editando ? "Guardar" : "Crear carpeta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={eliminando !== null}
        titulo="Eliminar carpeta"
        descripcion={`¿Eliminar «${eliminando?.nombre ?? ""}»? Los planes que tenga adentro NO se borran: quedan sin carpeta.`}
        cargando={eliminarGrupo.isPending}
        onCancelar={() => setEliminando(null)}
        onConfirmar={() => {
          if (eliminando) {
            eliminarGrupo.mutate(
              { id: eliminando.id },
              {
                onSuccess: () => {
                  // Si se borró la carpeta abierta, la pantalla vuelve a la
                  // raíz: quedarse "adentro" de algo que ya no existe muestra
                  // una lista vacía sin explicar por qué.
                  if (eliminando.id === carpetaId) onAbrir(null);
                  setEliminando(null);
                },
              },
            );
          }
        }}
      />
    </div>
  );
}
