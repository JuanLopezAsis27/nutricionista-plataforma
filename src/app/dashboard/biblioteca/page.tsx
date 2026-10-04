"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Share2,
  FolderInput,
  FolderOutput,
} from "lucide-react";
import type { MaterialSalidaDto } from "@/aplicacion/dtos/material.dto";
import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
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
import { FormularioMaterial } from "@/componentes/biblioteca/FormularioMaterial";
import { CompartirMaterial } from "@/componentes/biblioteca/CompartirMaterial";
import { FilaMaterial } from "@/componentes/biblioteca/FilaMaterial";
import { NavegadorCarpetas } from "@/componentes/biblioteca/NavegadorCarpetas";
import { propsArrastrable } from "@/componentes/comunes/NavegadorCarpetas";
import { MoverMaterialACarpeta } from "@/componentes/biblioteca/MoverMaterialACarpeta";

export default function PaginaBiblioteca() {
  const { listarPaginado, eliminar, mover } = useBiblioteca();

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  /** Carpeta abierta. `null` es la raíz. */
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const debounced = useDebounce(busqueda.trim(), 300);
  const buscando = debounced.length > 0;

  // Igual que en planes y recetas: la raíz lista los SUELTOS (grupoId: null),
  // no todos, o lo guardado en carpetas aparecería dos veces. El buscador
  // respeta esa vista: en la raíz filtra las carpetas por su nombre (lo hace
  // el navegador) y los sueltos por el suyo; adentro de una carpeta, solo lo
  // que hay adentro.
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
    grupoId: carpetaId,
    pagina,
    porPagina: 10,
  });

  const [formAbierto, setFormAbierto] = useState(false);
  const [materialEditar, setMaterialEditar] =
    useState<MaterialSalidaDto | null>(null);
  const [materialCompartir, setMaterialCompartir] =
    useState<MaterialSalidaDto | null>(null);
  const [materialEliminar, setMaterialEliminar] =
    useState<MaterialSalidaDto | null>(null);
  const [materialMover, setMaterialMover] = useState<MaterialSalidaDto | null>(
    null,
  );

  const materiales = consulta.data?.materiales ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => {
            setMaterialEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo material
        </Button>
      </div>

      <NavegadorCarpetas
        carpetaId={carpetaId}
        onAbrir={abrirCarpeta}
        busqueda={busqueda}
        onBuscar={buscar}
      />

      {consulta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : consulta.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar la biblioteca.
        </p>
      ) : materiales.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {buscando
            ? carpetaId
              ? "No hay materiales en esta carpeta que coincidan con la búsqueda."
              : "No hay materiales sueltos que coincidan con la búsqueda."
            : carpetaId
              ? "Esta carpeta está vacía. Mové un material acá adentro desde la lista."
              : "No hay materiales sueltos. Los que estén en una carpeta se ven al abrirla."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {materiales.map((material) => (
            <FilaMaterial
              key={material.id}
              material={material}
              arrastre={
                carpetaId === null ? propsArrastrable(material.id) : undefined
              }
              acciones={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Compartir con paciente"
                    onClick={() => setMaterialCompartir(material)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Mover a una carpeta"
                    onClick={() => setMaterialMover(material)}
                  >
                    <FolderInput className="h-4 w-4" />
                  </Button>
                  {carpetaId !== null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Sacar de la carpeta"
                      disabled={mover.isPending}
                      onClick={() =>
                        mover.mutate({ materialId: material.id, grupoId: null })
                      }
                    >
                      <FolderOutput className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Editar"
                    onClick={() => {
                      setMaterialEditar(material);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Eliminar"
                    onClick={() => setMaterialEliminar(material)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              }
            />
          ))}
        </ul>
      )}

      <ControlesPaginacion
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiar={setPagina}
      />

      {/* Alta / edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {materialEditar ? "Editar material" : "Nuevo material"}
            </DialogTitle>
          </DialogHeader>
          <FormularioMaterial
            materialInicial={materialEditar}
            grupoIdInicial={carpetaId}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Compartir */}
      <Dialog
        open={Boolean(materialCompartir)}
        onOpenChange={(abierto) => !abierto && setMaterialCompartir(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir «{materialCompartir?.titulo}»</DialogTitle>
          </DialogHeader>
          {materialCompartir && (
            <CompartirMaterial materialId={materialCompartir.id} />
          )}
        </DialogContent>
      </Dialog>

      <MoverMaterialACarpeta
        material={materialMover}
        onCerrar={() => setMaterialMover(null)}
      />

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={Boolean(materialEliminar)}
        titulo="Eliminar material"
        descripcion={`¿Eliminar «${materialEliminar?.titulo}» de la biblioteca?${
          materialEliminar?.tipo === "ARCHIVO"
            ? " Se borra también el archivo."
            : ""
        }`}
        cargando={eliminar.isPending}
        onCancelar={() => setMaterialEliminar(null)}
        onConfirmar={() => {
          if (!materialEliminar) return;
          eliminar.mutate(
            { id: materialEliminar.id },
            { onSuccess: () => setMaterialEliminar(null) },
          );
        }}
      />
    </div>
  );
}
