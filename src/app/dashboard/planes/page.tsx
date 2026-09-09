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
  FileUp,
  FolderInput,
  CalendarRange,
} from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import type { ModalidadPlan } from "@/dominio/entidades/PlanNutricional";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/componentes/ui/tabs";
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
import { FormularioPlan } from "@/componentes/planes/FormularioPlan";
import { FormularioAsignacionPlan } from "@/componentes/planes/FormularioAsignacionPlan";
import { NavegadorCarpetas } from "@/componentes/planes/NavegadorCarpetas";
import { MoverPlanACarpeta } from "@/componentes/planes/MoverPlanACarpeta";
import { SeccionPlanesSemanales } from "@/componentes/planes-semanales/SeccionPlanesSemanales";

export default function PaginaPlanes() {
  const { listarPaginado, eliminar, archivar, crearDesdePlantilla } =
    usePlanes();
  const [paginaPlanes, setPaginaPlanes] = useState(1);
  const [paginaPlantillas, setPaginaPlantillas] = useState(1);
  /** Carpeta abierta. `null` es la raíz. */
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [planMover, setPlanMover] = useState<PlanSalidaDto | null>(null);

  // La raíz lista los SUELTOS (grupoId: null), no todo: si mostrara todo, los
  // planes de las carpetas aparecerían dos veces —arriba en la carpeta y abajo
  // en la lista— y entrar a una carpeta no cambiaría nada.
  const filtroCarpeta = carpetaId;

  function abrirCarpeta(id: string | null) {
    setCarpetaId(id);
    setPaginaPlanes(1);
  }

  // Server-side, 10/página, y por tab (planes vs plantillas) por separado.
  const consultaPlanes = listarPaginado({
    esPlantilla: false,
    incluirArchivados: true,
    grupoId: filtroCarpeta,
    pagina: paginaPlanes,
    porPagina: 10,
  });
  // Las plantillas NO se filtran por carpeta: las carpetas son de los planes.
  // Una plantilla es un molde del que se saca un plan, y esconderla dentro de
  // la carpeta de un paciente la vuelve imposible de encontrar desde otro.
  // `undefined` es "todas"; `null` sería "las que no están en ninguna carpeta".
  const consultaPlantillas = listarPaginado({
    esPlantilla: true,
    incluirArchivados: true,
    grupoId: undefined,
    pagina: paginaPlantillas,
    porPagina: 10,
  });

  const [formAbierto, setFormAbierto] = useState(false);
  const [comoPlantilla, setComoPlantilla] = useState(false);
  const [modalidadNueva, setModalidadNueva] = useState<ModalidadPlan>("APP");
  const [planEditar, setPlanEditar] = useState<PlanSalidaDto | null>(null);
  const [planEliminar, setPlanEliminar] = useState<PlanSalidaDto | null>(null);
  const [planAsignar, setPlanAsignar] = useState<PlanSalidaDto | null>(null);

  const planes = consultaPlanes.data?.planes ?? [];
  const plantillas = consultaPlantillas.data?.planes ?? [];

  // La modalidad se elige ANTES de abrir el formulario, no adentro: son dos
  // altas distintas —una pide franjas, la otra un archivo— y ofrecer las dos en
  // el mismo formulario fue justamente lo que hubo que deshacer.
  function abrirNuevo(plantilla: boolean, modalidad: ModalidadPlan = "APP") {
    setPlanEditar(null);
    setComoPlantilla(plantilla);
    setModalidadNueva(modalidad);
    setFormAbierto(true);
  }

  function columnas(
    esPestanaPlantillas: boolean,
  ): ColumnaTabla<PlanSalidaDto>[] {
    return [
      {
        clave: "nombre",
        encabezado: "Nombre",
        render: (plan) => (
          <span className="flex items-center gap-2">
            <span className="font-medium">{plan.nombre}</span>
            {plan.modalidad === "PDF" && <Badge variant="secondary">PDF</Badge>}
            {plan.archivado && <Badge variant="outline">Archivado</Badge>}
          </span>
        ),
      },
      {
        clave: "comidas",
        encabezado: "Comidas",
        // Un plan en PDF no tiene comidas cargadas y "0" se leería como que
        // está vacío. El guion dice que la pregunta no aplica.
        render: (plan) =>
          plan.modalidad === "PDF" ? "—" : `${plan.comidas.length}`,
      },
      {
        clave: "calorias",
        encabezado: "Calorías meta",
        render: (plan) =>
          plan.caloriasMeta != null ? `${plan.caloriasMeta} kcal` : "—",
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
            {plan.modalidad === "APP" && (
              <Button asChild variant="ghost" size="icon" title="Descargar PDF">
                <a
                  href={`/api/planes/${plan.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileDown className="h-4 w-4" />
                </a>
              </Button>
            )}
            {esPestanaPlantillas ? (
              <Button
                variant="ghost"
                size="icon"
                title="Crear plan desde esta plantilla"
                onClick={() =>
                  crearDesdePlantilla.mutate({
                    planOrigenId: plan.id,
                    esPlantilla: false,
                  })
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
            {!esPestanaPlantillas && (
              <Button
                variant="ghost"
                size="icon"
                title="Mover a otra carpeta"
                onClick={() => setPlanMover(plan)}
              >
                <FolderInput className="h-4 w-4" />
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
              onClick={() =>
                archivar.mutate({ id: plan.id, archivado: !plan.archivado })
              }
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
      {consultaPlanes.isError || consultaPlantillas.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los planes.
        </p>
      ) : (
        <Tabs defaultValue="planes">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="planes">
                Planes ({consultaPlanes.data?.total ?? 0})
              </TabsTrigger>
              <TabsTrigger value="plantillas">
                Plantillas ({consultaPlantillas.data?.total ?? 0})
              </TabsTrigger>
              {/* El menú de la semana: otra manera de entregar el plan, no una
                  modalidad suya. Ver docs/PLANES-SEMANALES.md. */}
              <TabsTrigger value="semanales" className="gap-1.5">
                <CalendarRange className="h-4 w-4" />
                Planes semanales
              </TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => abrirNuevo(true)}>
                <Plus className="h-4 w-4" />
                Nueva plantilla
              </Button>
              {/* Una plantilla no puede ser un plan en PDF: el archivo es de un
                  solo plan y clonarlo no lo copia (ver PlanNutricional.clonar). */}
              <Button
                variant="outline"
                onClick={() => abrirNuevo(false, "PDF")}
              >
                <FileUp className="h-4 w-4" />
                Subir plan en PDF
              </Button>
              <Button onClick={() => abrirNuevo(false, "APP")}>
                <Plus className="h-4 w-4" />
                Nuevo plan
              </Button>
            </div>
          </div>

          <TabsContent value="planes" className="space-y-4">
            <NavegadorCarpetas carpetaId={carpetaId} onAbrir={abrirCarpeta} />
            <TablaDatos
              columnas={columnas(false)}
              datos={planes}
              obtenerClave={(plan) => plan.id}
              cargando={consultaPlanes.isLoading}
              mensajeVacio={
                carpetaId
                  ? "Esta carpeta está vacía. Creá un plan acá adentro o mové uno existente."
                  : "No hay planes sueltos. Los que estén en una carpeta se ven al abrirla."
              }
              pagina={paginaPlanes}
              totalPaginas={consultaPlanes.data?.paginas ?? 1}
              onCambiarPagina={setPaginaPlanes}
            />
          </TabsContent>
          <TabsContent value="semanales">
            <SeccionPlanesSemanales />
          </TabsContent>
          <TabsContent value="plantillas" className="space-y-4">
            <TablaDatos
              columnas={columnas(true)}
              datos={plantillas}
              obtenerClave={(plan) => plan.id}
              cargando={consultaPlantillas.isLoading}
              mensajeVacio="Todavía no hay plantillas. Guardá un plan como plantilla para reutilizarlo."
              pagina={paginaPlantillas}
              totalPaginas={consultaPlantillas.data?.paginas ?? 1}
              onCambiarPagina={setPaginaPlantillas}
            />
          </TabsContent>
        </Tabs>
      )}

      <MoverPlanACarpeta plan={planMover} onCerrar={() => setPlanMover(null)} />

      {/* Alta / edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planEditar
                ? "Editar plan"
                : comoPlantilla
                  ? "Nueva plantilla"
                  : modalidadNueva === "PDF"
                    ? "Subir plan en PDF"
                    : "Nuevo plan"}
            </DialogTitle>
          </DialogHeader>
          {/* Crear estando dentro de una carpeta guarda ahí: es lo que se
              espera de un directorio, y evita el paso de "crearlo y después
              moverlo". */}
          <FormularioPlan
            planInicial={planEditar}
            comoPlantilla={comoPlantilla}
            modalidad={modalidadNueva}
            grupoIdInicial={carpetaId}
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
          eliminar.mutate(
            { id: planEliminar.id },
            { onSuccess: () => setPlanEliminar(null) },
          );
        }}
      />
    </div>
  );
}
