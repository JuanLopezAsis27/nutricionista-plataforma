"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Share2, Folder } from "lucide-react";
import { useRecetas } from "@/lib/hooks/useRecetas";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { VistaReceta } from "@/componentes/recetas/VistaReceta";
import { FormularioReceta } from "@/componentes/recetas/FormularioReceta";
import { CompartirReceta } from "@/componentes/recetas/CompartirReceta";

/**
 * Detalle de una receta, en su propia página y no en un diálogo.
 *
 * Una receta con documento adjunto no entra en un diálogo: el visor del PDF
 * ocupa una pantalla entera y adentro del modal quedaba un recuadro con scroll
 * propio, por encima del scroll del diálogo. Además una URL propia es lo que
 * hace que se pueda llegar a la receta desde el plan que la usa, volver con el
 * botón del navegador y compartir el enlace.
 *
 * Los datos salen de la query por id y NO de lo que haya listado el recetario:
 * esta pantalla edita lo que muestra, y una copia congelada en `useState`
 * seguiría mostrando lo viejo después de guardar (ver AGENTS.md).
 */
export default function PaginaDetalleReceta() {
  const params = useParams<{ id: string }>();
  const { obtenerPorId } = useRecetas();
  const [editar, setEditar] = useState(false);
  const [compartir, setCompartir] = useState(false);

  const receta = obtenerPorId({ id: params.id });

  if (receta.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (receta.isError || !receta.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No se encontró la receta.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/recetas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  const datos = receta.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link href="/dashboard/recetas">
            <ArrowLeft className="h-4 w-4" />
            Volver al recetario
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button onClick={() => setCompartir(true)}>
            <Share2 className="h-4 w-4" />
            Compartir con paciente
          </Button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{datos.nombre}</h2>
          {datos.grupoNombre && (
            <Badge variant="outline" className="gap-1">
              <Folder className="h-3 w-3" />
              {datos.grupoNombre}
            </Badge>
          )}
        </div>
      </div>

      <VistaReceta receta={datos} />

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar receta</DialogTitle>
          </DialogHeader>
          <FormularioReceta
            recetaInicial={datos}
            onTerminado={() => setEditar(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={compartir} onOpenChange={setCompartir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir «{datos.nombre}»</DialogTitle>
          </DialogHeader>
          <CompartirReceta recetaId={datos.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
