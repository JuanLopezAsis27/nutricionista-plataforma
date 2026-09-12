"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Send, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { PlantillaSalidaDto } from "@/aplicacion/dtos/secretaria.dto";
import { CLAVE_RECORDATORIO_TURNO } from "@/dominio/entidades/PlantillaEmail";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPlantilla } from "@/componentes/secretaria/FormularioPlantilla";
import { EnviarPruebaDialog } from "@/componentes/secretaria/EnviarPruebaDialog";

/**
 * Los emails del consultorio que NO son recordatorios: la bienvenida al
 * paciente nuevo y las plantillas propias.
 *
 * El recordatorio de turno se edita en Recordatorios, junto a los textos de
 * WhatsApp: son dos vías del mismo aviso y separarlos obligaba a mantener dos
 * mensajes en dos pantallas distintas. Lo que queda acá es lo que sí es
 * configuración del consultorio.
 */
export function GestionPlantillasEmail() {
  const { listarPlantillas, eliminarPlantilla } = useSecretaria();
  const consulta = listarPlantillas();
  const { obtener: obtenerConfiguracion, guardar: guardarConfiguracion } =
    useConfiguracion();
  const config = obtenerConfiguracion().data;

  const [formAbierto, setFormAbierto] = useState(false);
  const [editar, setEditar] = useState<PlantillaSalidaDto | null>(null);
  const [prueba, setPrueba] = useState<PlantillaSalidaDto | null>(null);
  const [aEliminar, setAEliminar] = useState<PlantillaSalidaDto | null>(null);

  const plantillas = (consulta.data ?? []).filter(
    (p) => p.clave !== CLAVE_RECORDATORIO_TURNO,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm font-medium">
              Bienvenida automática al dar de alta un paciente
            </p>
            <p className="text-sm text-muted-foreground">
              Con esto activado, cada paciente nuevo recibe el email de
              bienvenida con sus datos de acceso apenas se lo da de alta.
              Desactivalo si preferís mandarla vos a mano desde el listado de
              pacientes.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={config?.bienvenidaAutomaticaActiva ?? true}
              disabled={!config || guardarConfiguracion.isPending}
              onChange={(e) =>
                guardarConfiguracion.mutate({
                  bienvenidaAutomaticaActiva: e.target.checked,
                })
              }
            />
            Activa
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Emails del consultorio: la bienvenida que recibe un paciente nuevo y
          las plantillas que armes vos. El recordatorio de turno se edita en{" "}
          <Link
            href="/dashboard/recordatorios"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Recordatorios <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          , junto al de WhatsApp.
        </p>
        <Button
          onClick={() => {
            setEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva plantilla
        </Button>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : plantillas.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No hay otras plantillas de email.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plantillas.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {plantilla.nombre}
                  {plantilla.deSistema && (
                    <Badge variant="secondary">Sistema</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plantilla.descripcion && (
                  <p className="text-sm text-muted-foreground">
                    {plantilla.descripcion}
                  </p>
                )}
                <p className="truncate text-sm">
                  <span className="text-muted-foreground">Asunto: </span>
                  {plantilla.asunto}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditar(plantilla);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrueba(plantilla)}
                  >
                    <Send className="h-4 w-4" /> Prueba
                  </Button>
                  {!plantilla.deSistema && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setAEliminar(plantilla)}
                    >
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editar ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPlantilla
            plantillaInicial={editar}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <EnviarPruebaDialog plantilla={prueba} onCerrar={() => setPrueba(null)} />

      <ModalConfirmacion
        abierto={Boolean(aEliminar)}
        titulo="Eliminar plantilla"
        descripcion={`¿Eliminar la plantilla «${aEliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminarPlantilla.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminarPlantilla.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </div>
  );
}
