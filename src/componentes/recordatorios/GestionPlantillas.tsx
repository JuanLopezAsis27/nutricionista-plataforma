"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  BadgeCheck,
  CircleAlert,
} from "lucide-react";
import type { PlantillaWhatsappSalidaDto } from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import {
  VARIABLES_RECORDATORIO,
  MAX_LARGO_CUERPO_PLANTILLA,
  CUERPO_RECORDATORIO_POR_DEFECTO,
  type VariableRecordatorio,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { renderizarPlantilla } from "@/aplicacion/casos-de-uso/whatsapp/plantilla";
import { variablesEjemplo } from "@/aplicacion/casos-de-uso/secretaria/variables";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
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

/** Plantillas del recordatorio por WhatsApp. */
export function GestionPlantillas() {
  const { plantillas, eliminarPlantilla, actualizarPlantilla } =
    useRecordatorios();
  const consulta = plantillas();
  const [editando, setEditando] = useState<PlantillaWhatsappSalidaDto | null>(
    null,
  );
  const [formAbierto, setFormAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<PlantillaWhatsappSalidaDto | null>(
    null,
  );

  const lista = consulta.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          El texto con el que sale el recordatorio. La plantilla predeterminada
          es la que usa el envío automático.
        </p>
        <Button
          onClick={() => {
            setEditando(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva plantilla
        </Button>
      </div>

      {consulta.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : lista.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay plantillas. Sin una predeterminada, el envío automático
          no manda nada.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {plantilla.nombre}
                  {plantilla.predeterminada && (
                    <Badge>
                      <Star className="mr-1 h-3 w-3" /> Predeterminada
                    </Badge>
                  )}
                  {!plantilla.activa && (
                    <Badge variant="outline">Desactivada</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
                  {plantilla.cuerpo}
                </p>

                {plantilla.admiteEnvioPorApi ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    Aprobada en Meta como{" "}
                    <code className="rounded bg-muted px-1">
                      {plantilla.claveMeta}
                    </code>{" "}
                    ({plantilla.idiomaMeta})
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Sin plantilla de Meta: sirve para el enlace wa.me, pero la
                    API no la deja salir fuera de las 24 h desde el último
                    mensaje del paciente —que es casi siempre, tratándose de un
                    recordatorio—.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditando(plantilla);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  {!plantilla.predeterminada && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          actualizarPlantilla.mutate({
                            id: plantilla.id,
                            predeterminada: true,
                          })
                        }
                      >
                        <Star className="h-4 w-4" /> Usar por defecto
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setAEliminar(plantilla)}
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPlantillaWhatsapp
            inicial={editando}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(aEliminar)}
        titulo="Eliminar plantilla"
        descripcion={`¿Eliminar «${aEliminar?.nombre}»? Los recordatorios ya enviados conservan su texto.`}
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

function FormularioPlantillaWhatsapp({
  inicial,
  onTerminado,
}: {
  inicial: PlantillaWhatsappSalidaDto | null;
  onTerminado: () => void;
}) {
  const { crearPlantilla, actualizarPlantilla } = useRecordatorios();

  const [nombre, setNombre] = useState("");
  const [cuerpo, setCuerpo] = useState(CUERPO_RECORDATORIO_POR_DEFECTO);
  const [claveMeta, setClaveMeta] = useState("");
  const [idiomaMeta, setIdiomaMeta] = useState("es_AR");
  const [variables, setVariables] = useState<VariableRecordatorio[]>([
    ...VARIABLES_RECORDATORIO,
  ]);
  const [predeterminada, setPredeterminada] = useState(false);
  const [activa, setActiva] = useState(true);

  useEffect(() => {
    if (!inicial) return;
    setNombre(inicial.nombre);
    setCuerpo(inicial.cuerpo);
    setClaveMeta(inicial.claveMeta ?? "");
    setIdiomaMeta(inicial.idiomaMeta);
    setVariables(inicial.variablesMeta);
    setPredeterminada(inicial.predeterminada);
    setActiva(inicial.activa);
  }, [inicial]);

  const vistaPrevia = renderizarPlantilla(
    cuerpo,
    variablesEjemplo("Lic. Nutrición", new Date()),
  );
  const guardando = crearPlantilla.isPending || actualizarPlantilla.isPending;

  function guardar() {
    const datos = {
      nombre,
      cuerpo,
      claveMeta: claveMeta.trim() || null,
      idiomaMeta,
      variablesMeta: variables,
      predeterminada,
      activa,
    };
    if (inicial) {
      actualizarPlantilla.mutate(
        { id: inicial.id, ...datos },
        { onSuccess: onTerminado },
      );
    } else {
      crearPlantilla.mutate(datos, { onSuccess: onTerminado });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pl-nombre">Nombre</Label>
        <Input
          id="pl-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Recordatorio de turno"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pl-cuerpo">Mensaje</Label>
        <Textarea
          id="pl-cuerpo"
          rows={5}
          maxLength={MAX_LARGO_CUERPO_PLANTILLA}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Datos que podés insertar:{" "}
          {VARIABLES_RECORDATORIO.map((v) => (
            <code
              key={v}
              className="mr-1.5 rounded bg-muted px-1"
            >{`{{${v}}}`}</code>
          ))}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Vista previa</Label>
        <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
          {vistaPrevia}
        </p>
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">
          Plantilla aprobada en Meta (opcional)
        </p>
        <p className="text-xs text-muted-foreground">
          Fuera de las 24 h desde el último mensaje del paciente, WhatsApp solo
          acepta plantillas aprobadas. Un recordatorio de turno casi siempre cae
          fuera de esa ventana, así que sin esto el envío automático no va a
          salir por la API. Se da de alta en Meta Business y acá se anota su
          nombre.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pl-meta">Nombre en Meta</Label>
            <Input
              id="pl-meta"
              value={claveMeta}
              onChange={(e) => setClaveMeta(e.target.value.toLowerCase())}
              placeholder="recordatorio_turno"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pl-idioma">Idioma</Label>
            <Input
              id="pl-idioma"
              value={idiomaMeta}
              onChange={(e) => setIdiomaMeta(e.target.value)}
              placeholder="es_AR"
            />
          </div>
        </div>

        {claveMeta.trim().length > 0 && (
          <div className="space-y-1.5">
            <Label>Orden de los parámetros</Label>
            <p className="text-xs text-muted-foreground">
              Meta numera los parámetros del cuerpo aprobado ({"{{1}}"},{" "}
              {"{{2}}"}…) en vez de nombrarlos. Este es el orden en que se
              completan: si no coincide con el de la plantilla aprobada, al
              paciente le llega la fecha donde va el nombre.
            </p>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, indice) => (
                <Badge key={variable} variant="secondary">
                  {indice + 1}. {variable}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {VARIABLES_RECORDATORIO.map((variable) => {
                const usada = variables.includes(variable);
                return (
                  <button
                    key={variable}
                    type="button"
                    onClick={() =>
                      setVariables(
                        usada
                          ? variables.filter((v) => v !== variable)
                          : [...variables, variable],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs ${
                      usada
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {variable}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={predeterminada}
            onChange={(e) => setPredeterminada(e.target.checked)}
          />
          Usar por defecto
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={activa}
            onChange={(e) => setActiva(e.target.checked)}
          />
          Activa
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onTerminado}>
          Cancelar
        </Button>
        <Button
          disabled={guardando || !nombre.trim() || !cuerpo.trim()}
          onClick={guardar}
        >
          {guardando ? "Guardando…" : "Guardar plantilla"}
        </Button>
      </div>
    </div>
  );
}
