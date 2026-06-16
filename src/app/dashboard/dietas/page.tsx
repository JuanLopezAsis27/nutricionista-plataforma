"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import type { DietaSalidaDto } from "@/aplicacion/dtos/dieta.dto";
import { useDietas } from "@/lib/hooks/useDietas";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { TablaDatos, type ColumnaTabla } from "@/componentes/comunes/TablaDatos";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioDieta } from "@/componentes/dietas/FormularioDieta";
import { FormularioAsignacion } from "@/componentes/dietas/FormularioAsignacion";

export default function PaginaDietas() {
  const { listar, eliminar } = useDietas();
  const consulta = listar();

  const [formAbierto, setFormAbierto] = useState(false);
  const [dietaEditar, setDietaEditar] = useState<DietaSalidaDto | null>(null);
  const [dietaEliminar, setDietaEliminar] = useState<DietaSalidaDto | null>(null);
  const [dietaAsignar, setDietaAsignar] = useState<DietaSalidaDto | null>(null);

  function abrirNueva() {
    setDietaEditar(null);
    setFormAbierto(true);
  }

  const columnas: ColumnaTabla<DietaSalidaDto>[] = [
    { clave: "nombre", encabezado: "Nombre", render: (d) => <span className="font-medium">{d.nombre}</span> },
    {
      clave: "descripcion",
      encabezado: "Descripción",
      render: (d) => d.descripcion ?? "—",
    },
    {
      clave: "comidas",
      encabezado: "Comidas",
      render: (d) => `${d.comidas.length}`,
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon" title="Ver">
            <Link href={`/dashboard/dietas/${d.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" title="Asignar a paciente" onClick={() => setDietaAsignar(d)}>
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Editar"
            onClick={() => {
              setDietaEditar(d);
              setFormAbierto(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setDietaEliminar(d)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirNueva}>
          <Plus className="h-4 w-4" />
          Nueva dieta
        </Button>
      </div>

      {consulta.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar las dietas.</p>
      ) : (
        <TablaDatos
          columnas={columnas}
          datos={consulta.data ?? []}
          obtenerClave={(d) => d.id}
          cargando={consulta.isLoading}
          mensajeVacio="Todavía no hay dietas creadas."
        />
      )}

      {/* Alta / edición */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dietaEditar ? "Editar dieta" : "Nueva dieta"}</DialogTitle>
          </DialogHeader>
          <FormularioDieta dietaInicial={dietaEditar} onTerminado={() => setFormAbierto(false)} />
        </DialogContent>
      </Dialog>

      {/* Asignación */}
      <Dialog open={Boolean(dietaAsignar)} onOpenChange={(e) => !e && setDietaAsignar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar «{dietaAsignar?.nombre}»</DialogTitle>
          </DialogHeader>
          {dietaAsignar && (
            <FormularioAsignacion
              dietaId={dietaAsignar.id}
              onTerminado={() => setDietaAsignar(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ModalConfirmacion
        abierto={Boolean(dietaEliminar)}
        titulo="Eliminar dieta"
        descripcion={`¿Seguro que querés eliminar la dieta «${dietaEliminar?.nombre}»?`}
        cargando={eliminar.isPending}
        onCancelar={() => setDietaEliminar(null)}
        onConfirmar={() => {
          if (!dietaEliminar) return;
          eliminar.mutate({ id: dietaEliminar.id }, { onSuccess: () => setDietaEliminar(null) });
        }}
      />
    </div>
  );
}
