"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Medal,
  Plus,
  Eye,
  Pencil,
  Copy,
  Trash2,
  UserPlus,
  FolderInput,
} from "lucide-react";
import type { PlanificacionListadaDto } from "@/aplicacion/dtos/planificacionDeportiva.dto";
import { ETIQUETA_MODALIDAD_CARRERA } from "@/dominio/entidades/PlanificacionDeportiva";
import { usePlanificacionDeportiva } from "@/lib/hooks/usePlanificacionDeportiva";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { propsArrastrable } from "@/componentes/comunes/NavegadorCarpetas";
import { NavegadorCarpetasPlanificacion } from "@/componentes/planificacion-deportiva/NavegadorCarpetasPlanificacion";
import {
  DialogoAsignarPlanificacion,
  DialogoMoverPlanificacion,
} from "@/componentes/planificacion-deportiva/DialogosPlanificacion";
import {
  rutaEditarPlanificacion,
  rutaNuevaPlanificacion,
  rutaPlanificacion,
} from "@/componentes/planificacion-deportiva/rutas";
import {
  numero,
  textoDuracion,
} from "@/componentes/planificacion-deportiva/presentacion";

const POR_PAGINA = 20;

/**
 * Planificación deportiva (migración 94): la estrategia nutricional de una
 * competencia según el deporte. Empieza por las carreras de running y trail
 * (distancia, duración, objetivos por hora e ingestas minuto a minuto).
 *
 * Se gestiona como los planes: planificaciones GENERALES —un molde de «media
 * maratón en 1:45» que se asigna a varios— y las de cada paciente, que se
 * crean desde su ficha y caen en la carpeta con su nombre. La raíz lista las
 * carpetas y las planificaciones sueltas; adentro de una carpeta, las suyas.
 */
export default function PaginaPlanificacionDeportiva() {
  const { listar, eliminar, duplicar } = usePlanificacionDeportiva();
  const [carpetaId, setCarpetaId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const debounced = useDebounce(busqueda.trim(), 300);
  const [asignar, setAsignar] = useState<PlanificacionListadaDto | null>(null);
  const [mover, setMover] = useState<PlanificacionListadaDto | null>(null);
  const [aEliminar, setAEliminar] = useState<PlanificacionListadaDto | null>(
    null,
  );

  const consulta = listar({
    pagina,
    porPagina: POR_PAGINA,
    texto: debounced || undefined,
    // En la raíz, las sueltas: las de una carpeta se ven al abrirla.
    grupoId: carpetaId,
  });

  const columnas: ColumnaTabla<PlanificacionListadaDto>[] = [
    {
      clave: "nombre",
      encabezado: "Nombre",
      render: (p) => (
        <Link
          href={rutaPlanificacion(p.id)}
          className="font-medium hover:underline"
        >
          {p.nombre}
        </Link>
      ),
    },
    {
      clave: "carrera",
      encabezado: "Carrera",
      render: (p) =>
        p.modalidad ? (
          <span className="flex flex-wrap items-center gap-1.5 text-sm">
            <Badge variant="secondary">
              {ETIQUETA_MODALIDAD_CARRERA[p.modalidad]}
            </Badge>
            {numero(p.distanciaKm, " km")} ·{" "}
            {textoDuracion(p.duracionEstimadaMin)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      clave: "ingestas",
      encabezado: "Ingestas",
      render: (p) => p.cantidadIngestas,
    },
    {
      clave: "pacientes",
      encabezado: "Pacientes",
      render: (p) =>
        p.cantidadPacientes > 0 ? (
          <Badge variant="outline">{p.cantidadPacientes}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      clave: "acciones",
      encabezado: "",
      className: "text-right",
      render: (p) => (
        <span className="flex justify-end gap-0.5">
          <Button asChild variant="ghost" size="icon" title="Ver">
            <Link href={rutaPlanificacion(p.id)}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" title="Editar">
            <Link href={rutaEditarPlanificacion(p.id)}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Asignar a un paciente"
            onClick={() => setAsignar(p)}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Duplicar"
            disabled={duplicar.isPending}
            onClick={() => duplicar.mutate({ id: p.id })}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Mover a otra carpeta"
            onClick={() => setMover(p)}
          >
            <FolderInput className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar"
            onClick={() => setAEliminar(p)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Medal className="h-6 w-6 text-primary" /> Planificación deportiva
          </h1>
          <p className="text-sm text-muted-foreground">
            La estrategia nutricional de cada competencia: qué tomar y cuándo.
            Por ahora, carreras de running y trail.
          </p>
        </div>
        <Button asChild>
          <Link href={rutaNuevaPlanificacion({ grupoId: carpetaId })}>
            <Plus className="h-4 w-4" /> Nueva planificación de carrera
          </Link>
        </Button>
      </div>

      <NavegadorCarpetasPlanificacion
        carpetaId={carpetaId}
        onAbrir={(id) => {
          setCarpetaId(id);
          setPagina(1);
        }}
        busqueda={busqueda}
        onBuscar={(texto) => {
          setBusqueda(texto);
          setPagina(1);
        }}
      />

      <TablaDatos
        columnas={columnas}
        datos={consulta.data?.items ?? []}
        obtenerClave={(p) => p.id}
        cargando={consulta.isLoading}
        mensajeVacio={
          debounced
            ? "No hay planificaciones que coincidan con la búsqueda."
            : carpetaId
              ? "Esta carpeta está vacía."
              : "Todavía no hay planificaciones sueltas. Creá una general acá, o una para un paciente desde su ficha (pestaña Deporte)."
        }
        pagina={pagina}
        totalPaginas={consulta.data?.paginas ?? 1}
        onCambiarPagina={setPagina}
        // Solo las sueltas se arrastran a una carpeta: las de adentro ya
        // tienen una, y se mueven con el botón.
        propsFila={(p) =>
          carpetaId === null ? propsArrastrable(p.id) : undefined
        }
      />

      <DialogoAsignarPlanificacion
        key={asignar?.id ?? "ninguna"}
        abierto={asignar !== null}
        planificacion={asignar}
        onCerrar={() => setAsignar(null)}
      />
      <DialogoMoverPlanificacion
        planificacion={mover}
        onCerrar={() => setMover(null)}
      />
      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar planificación"
        descripcion={
          aEliminar && aEliminar.cantidadPacientes > 0
            ? `«${aEliminar.nombre}» está asignada a ${aEliminar.cantidadPacientes} ${aEliminar.cantidadPacientes === 1 ? "paciente" : "pacientes"}: deja de aparecer en su portal. ¿Eliminarla?`
            : `¿Eliminar «${aEliminar?.nombre}»? Esta acción no se puede deshacer.`
        }
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </div>
  );
}
