"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, Pencil, FileDown, Copy } from "lucide-react";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { VistaPlan } from "@/componentes/planes/VistaPlan";
import { FormularioPlan } from "@/componentes/planes/FormularioPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";

export default function PaginaDetallePlan() {
  const params = useParams<{ id: string }>();
  const { obtenerPorId, crearDesdePlantilla } = usePlanes();
  const [asignar, setAsignar] = useState(false);
  const [editar, setEditar] = useState(false);

  const plan = obtenerPorId({ id: params.id });

  if (plan.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (plan.isError || !plan.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No se encontró el plan.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/planes">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  const datos = plan.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/dashboard/planes">
            <ArrowLeft className="h-4 w-4" />
            Volver a planes
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/api/planes/${datos.id}/pdf`} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" />
              PDF
            </a>
          </Button>
          <Button variant="outline" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          {datos.esPlantilla ? (
            <Button
              onClick={() =>
                crearDesdePlantilla.mutate({ planOrigenId: datos.id, esPlantilla: false })
              }
              disabled={crearDesdePlantilla.isPending}
            >
              <Copy className="h-4 w-4" />
              Crear plan desde plantilla
            </Button>
          ) : (
            <Button onClick={() => setAsignar(true)}>
              <UserPlus className="h-4 w-4" />
              Asignar a paciente
            </Button>
          )}
        </div>
      </div>

      <VistaPlan plan={datos} />

      <Dialog open={asignar} onOpenChange={setAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{datos.nombre}»</DialogTitle>
          </DialogHeader>
          <FormularioAsignacionPlan planId={datos.id} onTerminado={() => setAsignar(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
          </DialogHeader>
          <FormularioPlan planInicial={datos} onTerminado={() => setEditar(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
