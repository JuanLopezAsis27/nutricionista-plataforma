"use client";

import { useMemo, useState } from "react";
import { Send, CircleAlert, CheckCheck, RefreshCw, Pencil } from "lucide-react";
import type {
  TurnoParaRecordarSalidaDto,
  ResultadoEnvioMasivoSalidaDto,
} from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { formatearFecha } from "@/lib/formato";
import { PendientesDeConfirmar } from "@/componentes/recordatorios/PendientesDeConfirmar";
import { DialogoEnviarRecordatorio } from "@/componentes/recordatorios/DialogoEnviarRecordatorio";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Label } from "@/componentes/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";

const VENTANAS = [
  { valor: 3, etiqueta: "Próximos 3 días" },
  { valor: 7, etiqueta: "Próximos 7 días" },
  { valor: 15, etiqueta: "Próximos 15 días" },
  { valor: 30, etiqueta: "Próximos 30 días" },
];

/**
 * Envío manual: los turnos más próximos, se tildan los pacientes y se manda.
 *
 * Ordena por cercanía del turno porque la pregunta al abrir la pantalla es
 * "¿a quién tengo que avisarle ya?", y arranca con TODO destildado: una
 * pantalla que llega con 40 pacientes preseleccionados convierte un clic
 * distraído en 40 mensajes.
 */
