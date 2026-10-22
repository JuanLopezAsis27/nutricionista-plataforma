"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import type { PlanSemanalSalidaDto } from "@/aplicacion/dtos/planSemanal.dto";
import { usePlanesSemanales } from "@/lib/hooks/usePlanesSemanales";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPlanSemanal } from "./FormularioPlanSemanal";
import { FormularioAsignacionPlanSemanal } from "./FormularioAsignacionPlanSemanal";
import { rutaPlanSemanal, CLASES_DIALOGO_PLAN_SEMANAL } from "./rutas";

/**
 * La sección «Planes semanales» del módulo de planes: el listado de los menús
 * de referencia con su alta, edición y asignación. «Ver» abre la PÁGINA del
 * plan (`/dashboard/planes/semanales/[id]`), como en los planes: antes era un
 * diálogo, y una semana entera con su comparación de macros no entraba.
 *
 * Va en un componente propio y no dentro de la página por tamaño: la página de
 * planes ya coordina dos pestañas con sus diálogos, y una tercera con su
 * formulario adentro la volvía inmanejable.
 *
 * No tiene carpetas ni plantillas —a diferencia de los planes— porque son
 * cosas distintas: un plan semanal ES el molde reutilizable, se asigna a
 * cuantos pacientes haga falta y se edita en un solo lugar.
 */
export function SeccionPlanesSemanales() {
  const { listar, eliminar } = usePlanesSemanales();
  const [pagina, setPagina] = useState(1);
  const [formAbierto, setFormAbierto] = useState(false);
  const [planEditar, setPlanEditar] = useState<PlanSemanalSalidaDto | null>(
    null,
  );
  const [planAsignar, setPlanAsignar] = useState<PlanSemanalSalidaDto | null>(
    null,
  );
  const [planEliminar, setPlanEliminar] = useState<PlanSemanalSalidaDto | null>(
    null,
  );

  const consulta = listar({ pagina, porPagina: 10 });
  const planes = consulta.data?.planes ?? [];

  const columnas: ColumnaTabla<PlanSemanalSalidaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Nombre",
      render: (plan) => (
        <Link
          href={rutaPlanSemanal(plan.id)}
          className="font-medium hover:text-primary hover:underline"
        >
          {plan.nombre}
        </Link>
      ),
    },
    {
      clave: "franjas",
      encabezado: "Franjas",
      render: (plan) => `${plan.franjas.length}`,
    },
    {
      clave: "dias",
      encabezado: "Días cargados",
      render: (plan) => `${diasCargados(plan)} / 7`,
    },
    {
      clave: "calorias",
      encabezado: "Promedio kcal/día",
      // Promedio de los días que TIENEN calorías: incluir los vacíos daría un
      // número más bajo que cualquier día real del menú.
      render: (plan) => {
        const promedio = promedioCalorias(plan);
        return promedio != null ? `${promedio} kcal` : "—";
      },
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (plan) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Ver">
            <Link href={rutaPlanSemanal(plan.id)} aria-label="Ver">
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Asignar a paciente"
            onClick={() => setPlanAsignar(plan)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
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
            title="Eliminar"
            onClick={() => setPlanEliminar(plan)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setPlanEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo plan semanal
        </Button>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={planes}
        obtenerClave={(plan) => plan.id}
        cargando={consulta.isLoading}
        mensajeVacio="Todavía no hay planes semanales. Creá uno para armar el menú de la semana."
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiarPagina={setPagina}
      />

      {/* Alta / edición (ver CLASES_DIALOGO_PLAN_SEMANAL). */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className={CLASES_DIALOGO_PLAN_SEMANAL}>
          <DialogHeader>
            <DialogTitle>
              {planEditar ? "Editar plan semanal" : "Nuevo plan semanal"}
            </DialogTitle>
          </DialogHeader>
          {/* `key` fuerza a remontar el formulario al cambiar de plan: sin él,
              react-hook-form conserva los valores por defecto del anterior. */}
          <FormularioPlanSemanal
            key={planEditar?.id ?? "nuevo"}
            planInicial={planEditar}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Asignación */}
      <Dialog
        open={Boolean(planAsignar)}
        onOpenChange={(abierto) => !abierto && setPlanAsignar(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{planAsignar?.nombre}»</DialogTitle>
          </DialogHeader>
          {planAsignar && (
            <FormularioAsignacionPlanSemanal
              planSemanalId={planAsignar.id}
              onTerminado={() => setPlanAsignar(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(planEliminar)}
        titulo="Eliminar plan semanal"
        descripcion={`¿Seguro que querés eliminar «${planEliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminar.isPending}
        onCancelar={() => setPlanEliminar(null)}
        onConfirmar={() => {
          if (!planEliminar) return;
          eliminar.mutate(
            { id: planEliminar.id },
            { onSuccess: () => setPlanEliminar(null) },
          );
        }}
      />
    </div>
  );
}

/** Cuántos de los siete días tienen alguna comida cargada. */
function diasCargados(plan: PlanSemanalSalidaDto): number {
  const dias = new Set(
    plan.franjas.flatMap((franja) => franja.comidas.map((c) => c.dia)),
  );
  return dias.size;
}

function promedioCalorias(plan: PlanSemanalSalidaDto): number | null {
  const conDatos = plan.totalesPorDia
    .map((total) => total.macros.calorias)
    .filter((calorias): calorias is number => calorias != null);
  if (conDatos.length === 0) return null;
  return Math.round(
    conDatos.reduce((total, calorias) => total + calorias, 0) / conDatos.length,
  );
}
