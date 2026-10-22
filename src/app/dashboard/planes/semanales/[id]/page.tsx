"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { VistaPlanSemanal } from "@/componentes/planes-semanales/VistaPlanSemanal";
import { FormularioPlanSemanal } from "@/componentes/planes-semanales/FormularioPlanSemanal";
import { FormularioAsignacionPlanSemanal } from "@/componentes/planes-semanales/FormularioAsignacionPlanSemanal";
import { PacientesDelPlanSemanal } from "@/componentes/planes-semanales/PacientesDelPlanSemanal";
import {
  CLASES_DIALOGO_PLAN_SEMANAL,
  RUTA_PLANES_SEMANALES,
} from "@/componentes/planes-semanales/rutas";

/**
 * La página de un plan semanal: el menú con sus metas, quién lo tiene y las
 * acciones (editar, asignar, eliminar).
 *
 * Se veía en un diálogo y ahora es una página, como un plan nutricional
 * (`/dashboard/planes/[id]`): una semana de 42 celdas más la comparación de
 * macros no entra cómoda en un modal, y con URL propia se llega desde la
 * ficha del paciente y se puede volver a ella. Editar sigue siendo un
 * diálogo, igual que en los planes.
 *
 * Lee el plan de su query por id (no de una copia guardada al abrir): al
 * editarlo, la invalidación lo refresca solo.
 */
export default function PaginaPlanSemanal() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { obtenerPorId, eliminar } = usePlanesSemanales();
  const [editar, setEditar] = useState(false);
  const [asignar, setAsignar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const plan = obtenerPorId({ id: params.id });

  if (plan.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (plan.isError || !plan.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          No se encontró el plan semanal.
        </p>
        <Button asChild variant="outline">
          <Link href={RUTA_PLANES_SEMANALES}>
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
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link href={RUTA_PLANES_SEMANALES}>
            <ArrowLeft className="h-4 w-4" />
            Volver a planes semanales
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setConfirmarEliminar(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
            Eliminar
          </Button>
          <Button variant="outline" onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button onClick={() => setAsignar(true)}>
            <UserPlus className="h-4 w-4" />
            Asignar a paciente
          </Button>
        </div>
      </div>

      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <CalendarRange className="h-6 w-6 text-primary" />
        {datos.nombre}
      </h1>

      <VistaPlanSemanal plan={datos} />

      <PacientesDelPlanSemanal planSemanalId={datos.id} />

      {/* El diálogo crece con su contenido y scrollea entero: el alto de la
          grilla lo pone la grilla (ver docs/PLANES-SEMANALES.md). */}
      <Dialog open={editar} onOpenChange={setEditar}>
        <DialogContent className={CLASES_DIALOGO_PLAN_SEMANAL}>
          <DialogHeader>
            <DialogTitle>Editar plan semanal</DialogTitle>
          </DialogHeader>
          <FormularioPlanSemanal
            planInicial={datos}
            onTerminado={() => setEditar(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={asignar} onOpenChange={setAsignar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{datos.nombre}»</DialogTitle>
          </DialogHeader>
          <FormularioAsignacionPlanSemanal
            planSemanalId={datos.id}
            onTerminado={() => setAsignar(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={confirmarEliminar}
        titulo="Eliminar plan semanal"
        descripcion={`¿Seguro que querés eliminar «${datos.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminar.isPending}
        onCancelar={() => setConfirmarEliminar(false)}
        onConfirmar={() =>
          eliminar.mutate(
            { id: datos.id },
            { onSuccess: () => router.push(RUTA_PLANES_SEMANALES) },
          )
        }
      />
    </div>
  );
}
