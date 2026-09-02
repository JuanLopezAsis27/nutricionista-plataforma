"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import type { CampoHistoriaClinicaSalidaDto } from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Campos que el consultorio agrega a la historia clínica de TODOS sus
 * pacientes.
 *
 * Los siete campos fijos son el mínimo común; acá se declara lo que sigue este
 * profesional en particular. Renombrar un campo NO desconecta lo ya cargado
 * (la clave interna no cambia), y borrarlo saca el campo del formulario pero
 * deja intacto lo que ya está escrito en cada ficha.
 */
export function GestionCamposHistoriaClinica() {
  const { obtenerCamposHistoria, guardarCampoHistoria, eliminarCampoHistoria } =
    useEvaluacion();
  const campos = obtenerCamposHistoria();

  const [editando, setEditando] = useState<
    CampoHistoriaClinicaSalidaDto | "nuevo" | null
  >(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [aEliminar, setAEliminar] =
    useState<CampoHistoriaClinicaSalidaDto | null>(null);

  function abrirNuevo() {
    setEditando("nuevo");
    setNombre("");
    setDescripcion("");
  }

  function abrirEditar(campo: CampoHistoriaClinicaSalidaDto) {
    setEditando(campo);
    setNombre(campo.nombre);
    setDescripcion(campo.descripcion ?? "");
  }

  function cerrar() {
    setEditando(null);
    setNombre("");
    setDescripcion("");
  }

  function guardar() {
    if (!nombre.trim()) return;
    guardarCampoHistoria.mutate(
      {
        id: editando && editando !== "nuevo" ? editando.id : undefined,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
      },
      { onSuccess: cerrar },
    );
  }

  if (campos.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Campos de la historia clínica</h3>
          <p className="text-sm text-muted-foreground">
            Se agregan a los campos fijos y aparecen en la historia clínica de
            todos tus pacientes. La descripción también le sirve a la IA para
            encontrar el dato cuando cargás un paciente desde un documento.
          </p>
        </div>
        <Button onClick={abrirNuevo} disabled={editando === "nuevo"}>
          <Plus className="mr-2 h-4 w-4" /> Agregar campo
        </Button>
      </div>

      {editando && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {editando === "nuevo"
                ? "Campo nuevo"
                : `Editar «${editando.nombre}»`}
            </p>
            <Button variant="ghost" size="sm" onClick={cerrar}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campo-nombre">Nombre</Label>
              <Input
                id="campo-nombre"
                value={nombre}
                maxLength={80}
                onChange={(evento) => setNombre(evento.target.value)}
                placeholder="Adherencia previa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campo-descripcion">Descripción (opcional)</Label>
              <Input
                id="campo-descripcion"
                value={descripcion}
                maxLength={300}
                onChange={(evento) => setDescripcion(evento.target.value)}
                placeholder="Qué se anota en este campo"
              />
            </div>
          </div>
          {editando !== "nuevo" && (
            <p className="text-xs text-muted-foreground">
              Renombrar el campo conserva lo que ya esté cargado en las fichas.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={guardar}
              disabled={!nombre.trim() || guardarCampoHistoria.isPending}
            >
              {guardarCampoHistoria.isPending ? "Guardando…" : "Guardar campo"}
            </Button>
          </div>
        </div>
      )}

      {campos.data && campos.data.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {campos.data.map((campo) => (
            <li
              key={campo.id}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{campo.nombre}</p>
                {campo.descripcion && (
                  <p className="truncate text-xs text-muted-foreground">
                    {campo.descripcion}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abrirEditar(campo)}
                  aria-label={`Editar ${campo.nombre}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAEliminar(campo)}
                  aria-label={`Eliminar ${campo.nombre}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Todavía no agregaste campos propios. La historia clínica muestra solo
          los siete campos fijos.
        </p>
      )}

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo={`¿Eliminar «${aEliminar?.nombre ?? ""}»?`}
        descripcion="El campo deja de pedirse en la historia clínica de tus pacientes. Lo que ya esté cargado en cada ficha se conserva y se sigue viendo."
        textoConfirmar="Eliminar"
        cargando={eliminarCampoHistoria.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (aEliminar) {
            eliminarCampoHistoria.mutate({ id: aEliminar.id });
          }
          setAEliminar(null);
        }}
      />
    </div>
  );
}
