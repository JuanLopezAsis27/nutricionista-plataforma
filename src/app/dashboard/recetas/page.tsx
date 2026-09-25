"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Share2, FolderInput } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { ControlesPaginacion } from "@/componentes/comunes/ControlesPaginacion";
import { TarjetaReceta } from "@/componentes/recetas/TarjetaReceta";
import { FormularioReceta } from "@/componentes/recetas/FormularioReceta";
import { CompartirReceta } from "@/componentes/recetas/CompartirReceta";
import { NavegadorCarpetas } from "@/componentes/recetas/NavegadorCarpetas";
import { MoverRecetaACarpeta } from "@/componentes/recetas/MoverRecetaACarpeta";

export default function PaginaRecetas() {
  const { listarPaginado, eliminar } = useRecetas();
  const router = useRouter();

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  /** Carpeta abierta. `null` es la raíz. */
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const debounced = useDebounce(busqueda.trim(), 300);
  const buscando = debounced.length > 0;

  // La raíz lista las SUELTAS (grupoId: null) y no todas: si mostrara todas,
  // las recetas de las carpetas aparecerían dos veces —arriba en la carpeta y
  // abajo en la lista— y entrar a una carpeta no cambiaría nada.
  //
  // El buscador respeta esa misma vista, igual que en planes: en la raíz filtra
  // las carpetas por su nombre (lo hace el navegador) y las sueltas por el
  // suyo; adentro de una carpeta, solo sus recetas. La receta guardada en
  // «Desayunos» se encuentra buscando la carpeta, que es como se la guardó.
  const filtroCarpeta = carpetaId;

  function abrirCarpeta(id: string | null) {
    setCarpetaId(id);
    setPagina(1);
    // Lo escrito buscaba en el lugar que se deja: arrastrarlo adentro de la
    // carpeta que se acaba de encontrar la mostraría vacía.
    setBusqueda("");
  }

  function buscar(texto: string) {
    setBusqueda(texto);
    setPagina(1);
  }

  const consulta = listarPaginado({
    texto: debounced || undefined,
    grupoId: filtroCarpeta,
    pagina,
    porPagina: 10,
  });

  const [formAbierto, setFormAbierto] = useState(false);
  const [recetaEditar, setRecetaEditar] = useState<RecetaSalidaDto | null>(
    null,
  );
  const [recetaCompartir, setRecetaCompartir] =
    useState<RecetaSalidaDto | null>(null);
  const [recetaEliminar, setRecetaEliminar] = useState<RecetaSalidaDto | null>(
    null,
  );
  const [recetaMover, setRecetaMover] = useState<RecetaSalidaDto | null>(null);

  const recetas = consulta.data?.recetas ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => {
            setRecetaEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva receta
        </Button>
      </div>

      <NavegadorCarpetas
        carpetaId={carpetaId}
        onAbrir={abrirCarpeta}
        busqueda={busqueda}
        onBuscar={buscar}
      />

      {consulta.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-52 w-full" />
          ))}
        </div>
      ) : consulta.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar las recetas.
        </p>
      ) : recetas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {buscando
            ? carpetaId
              ? "No hay recetas en esta carpeta que coincidan con la búsqueda."
              : "No hay recetas sueltas que coincidan con la búsqueda."
            : carpetaId
              ? "Esta carpeta está vacía. Mové una receta acá adentro desde la lista."
              : "No hay recetas sueltas. Las que estén en una carpeta se ven al abrirla."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recetas.map((receta) => (
            <TarjetaReceta
              key={receta.id}
              receta={receta}
              // La receta se abre en su propia página, como un plan: el
              // documento que pueda tener necesita la pantalla entera.
              onVer={() => router.push(`/dashboard/recetas/${receta.id}`)}
              acciones={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Compartir con paciente"
                    onClick={() => setRecetaCompartir(receta)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mover a una carpeta"
                    onClick={() => setRecetaMover(receta)}
                  >
                    <FolderInput className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => {
                      setRecetaEditar(receta);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    onClick={() => setRecetaEliminar(receta)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <ControlesPaginacion
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiar={setPagina}
      />

      {/* Alta / edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {recetaEditar ? "Editar receta" : "Nueva receta"}
            </DialogTitle>
          </DialogHeader>
          <FormularioReceta
            recetaInicial={recetaEditar}
            grupoIdInicial={carpetaId}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Compartir */}
      <Dialog
        open={Boolean(recetaCompartir)}
        onOpenChange={(abierto) => !abierto && setRecetaCompartir(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir «{recetaCompartir?.nombre}»</DialogTitle>
          </DialogHeader>
          {recetaCompartir && <CompartirReceta recetaId={recetaCompartir.id} />}
        </DialogContent>
      </Dialog>

      <MoverRecetaACarpeta
        receta={recetaMover}
        onCerrar={() => setRecetaMover(null)}
      />

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={Boolean(recetaEliminar)}
        titulo="Eliminar receta"
        descripcion={`¿Seguro que querés eliminar «${recetaEliminar?.nombre}»? Se borran también sus fotos.`}
        cargando={eliminar.isPending}
        onCancelar={() => setRecetaEliminar(null)}
        onConfirmar={() => {
          if (!recetaEliminar) return;
          eliminar.mutate(
            { id: recetaEliminar.id },
            { onSuccess: () => setRecetaEliminar(null) },
          );
        }}
      />
    </div>
  );
}
