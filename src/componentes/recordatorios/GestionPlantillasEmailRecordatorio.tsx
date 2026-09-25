"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, Mail } from "lucide-react";
import type { PlantillaEmailRecordatorioSalidaDto } from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import {
  ASUNTO_RECORDATORIO_POR_DEFECTO,
  CUERPO_RECORDATORIO_EMAIL_POR_DEFECTO,
} from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { PLACEHOLDERS_PLANTILLA } from "@/dominio/entidades/PlantillaEmail";
import {
  renderizarPlantillaCliente,
  renderizarHtmlCliente,
  variablesEjemploCliente,
} from "@/lib/plantillaPreview";
import { useNombreProfesional } from "@/lib/hooks/useNombreProfesional";
import { useConfiguracion } from "@/lib/hooks/useConfiguracion";
import type { BotonCancelacion } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import {
  MAX_LARGO_MENSAJE_CANCELACION,
  MENSAJE_CANCELACION_POR_DEFECTO,
} from "@/dominio/servicios/cancelacionPorWhatsapp";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { DIAS_OFRECIDOS, etiquetaDiasAntes } from "./ConfiguracionMedios";

/** Valor del selector de día: el Select de shadcn no admite `null` como value. */
const SIN_DIA = "sin-dia";

/** Plantillas del recordatorio por email, una por escalón de anticipación. */
export function GestionPlantillasEmailRecordatorio() {
  const { plantillasEmail, eliminarPlantillaEmail } = useRecordatorios();
  const consulta = plantillasEmail();
  const [editando, setEditando] =
    useState<PlantillaEmailRecordatorioSalidaDto | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [aEliminar, setAEliminar] =
    useState<PlantillaEmailRecordatorioSalidaDto | null>(null);

  const lista = consulta.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          El texto con el que sale el recordatorio por email. Cada una puede
          asignarse a un día de anticipación; la predeterminada es la que usa el
          envío automático en los días sin una propia, y siempre los envíos
          manuales.
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
          por email no manda nada.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lista.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {plantilla.nombre}
                  {plantilla.diasAntes != null && (
                    <Badge variant="secondary">
                      {etiquetaDiasAntes(plantilla.diasAntes)}
                    </Badge>
                  )}
                  {plantilla.predeterminada && (
                    <Badge>
                      <Star className="mr-1 h-3 w-3" /> Predeterminada
                    </Badge>
                  )}
                  {!plantilla.activa && (
                    <Badge variant="outline">Desactivada</Badge>
                  )}
                  {!plantilla.incluirBotonConfirmacion && (
                    <Badge variant="outline">Sin botón de confirmar</Badge>
                  )}
                  {plantilla.botonCancelacion !== "NINGUNO" && (
                    <Badge variant="outline">
                      {plantilla.botonCancelacion === "APP"
                        ? "Cancela en la app"
                        : "Cancela por WhatsApp"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Asunto: </span>
                  {plantilla.asunto}
                </p>
                <div
                  className="max-h-48 overflow-y-auto rounded-md border bg-white p-3 text-sm text-black"
                  dangerouslySetInnerHTML={{ __html: plantilla.cuerpoHtml }}
                />
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? "Editar plantilla" : "Nueva plantilla"}
            </DialogTitle>
          </DialogHeader>
          <FormularioPlantillaEmailRecordatorio
            inicial={editando}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <ModalConfirmacion
        abierto={Boolean(aEliminar)}
        titulo="Eliminar plantilla"
        descripcion={`¿Eliminar «${aEliminar?.nombre}»? Los recordatorios ya enviados conservan su texto.`}
        cargando={eliminarPlantillaEmail.isPending}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={() => {
          if (!aEliminar) return;
          eliminarPlantillaEmail.mutate(
            { id: aEliminar.id },
            { onSuccess: () => setAEliminar(null) },
          );
        }}
      />
    </div>
  );
}

function FormularioPlantillaEmailRecordatorio({
  inicial,
  onTerminado,
}: {
  inicial: PlantillaEmailRecordatorioSalidaDto | null;
  onTerminado: () => void;
}) {
  const { crearPlantillaEmail, actualizarPlantillaEmail } = useRecordatorios();

  const [nombre, setNombre] = useState("");
  const [asunto, setAsunto] = useState(ASUNTO_RECORDATORIO_POR_DEFECTO);
  const [cuerpoHtml, setCuerpoHtml] = useState(
    CUERPO_RECORDATORIO_EMAIL_POR_DEFECTO,
  );
  const [diasAntes, setDiasAntes] = useState<number | null>(null);
  const [predeterminada, setPredeterminada] = useState(false);
  const [activa, setActiva] = useState(true);
  const [incluirBotonConfirmacion, setIncluirBotonConfirmacion] =
    useState(true);
  const [botonCancelacion, setBotonCancelacion] =
    useState<BotonCancelacion>("NINGUNO");
  const [mensajeCancelacion, setMensajeCancelacion] = useState("");
  const sinNumeroCancelaciones =
    useConfiguracion().obtener().data?.whatsappCancelaciones == null;

  useEffect(() => {
    if (!inicial) return;
    setNombre(inicial.nombre);
    setAsunto(inicial.asunto);
    setCuerpoHtml(inicial.cuerpoHtml);
    setDiasAntes(inicial.diasAntes);
    setPredeterminada(inicial.predeterminada);
    setActiva(inicial.activa);
    setIncluirBotonConfirmacion(inicial.incluirBotonConfirmacion);
    setBotonCancelacion(inicial.botonCancelacion);
    setMensajeCancelacion(inicial.mensajeCancelacion ?? "");
  }, [inicial]);

  const variables = variablesEjemploCliente(useNombreProfesional());
  const guardando =
    crearPlantillaEmail.isPending || actualizarPlantillaEmail.isPending;

  function insertarPlaceholder(clave: string) {
    setCuerpoHtml((actual) => `${actual}{{${clave}}}`);
  }

  function guardar() {
    const datos = {
      nombre,
      asunto,
      cuerpoHtml,
      diasAntes,
      predeterminada,
      activa,
      incluirBotonConfirmacion,
      botonCancelacion,
      mensajeCancelacion: mensajeCancelacion.trim() || null,
    };
    if (inicial) {
      actualizarPlantillaEmail.mutate(
        { id: inicial.id, ...datos },
        { onSuccess: onTerminado },
      );
    } else {
      crearPlantillaEmail.mutate(datos, { onSuccess: onTerminado });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Columna de edición */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ple-nombre">Nombre</Label>
          <Input
            id="ple-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Recordatorio de turno"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ple-asunto">Asunto</Label>
          <Input
            id="ple-asunto"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Recordatorio de tu turno del {{fecha}}"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ple-cuerpo">Cuerpo (HTML)</Label>
          <Textarea
            id="ple-cuerpo"
            rows={9}
            className="font-mono text-xs"
            value={cuerpoHtml}
            onChange={(e) => setCuerpoHtml(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Insertar variable:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS_PLANTILLA.filter(
              (p) => p.clave !== "email" && p.clave !== "contrasena",
            ).map((p) => (
              <Button
                key={p.clave}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 font-mono text-xs"
                title={p.descripcion}
                onClick={() => insertarPlaceholder(p.clave)}
              >
                {`{{${p.clave}}}`}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Día asignado</Label>
          <Select
            value={diasAntes == null ? SIN_DIA : String(diasAntes)}
            onValueChange={(v) =>
              setDiasAntes(v === SIN_DIA ? null : Number(v))
            }
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SIN_DIA}>
                Sin día (predeterminada / manual)
              </SelectItem>
              {DIAS_OFRECIDOS.map((dias) => (
                <SelectItem key={dias} value={String(dias)}>
                  {etiquetaDiasAntes(dias)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            El barrido automático usa esta plantilla para ese escalón. Asignarla
            se la saca a cualquier otra que la tuviera.
          </p>
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

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={incluirBotonConfirmacion}
            onChange={(e) => setIncluirBotonConfirmacion(e.target.checked)}
          />
          <span>
            Incluir botón «Confirmar asistencia»
            <span className="block text-xs text-muted-foreground">
              Se agrega al final del email, solo en turnos pendientes. Un
              recordatorio más informativo (ej. "3 días antes") puede no
              necesitarlo.
            </span>
          </span>
        </label>

        <div className="space-y-1.5">
          <Label>Botón «Cancelar turno»</Label>
          <Select
            value={botonCancelacion}
            onValueChange={(v) => setBotonCancelacion(v as BotonCancelacion)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NINGUNO">Sin botón de cancelar</SelectItem>
              <SelectItem value="APP">
                Cancela en la app (el turno se cancela solo)
              </SelectItem>
              <SelectItem value="WHATSAPP">
                Abre un chat de WhatsApp con un mensaje
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {botonCancelacion === "APP"
              ? "El paciente confirma en una página y el turno queda cancelado, con la fecha en que lo hizo. Te llega un aviso."
              : botonCancelacion === "WHATSAPP"
                ? "Abre el chat con el número de cancelaciones de Configuración → WhatsApp. No cancela el turno: lo cancelás vos al leer el mensaje."
                : "Se agrega al final del email, en turnos pendientes y confirmados."}
          </p>
        </div>

        {botonCancelacion === "WHATSAPP" && (
          <div className="space-y-1.5">
            <Label htmlFor="ple-mensaje-cancelacion">
              Mensaje de cancelación
            </Label>
            <Textarea
              id="ple-mensaje-cancelacion"
              rows={3}
              maxLength={MAX_LARGO_MENSAJE_CANCELACION}
              placeholder={MENSAJE_CANCELACION_POR_DEFECTO}
              value={mensajeCancelacion}
              onChange={(e) => setMensajeCancelacion(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Le queda escrito al paciente en el chat. Admite las mismas
              variables que el email. Vacío, sale el texto de ejemplo.
            </p>
            {sinNumeroCancelaciones && (
              <p className="text-xs text-destructive">
                Falta el número de cancelaciones en Configuración → WhatsApp.
                Sin él, el email sale sin este botón.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Columna de vista previa */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Vista previa</p>
        <p className="text-xs text-muted-foreground">Con datos de ejemplo.</p>
        <div className="overflow-hidden rounded-md border">
          <div className="border-b bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Asunto: </span>
            <span className="font-medium">
              {renderizarPlantillaCliente(asunto || "—", variables)}
            </span>
          </div>
          <div
            className="max-h-72 overflow-y-auto bg-white p-3 text-sm text-black"
            dangerouslySetInnerHTML={{
              __html: renderizarHtmlCliente(
                cuerpoHtml || "<p>—</p>",
                variables,
              ),
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 md:col-span-2">
        <Button variant="outline" onClick={onTerminado} disabled={guardando}>
          Cancelar
        </Button>
        <Button
          disabled={
            guardando || !nombre.trim() || !asunto.trim() || !cuerpoHtml.trim()
          }
          onClick={guardar}
        >
          {guardando ? "Guardando…" : "Guardar plantilla"}
        </Button>
      </div>
    </div>
  );
}
