"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Un campo personalizado ya definido, sea de la historia clínica o de las
 * evoluciones: los dos se guardan igual y se administran igual.
 */
export interface CampoDefinido {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

interface Props {
  titulo: string;
  descripcion: string;
  /** Qué se muestra cuando el consultorio todavía no definió ninguno. */
  vacio: string;
  placeholderNombre: string;
  /** Aclaración del modal de borrado: qué pasa con lo ya cargado. */
  avisoBorrado: string;
  /** Aclaración al editar: renombrar no desconecta lo cargado. */
  avisoRenombre: string;
  campos: CampoDefinido[] | undefined;
  cargando: boolean;
  onGuardar: (
    datos: { id?: string; nombre: string; descripcion: string | null },
    alTerminar: () => void,
  ) => void;
  guardando: boolean;
  onEliminar: (id: string) => void;
  eliminando: boolean;
}

/**
 * Alta, edición y baja de los campos personalizados que el consultorio agrega
 * a un formulario.
 *
 * Es UNO solo y lo comparten la historia clínica y las evoluciones, por el
 * mismo motivo que el navegador de carpetas es uno solo para planes y recetas:
 * los dos se administran igual, y con dos copias eso dura hasta el primer
 * arreglo que se aplique en una sola.
 *
 * Lo que cambia entre los dos es TEXTO —qué formulario es, qué pasa al
 * borrar— y las mutaciones, que entran por props. La mecánica que sí importa
 * es la misma en los dos: renombrar conserva lo ya cargado (la clave interna
 * no se mueve) y borrar saca el campo del formulario sin tocar los valores
 * escritos en cada ficha.
 */
export function GestionCamposPersonalizados({
  titulo,
  descripcion: descripcionSeccion,
  vacio,
  placeholderNombre,
  avisoBorrado,
  avisoRenombre,
  campos,
  cargando,
  onGuardar,
  guardando,
  onEliminar,
  eliminando,
}: Props) {
  const [editando, setEditando] = useState<CampoDefinido | "nuevo" | null>(
    null,
  );
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [aEliminar, setAEliminar] = useState<CampoDefinido | null>(null);

  function abrirNuevo() {
    setEditando("nuevo");
    setNombre("");
    setDescripcion("");
  }

  function abrirEditar(campo: CampoDefinido) {
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
    onGuardar(
      {
        id: editando && editando !== "nuevo" ? editando.id : undefined,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
      },
      cerrar,
    );
  }

  if (cargando) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{titulo}</h3>
          <p className="text-sm text-muted-foreground">{descripcionSeccion}</p>
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
                placeholder={placeholderNombre}
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
            <p className="text-xs text-muted-foreground">{avisoRenombre}</p>
          )}
          <div className="flex justify-end">
            <Button onClick={guardar} disabled={!nombre.trim() || guardando}>
              {guardando ? "Guardando…" : "Guardar campo"}
            </Button>
          </div>
        </div>
      )}

      {campos && campos.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {campos.map((campo) => (
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
          {vacio}
        </p>
      )}

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo={`¿Eliminar «${aEliminar?.nombre ?? ""}»?`}
        descripcion={avisoBorrado}
        textoConfirmar="Eliminar"
        cargando={eliminando}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (aEliminar) onEliminar(aEliminar.id);
          setAEliminar(null);
        }}
      />
    </div>
  );
}
