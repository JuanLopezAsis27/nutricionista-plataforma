"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Send, Mail, BellRing, CheckCircle2, XCircle } from "lucide-react";
import type { PlantillaSalidaDto } from "@/aplicacion/dtos/secretaria.dto";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import { formatearFechaLarga } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { FormularioPlantilla } from "@/componentes/secretaria/FormularioPlantilla";
import { EnviarPruebaDialog } from "@/componentes/secretaria/EnviarPruebaDialog";

export default function PaginaPlantillas() {
  const { listarPlantillas, emailsRecientes, eliminarPlantilla, enviarRecordatorios } =
    useSecretaria();
  const plantillas = listarPlantillas();
  const envios = emailsRecientes({ limite: 15 });

  const [formAbierto, setFormAbierto] = useState(false);
  const [editar, setEditar] = useState<PlantillaSalidaDto | null>(null);
  const [prueba, setPrueba] = useState<PlantillaSalidaDto | null>(null);
  const [eliminar, setEliminar] = useState<PlantillaSalidaDto | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Secretaría</h1>
          <p className="text-sm text-muted-foreground">
            Plantillas de email y recordatorios automáticos de turnos.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditar(null);
            setFormAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      {/* Recordatorios automáticos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-5 w-5 text-primary" /> Recordatorios de turnos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">
            Cada día a las 09:00 se envía el recordatorio de los turnos del día siguiente
            (usa la plantilla <span className="font-mono">RECORDATORIO_TURNO</span>). Es
            idempotente: no reenvía a quien ya se le avisó.
          </p>
          <Button
            variant="outline"
            onClick={() => enviarRecordatorios.mutate()}
            disabled={enviarRecordatorios.isPending}
          >
            <Send className="h-4 w-4" />
            {enviarRecordatorios.isPending ? "Enviando…" : "Enviar ahora"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de plantillas */}
      {plantillas.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : plantillas.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar las plantillas.</p>
      ) : (plantillas.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay plantillas todavía.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plantillas.data!.map((plantilla) => (
            <Card key={plantilla.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {plantilla.nombre}
                  {plantilla.deSistema && <Badge variant="secondary">Sistema</Badge>}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {plantilla.clave}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {plantilla.descripcion && (
                  <p className="text-sm text-muted-foreground">{plantilla.descripcion}</p>
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
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPrueba(plantilla)}>
                    <Send className="h-4 w-4" />
                    Prueba
                  </Button>
                  {!plantilla.deSistema && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setEliminar(plantilla)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Envíos recientes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-muted-foreground" /> Envíos recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {envios.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (envios.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se envió ningún email.</p>
          ) : (
            <ul className="divide-y text-sm">
              {envios.data!.map((envio) => (
                <li key={envio.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate">
                      {envio.asunto}{" "}
                      <span className="text-muted-foreground">→ {envio.para}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFechaLarga(envio.creadoEn)} ·{" "}
                      <span className="font-mono">{envio.plantillaClave}</span>
                    </p>
                  </div>
                  {envio.error ? (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-label="Con error" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Enviado" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Crear / editar */}
      <Dialog open={formAbierto} onOpenChange={setFormAbierto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editar ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          </DialogHeader>
          <FormularioPlantilla
            plantillaInicial={editar}
            onTerminado={() => setFormAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      <EnviarPruebaDialog plantilla={prueba} onCerrar={() => setPrueba(null)} />

      <ModalConfirmacion
        abierto={Boolean(eliminar)}
        titulo="Eliminar plantilla"
        descripcion={`¿Eliminar la plantilla «${eliminar?.nombre}»? Esta acción no se puede deshacer.`}
        cargando={eliminarPlantilla.isPending}
        onCancelar={() => setEliminar(null)}
        onConfirmar={() => {
          if (!eliminar) return;
          eliminarPlantilla.mutate({ id: eliminar.id }, { onSuccess: () => setEliminar(null) });
        }}
      />
    </div>
  );
}
