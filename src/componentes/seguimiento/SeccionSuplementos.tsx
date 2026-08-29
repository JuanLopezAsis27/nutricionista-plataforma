"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Pill } from "lucide-react";
import type { SuplementoSalidaDto } from "@/aplicacion/dtos/seguimiento.dto";
import { useSeguimiento } from "@/lib/hooks/useSeguimiento";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";

const esquema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(160),
    dosis: z.string().max(120),
    frecuencia: z.string().max(200),
    desde: z.string(),
    hasta: z.string(),
    notas: z.string().max(1000),
  })
  .refine((d) => !d.desde || !d.hasta || d.hasta >= d.desde, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["hasta"],
  });
type DatosFormulario = z.infer<typeof esquema>;

function FormularioSuplemento({
  pacienteId,
  suplementoInicial,
  onTerminado,
}: {
  pacienteId: string;
  suplementoInicial: SuplementoSalidaDto | null;
  onTerminado: () => void;
}) {
  const { registrarSuplemento, actualizarSuplemento } = useSeguimiento();
  const enviando =
    registrarSuplemento.isPending || actualizarSuplemento.isPending;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: suplementoInicial?.nombre ?? "",
      dosis: suplementoInicial?.dosis ?? "",
      frecuencia: suplementoInicial?.frecuencia ?? "",
      desde: suplementoInicial?.desde
        ? new Date(suplementoInicial.desde).toISOString().slice(0, 10)
        : "",
      hasta: suplementoInicial?.hasta
        ? new Date(suplementoInicial.hasta).toISOString().slice(0, 10)
        : "",
      notas: suplementoInicial?.notas ?? "",
    },
  });

  function alEnviar(datos: DatosFormulario) {
    const cuerpo = {
      nombre: datos.nombre,
      dosis: datos.dosis.trim() || null,
      frecuencia: datos.frecuencia.trim() || null,
      desde: datos.desde ? new Date(datos.desde) : null,
      hasta: datos.hasta ? new Date(datos.hasta) : null,
      notas: datos.notas.trim() || null,
    };
    if (suplementoInicial) {
      actualizarSuplemento.mutate(
        {
          id: suplementoInicial.id,
          activo: suplementoInicial.activo,
          ...cuerpo,
        },
        { onSuccess: onTerminado },
      );
    } else {
      registrarSuplemento.mutate(
        { pacienteId, ...cuerpo },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suplemento</FormLabel>
                <FormControl>
                  <Input placeholder="Creatina monohidrato" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dosis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dosis</FormLabel>
                <FormControl>
                  <Input placeholder="5 g" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="frecuencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <FormControl>
                <Input
                  placeholder="Todos los días, post entrenamiento"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="desde"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desde (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hasta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hasta (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (opcional)</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : suplementoInicial
                ? "Guardar cambios"
                : "Indicar suplemento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Pestaña Suplementos de la ficha: indicaciones vigentes e históricas. */
export function SeccionSuplementos({ pacienteId }: { pacienteId: string }) {
  const { suplementosDelPaciente, actualizarSuplemento, eliminarSuplemento } =
    useSeguimiento();
  const consulta = suplementosDelPaciente({
    pacienteId,
    incluirInactivos: true,
  });

  const [formAbierto, setFormAbierto] = useState(false);
  const [editar, setEditar] = useState<SuplementoSalidaDto | null>(null);
  const [eliminar, setEliminar] = useState<SuplementoSalidaDto | null>(null);

  const suplementos = consulta.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Pill className="h-4 w-4 text-primary" /> Suplementación
        </h3>
        <Button
          size="sm"
          onClick={() => {
            setEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Indicar suplemento
        </Button>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : suplementos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          El paciente no tiene suplementos indicados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {suplementos.map((suplemento) => (
            <li
              key={suplemento.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {suplemento.nombre}
                  {!suplemento.activo && (
                    <Badge variant="outline">Finalizado</Badge>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {[suplemento.dosis, suplemento.frecuencia]
                    .filter(Boolean)
                    .join(" · ") || "Sin dosis indicada"}
                  {suplemento.desde &&
                    ` · desde ${formatearFecha(suplemento.desde)}`}
                  {suplemento.hasta &&
                    ` hasta ${formatearFecha(suplemento.hasta)}`}
                </p>
                {suplemento.notas && (
                  <p className="text-xs text-muted-foreground">
                    {suplemento.notas}
                  </p>
                )}
              </div>
              <span className="flex shrink-0 gap-1">
                {suplemento.activo && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actualizarSuplemento.isPending}
                    onClick={() =>
                      actualizarSuplemento.mutate({
                        id: suplemento.id,
                        nombre: suplemento.nombre,
                        dosis: suplemento.dosis,
                        frecuencia: suplemento.frecuencia,
                        desde: suplemento.desde,
                        hasta: suplemento.hasta,
                        notas: suplemento.notas,
                        activo: false,
                      })
                    }
                  >
                    Finalizar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => {
                    setEditar(suplemento);
                    setFormAbierto(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Eliminar"
                  onClick={() => setEliminar(suplemento)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editar ? "Editar suplemento" : "Indicar suplemento"}
            </DialogTitle>
          </DialogHeader>
          <FormularioSuplemento
            pacienteId={pacienteId}
            suplementoInicial={editar}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(eliminar)}
        titulo="Eliminar suplemento"
        descripcion={`¿Eliminar «${eliminar?.nombre}»? Para cortes normales conviene "Finalizar".`}
        cargando={eliminarSuplemento.isPending}
        onCancelar={() => setEliminar(null)}
        onConfirmar={() => {
          if (!eliminar) return;
          eliminarSuplemento.mutate(
            { id: eliminar.id },
            { onSuccess: () => setEliminar(null) },
          );
        }}
      />
    </div>
  );
}
