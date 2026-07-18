"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  Copy,
  Archive,
  ArchiveRestore,
  FileDown,
} from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/componentes/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { TablaDatos, type ColumnaTabla } from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPlan } from "@/componentes/planes/FormularioPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";

export default function PaginaPlanes() {
  const { listar, eliminar, archivar, crearDesdePlantilla } = usePlanes();
  const consulta = listar({ incluirArchivados: true });

  const [formAbierto, setFormAbierto] = useState(false);
  const [comoPlantilla, setComoPlantilla] = useState(false);
  const [planEditar, setPlanEditar] = useState<PlanSalidaDto | null>(null);
  const [planEliminar, setPlanEliminar] = useState<PlanSalidaDto | null>(null);
  const [planAsignar, setPlanAsignar] = useState<PlanSalidaDto | null>(null);

  const todos = consulta.data ?? [];
  const planes = todos.filter((plan) => !plan.esPlantilla);
  const plantillas = todos.filter((plan) => plan.esPlantilla);

  function abrirNuevo(plantilla: boolean) {
    setPlanEditar(null);
    setComoPlantilla(plantilla);
    setFormAbierto(true);
  }

  function columnas(esPestanaPlantillas: boolean): ColumnaTabla<PlanSalidaDto>[] {
    return [
      {
        clave: "nombre",
        encabezado: "Nombre",
        render: (plan) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{plan.nombre}</span>
            {plan.archivado && <Badge variant="outline">Archivado</Badge>}
          </span>
        ),
      },
      {
        clave: "comidas",
        encabezado: "Comidas",
        render: (plan) => `${plan.comidas.length}`,
      },
      {
        clave: "calorias",
        encabezado: "Calorías meta",
        render: (plan) => (plan.caloriasMeta != null ? `${plan.caloriasMeta} kcal` : "—"),
      },
      {
        clave: "acciones",
        encabezado: "Acciones",
        className: "text-right",
        render: (plan) => (
          <div className="flex justify-end gap-1">
            <Button asChild variant="ghost" size="icon" title="Ver">
              <Link href={`/dashboard/planes/${plan.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" title="Descargar PDF">
              <a href={`/api/planes/${plan.id}/pdf`} target="_blank" rel="noreferrer">
                <FileDown className="h-4 w-4" />
              </a>
            </Button>
            {esPestanaPlantillas ? (
              <Button
                variant="ghost"
                size="icon"
                title="Crear plan desde esta plantilla"
                onClick={() =>
                  crearDesdePlantilla.mutate({ planOrigenId: plan.id, esPlantilla: false })
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title="Asignar a paciente"
                onClick={() => setPlanAsignar(plan)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Editar"
              onClick={() => {
                setPlanEditar(plan);
                setFormAbierto(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={plan.archivado ? "Restaurar" : "Archivar"}
              onClick={() => archivar.mutate({ id: plan.id, archivado: !plan.archivado })}
            >
              {plan.archivado ? (
                <ArchiveRestore className="h-4 w-4" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Eliminar"
              onClick={() => setPlanEliminar(plan)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ];
  }

  return (
    <div className="space-y-4">
      {consulta.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los planes.</p>
      ) : (
        <Tabs defaultValue="planes">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="planes">Planes ({planes.length})</TabsTrigger>
              <TabsTrigger value="plantillas">Plantillas ({plantillas.length})</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => abrirNuevo(true)}>
                <Plus className="h-4 w-4" />
                Nueva plantilla
              </Button>
              <Button onClick={() => abrirNuevo(false)}>
                <Plus className="h-4 w-4" />
                Nuevo plan
              </Button>
            </div>
          </div>

          <TabsContent value="planes">
            <TablaDatos
              columnas={columnas(false)}
              datos={planes}
              obtenerClave={(plan) => plan.id}
              cargando={consulta.isLoading}
              mensajeVacio="Todavía no hay planes. Creá uno desde cero o desde una plantilla."
            />
          </TabsContent>
          <TabsContent value="plantillas">
            <TablaDatos
              columnas={columnas(true)}
              datos={plantillas}
              obtenerClave={(plan) => plan.id}
              cargando={consulta.isLoading}
              mensajeVacio="Todavía no hay plantillas."
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Alta / edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planEditar
                ? "Editar plan"
                : comoPlantilla
                  ? "Nueva plantilla"
                  : "Nuevo plan"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPlan
            planInicial={planEditar}
            comoPlantilla={comoPlantilla}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Asignación */}
      <Dialog open={Boolean(planAsignar)} onOpenChange={(abierto) => !abierto && setPlanAsignar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{planAsignar?.nombre}»</DialogTitle>
          </DialogHeader>
          {planAsignar && (
            <FormularioAsignacionPlan
              planId={planAsignar.id}
              onTerminado={() => setPlanAsignar(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={Boolean(planEliminar)}
        titulo="Eliminar plan"
        descripcion={`¿Seguro que querés eliminar «${planEliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminar.isPending}
        onCancelar={() => setPlanEliminar(null)}
        onConfirmar={() => {
          if (!planEliminar) return;
          eliminar.mutate({ id: planEliminar.id }, { onSuccess: () => setPlanEliminar(null) });
        }}
      />
    </div>
  );
}
