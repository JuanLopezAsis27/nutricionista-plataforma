"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Share2 } from "lucide-react";
import type { MaterialSalidaDto } from "@/aplicacion/dtos/material.dto";
import { useBiblioteca } from "@/lib/hooks/useBiblioteca";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
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

export default function PaginaBiblioteca() {
  const { listarPaginado, eliminar } = useBiblioteca();

  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const debounced = useDebounce(busqueda, 300);
  const consulta = listarPaginado({
    texto: debounced || undefined,
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

  const materiales = consulta.data?.materiales ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar material…"
            className="pl-8"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
          />
        </div>
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

      {consulta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : consulta.isError ? (
        <p className="text-sm text-destructive">
          No se pudo cargar la biblioteca.
        </p>
      ) : materiales.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {debounced
            ? "No hay materiales que coincidan con la búsqueda."
            : "La biblioteca está vacía. Subí una guía o agregá un enlace."}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {materiales.map((material) => (
            <FilaMaterial
              key={material.id}
              material={material}
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
