"use client";

import { useState } from "react";
import { Check, Dumbbell, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { DeporteSalidaDto } from "@/aplicacion/dtos/deporte.dto";
import { LARGO_MAXIMO_NOMBRE_DEPORTE } from "@/dominio/entidades/Deporte";
import {
  DEFINICION_FORMATO,
  FORMATOS_PLANIFICACION,
  type FormatoPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { useDeportes } from "@/lib/hooks/useDeportes";
import { filtrarOpciones } from "@/componentes/comunes/SelectorConBuscador";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

/**
 * Los deportes de la plataforma (migración 97): de esta lista sale el
 * deporte del perfil deportivo de cada paciente, en todos los consultorios.
 * Solo se administra acá; un consultorio no suma deportes propios.
 *
 * Un deporte en uso no se borra (el servidor dice cuántos perfiles lo
 * llevan): se renombra, y el nombre nuevo aparece en todos esos perfiles.
 *
 * Cada uno dice además qué PLANIFICACIÓN deportiva le corresponde (migración
 * 98): la ficha de un paciente de «Trail running» arranca una de trail, y la
 * de uno de «Fútbol», mientras no tenga, no ofrece ninguna.
 */

/** Sentinela: Radix Select no admite value="". */
const SIN_PLANIFICACION = "__ninguna__";

export function GestorDeportes() {
  const {
    deportes,
    cargando,
    crear,
    renombrar,
    eliminar,
    cambiarPlanificacion,
  } = useDeportes();
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [editando, setEditando] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [aEliminar, setAEliminar] = useState<DeporteSalidaDto | null>(null);
  const visibles = filtrarOpciones(deportes, busqueda);

  function agregar() {
    const nombre = nuevo.trim();
    if (!nombre) return;
    crear.mutate({ nombre }, { onSuccess: () => setNuevo("") });
  }

  function guardarNombre() {
    if (!editando || !editando.nombre.trim()) return;
    renombrar.mutate(
      { id: editando.id, nombre: editando.nombre.trim() },
      { onSuccess: () => setEditando(null) },
    );
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <Dumbbell className="h-4 w-4 text-primary" /> Deportes
        </h3>
        <p className="text-sm text-muted-foreground">
          La lista de la que cada consultorio elige el deporte del perfil
          deportivo de sus pacientes. Solo se edita acá. «Planificación» es la
          planificación deportiva que la ficha le ofrece a quien hace ese
          deporte; sin ninguna, no se le ofrece. Un deporte que usa algún perfil
          no se puede borrar: renombralo.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nuevo deporte"
          aria-label="Nombre del deporte nuevo"
          maxLength={LARGO_MAXIMO_NOMBRE_DEPORTE}
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!nuevo.trim() || crear.isPending}
          onClick={agregar}
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      {cargando ? (
        <Skeleton className="h-24 w-full" />
      ) : deportes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay deportes cargados.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={`Buscar entre ${deportes.length} deportes…`}
              aria-label="Buscar deporte"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {visibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y overflow-y-auto rounded-md border">
              {visibles.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm"
                >
                  {editando?.id === d.id ? (
                    <Input
                      className="h-8"
                      maxLength={LARGO_MAXIMO_NOMBRE_DEPORTE}
                      aria-label="Nombre del deporte"
                      value={editando.nombre}
                      onChange={(e) =>
                        setEditando({ id: d.id, nombre: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") guardarNombre();
                        if (e.key === "Escape") setEditando(null);
                      }}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{d.nombre}</span>
                  )}
                  {editando?.id !== d.id && (
                    <Select
                      value={d.formatoPlanificacion ?? SIN_PLANIFICACION}
                      disabled={cambiarPlanificacion.isPending}
                      onValueChange={(v) =>
                        cambiarPlanificacion.mutate({
                          id: d.id,
                          formatoPlanificacion:
                            v === SIN_PLANIFICACION
                              ? null
                              : (v as FormatoPlanificacion),
                        })
                      }
                    >
                      <SelectTrigger
                        className="h-8 w-44 shrink-0"
                        aria-label={`Planificación de ${d.nombre}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SIN_PLANIFICACION}>
                          Sin planificación
                        </SelectItem>
                        {FORMATOS_PLANIFICACION.map((f) => (
                          <SelectItem key={f} value={f}>
                            {DEFINICION_FORMATO[f].etiqueta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <span className="flex shrink-0 gap-0.5">
                    {editando?.id === d.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Guardar"
                          disabled={renombrar.isPending}
                          onClick={guardarNombre}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Cancelar"
                          onClick={() => setEditando(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Renombrar"
                          onClick={() =>
                            setEditando({ id: d.id, nombre: d.nombre })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Eliminar"
                          onClick={() => setAEliminar(d)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar deporte"
        descripcion={`¿Eliminar «${aEliminar?.nombre}» de la lista? Deja de aparecer en el buscador de todos los consultorios. Si algún perfil deportivo lo usa, no se elimina.`}
        cargando={eliminar.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminar.mutate(
            { id: aEliminar.id },
            // Si está en uso, el aviso lo da el error; el diálogo se cierra igual.
            { onSettled: () => setAEliminar(null) },
          );
        }}
      />
    </section>
  );
}