export function ConsolaEnvio() {
  const { turnosParaRecordar, plantillas, enviarMasivo } = useRecordatorios();
  const [dias, setDias] = useState(7);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [plantillaId, setPlantillaId] = useState<string>("");
  const [forzar, setForzar] = useState(false);
  const [resultado, setResultado] =
    useState<ResultadoEnvioMasivoSalidaDto | null>(null);
  // Turno cuyo texto se está retocando antes de mandarlo.
  const [turnoAEditar, setTurnoAEditar] = useState<string | null>(null);

  const consulta = turnosParaRecordar({ dias });
  const listaPlantillas = plantillas();
  const turnos = useMemo(() => consulta.data ?? [], [consulta.data]);

  const seleccionables = turnos.filter((t) => t.impedimento == null);
  const todosTildados =
    seleccionables.length > 0 &&
    seleccionables.every((t) => seleccion.has(t.turnoId));

  function alternar(turnoId: string) {
    setSeleccion((previa) => {
      const copia = new Set(previa);
      if (copia.has(turnoId)) copia.delete(turnoId);
      else copia.add(turnoId);
      return copia;
    });
  }

  function alternarTodos() {
    setSeleccion(
      todosTildados ? new Set() : new Set(seleccionables.map((t) => t.turnoId)),
    );
  }

  function enviar() {
    enviarMasivo.mutate(
      {
        turnoIds: [...seleccion],
        plantillaId: plantillaId || null,
        forzar,
      },
      {
        onSuccess: (r) => {
          setResultado(r);
          setSeleccion(new Set());
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-primary" /> Enviar recordatorios
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>Turnos</Label>
            <Select
              value={String(dias)}
              onValueChange={(v) => setDias(Number(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENTANAS.map((v) => (
                  <SelectItem key={v.valor} value={String(v.valor)}>
                    {v.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Plantilla</Label>
            <Select
              value={plantillaId || "__predeterminada__"}
              onValueChange={(v) =>
                setPlantillaId(v === "__predeterminada__" ? "" : v)
              }
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__predeterminada__">
                  Plantilla predeterminada
                </SelectItem>
                {(listaPlantillas.data ?? [])
                  .filter((p) => p.activa)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2.5 pb-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={forzar}
              onChange={(e) => setForzar(e.target.checked)}
            />
            Reenviar a quienes ya recibieron el aviso
          </label>

          <Button
            className="ml-auto"
            disabled={seleccion.size === 0 || enviarMasivo.isPending}
            onClick={enviar}
          >
            <Send className="h-4 w-4" />
            {enviarMasivo.isPending
              ? "Enviando…"
              : `Enviar a ${seleccion.size} paciente${seleccion.size === 1 ? "" : "s"}`}
          </Button>
        </CardContent>
      </Card>

      {/* Sobrevive al cierre del resumen: es donde se declara qué salió. */}
      <PendientesDeConfirmar />

      <DialogoEnviarRecordatorio
        turnoId={turnoAEditar}
        plantillaId={plantillaId || null}
        onCerrar={() => setTurnoAEditar(null)}
      />

      {resultado && (
        <ResumenEnvio
          resultado={resultado}
          onCerrar={() => setResultado(null)}
        />
      )}

      {consulta.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : turnos.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No hay turnos pendientes en esa ventana.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={todosTildados}
                    onChange={alternarTodos}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th className="p-3 font-medium">Paciente</th>
                <th className="p-3 font-medium">Turno</th>
                <th className="p-3 font-medium">Falta</th>
                <th className="p-3 font-medium">Avisos</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {turnos.map((turno) => (
                <FilaTurno
                  key={turno.turnoId}
                  turno={turno}
                  tildado={seleccion.has(turno.turnoId)}
                  onAlternar={() => alternar(turno.turnoId)}
                  onEditar={() => setTurnoAEditar(turno.turnoId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaTurno({
  turno,
  tildado,
  onAlternar,
  onEditar,
}: {
  turno: TurnoParaRecordarSalidaDto;
  tildado: boolean;
  onEditar: () => void;
  onAlternar: () => void;
}) {
  return (
    <tr className={turno.impedimento ? "opacity-60" : undefined}>
      <td className="p-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={tildado}
          disabled={turno.impedimento != null}
          onChange={onAlternar}
          aria-label={`Seleccionar a ${turno.nombrePaciente}`}
        />
      </td>
      <td className="p-3">
        <p className="font-medium">{turno.nombrePaciente}</p>
        {turno.impedimento ? (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <CircleAlert className="h-3.5 w-3.5" /> {turno.impedimento}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">+{turno.telefono}</p>
        )}
      </td>
      <td className="p-3">
        {formatearFecha(turno.fecha)} · {turno.hora}
        {turno.estadoTurno === "CONFIRMADO" && (
          <Badge variant="secondary" className="ml-2">
            Confirmado
          </Badge>
        )}
      </td>
      <td className="p-3 text-muted-foreground">
        {turno.diasFaltantes === 0
          ? "Hoy"
          : turno.diasFaltantes === 1
            ? "Mañana"
            : `${turno.diasFaltantes} días`}
      </td>
      <td className="p-3">
        {turno.avisos.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin avisos</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {turno.avisos.map((aviso) => (
              <Badge
                key={aviso.id}
                variant={
                  aviso.estado === "FALLIDO" ? "destructive" : "secondary"
                }
                title={`${formatearFecha(aviso.creadoEn)} · ${
                  aviso.diasAntes != null
                    ? `${aviso.diasAntes} días antes`
                    : "manual"
                }`}
              >
                {aviso.estado === "CONFIRMADO" && (
                  <CheckCheck className="mr-1 h-3 w-3" />
                )}
                {aviso.estado.toLowerCase()}
              </Badge>
            ))}
          </div>
        )}
      </td>
      <td className="p-3 text-right">
        {/* Salida de a uno, para el caso en que el texto de la plantilla no
            alcanza y hay que decirle algo distinto a ESE paciente. */}
        <Button
          variant="ghost"
          size="sm"
          disabled={turno.impedimento != null}
          onClick={onEditar}
        >
          <Pencil className="h-4 w-4" /> Editar y enviar
        </Button>
      </td>
    </tr>
  );
}

/**
 * Qué pasó con cada uno del lote: cuántos salieron y, sobre todo, quiénes NO.
 *
 * Los chats que hay que abrir a mano NO se listan acá: viven en la bandeja
 * «Sin confirmar», que además sobrevive al cierre de este resumen y es donde
 * se declara cuáles se mandaron. Tenerlos en los dos lados invitaba a abrir el
 * mismo chat dos veces.
 */
function ResumenEnvio({
  resultado,
  onCerrar,
}: {
  resultado: ResultadoEnvioMasivoSalidaDto;
  onCerrar: () => void;
}) {
  const conProblema = resultado.detalles.filter(
    (d) => d.estado === "OMITIDO" || d.estado === "FALLIDO",
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Resultado del envío</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCerrar}>
          Cerrar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {resultado.enviados > 0 && (
            <Badge>{resultado.enviados} enviado(s)</Badge>
          )}
          {resultado.preparados > 0 && (
            <Badge variant="secondary">{resultado.preparados} para abrir</Badge>
          )}
          {resultado.omitidos > 0 && (
            <Badge variant="outline">{resultado.omitidos} omitido(s)</Badge>
          )}
          {resultado.fallidos > 0 && (
            <Badge variant="destructive">{resultado.fallidos} con error</Badge>
          )}
        </div>

        {resultado.preparados > 0 && (
          <p className="text-sm text-muted-foreground">
            WhatsApp no está conectado a la app: los chats quedaron listos
            abajo, en «Sin confirmar». Abrí cada uno, mandá el mensaje que ya va
            escrito y marcalo como enviado.
          </p>
        )}

        {conProblema.length > 0 && (
          <ul className="space-y-1 text-sm">
            {conProblema.map((detalle) => (
              <li key={detalle.turnoId} className="flex items-start gap-2">
                {detalle.estado === "FALLIDO" ? (
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : (
                  <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span>
                  <span className="font-medium">{detalle.nombrePaciente}</span>:{" "}
                  <span className="text-muted-foreground">
                    {detalle.motivo}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
