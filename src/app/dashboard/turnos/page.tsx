"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, List, CalendarDays } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { ESTADOS_TURNO, type EstadoTurno } from "@/dominio/entidades/Turno";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { formatearFecha, formatearFechaLarga, aFechaISO, ETIQUETAS_ESTADO_TURNO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { TablaDatos, type ColumnaTabla } from "@/componentes/comunes/TablaDatos";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { FormularioTurno } from "@/componentes/turnos/FormularioTurno";
import { FormularioReprogramar } from "@/componentes/turnos/FormularioReprogramar";
import { CalendarioTurnos } from "@/componentes/turnos/CalendarioTurnos";
import { AccionesTurno } from "@/componentes/turnos/AccionesTurno";
import { CobroTurno } from "@/componentes/turnos/CobroTurno";

type Vista = "lista" | "calendario";

export default function PaginaTurnos() {
  const { listar } = useTurnos();
  const { listar: listarPacientes } = usePacientes();

  const [vista, setVista] = useState<Vista>("lista");
  const [filtroEstado, setFiltroEstado] = useState<EstadoTurno | "TODOS">("TODOS");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [fechaParaAgendar, setFechaParaAgendar] = useState<string | null>(null);
  const [turnoReprogramar, setTurnoReprogramar] = useState<TurnoSalidaDto | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);

  const pacientes = listarPacientes({ pagina: 1, porPagina: 100 });
  // Nombre + teléfono: el teléfono habilita el recordatorio por WhatsApp.
  const mapaPacientes = useMemo(() => {
    const mapa = new Map<string, { nombre: string; telefono: string | null }>();
    pacientes.data?.pacientes.forEach((p) =>
      mapa.set(p.id, { nombre: `${p.nombre} ${p.apellido}`, telefono: p.telefono }),
    );
    return mapa;
  }, [pacientes.data]);

  const nombrePaciente = (pacienteId: string): string =>
    mapaPacientes.get(pacienteId)?.nombre ?? "Paciente";

  // El calendario solo necesita los nombres.
  const mapaNombres = useMemo(
    () => new Map([...mapaPacientes].map(([id, p]) => [id, p.nombre])),
    [mapaPacientes],
  );

  const turnos = listar({
    estado: filtroEstado === "TODOS" ? undefined : filtroEstado,
    fecha: vista === "lista" && filtroFecha ? new Date(filtroFecha) : undefined,
  });

  const turnosDelDia = useMemo(() => {
    if (!diaSeleccionado) return [];
    return (turnos.data ?? [])
      .filter((t) => aFechaISO(t.fecha) === diaSeleccionado)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [turnos.data, diaSeleccionado]);

  const columnas: ColumnaTabla<TurnoSalidaDto>[] = [
    {
      clave: "paciente",
      encabezado: "Paciente",
      render: (t) => (
        <Link href={`/dashboard/pacientes/${t.pacienteId}`} className="font-medium hover:underline">
          {nombrePaciente(t.pacienteId)}
        </Link>
      ),
    },
    { clave: "fecha", encabezado: "Fecha", render: (t) => formatearFecha(t.fecha) },
    { clave: "hora", encabezado: "Hora", render: (t) => t.hora },
    { clave: "duracion", encabezado: "Duración", render: (t) => `${t.duracionMinutos} min` },
    { clave: "estado", encabezado: "Estado", render: (t) => <EstadoBadge estado={t.estado} /> },
    { clave: "cobro", encabezado: "Cobro", render: (t) => <CobroTurno turno={t} /> },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (t) => (
        <AccionesTurno
          turno={t}
          onReprogramar={setTurnoReprogramar}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={vista === "lista" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("lista")}
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={vista === "calendario" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("calendario")}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </Button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <Select
            value={filtroEstado}
            onValueChange={(v) => setFiltroEstado(v as EstadoTurno | "TODOS")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los estados</SelectItem>
              {ESTADOS_TURNO.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {ETIQUETAS_ESTADO_TURNO[estado]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {vista === "lista" && (
            <Input
              type="date"
              className="w-40"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />
          )}

          <Button
            onClick={() => {
              setFechaParaAgendar(null);
              setAgendarAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Agendar turno
          </Button>
        </div>
      </div>

      {turnos.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los turnos.</p>
      ) : vista === "lista" ? (
        <TablaDatos
          columnas={columnas}
          datos={turnos.data ?? []}
          obtenerClave={(t) => t.id}
          cargando={turnos.isLoading}
          mensajeVacio="No hay turnos para mostrar."
        />
      ) : turnos.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando calendario…</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Hacé click en un día para ver y gestionar sus turnos.
          </p>
          <CalendarioTurnos
            turnos={turnos.data ?? []}
            mapaPacientes={mapaNombres}
            onSeleccionarDia={setDiaSeleccionado}
          />
        </>
      )}

      {/* Agendar */}
      <Dialog open={agendarAbierto} onOpenChange={setAgendarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar turno</DialogTitle>
          </DialogHeader>
          <FormularioTurno
            fechaInicial={fechaParaAgendar ?? undefined}
            onTerminado={() => setAgendarAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detalle del día (desde el calendario) */}
      <Dialog open={Boolean(diaSeleccionado)} onOpenChange={(e) => !e && setDiaSeleccionado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {diaSeleccionado ? formatearFechaLarga(new Date(diaSeleccionado)) : ""}
            </DialogTitle>
          </DialogHeader>
          {turnosDelDia.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No hay turnos ese día.</p>
          ) : (
            <ul className="divide-y">
              {turnosDelDia.map((turno) => (
                <li key={turno.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 font-mono text-sm">{turno.hora}</span>
                    <div>
                      <p className="text-sm font-medium">
                        {nombrePaciente(turno.pacienteId)}
                      </p>
                      <EstadoBadge estado={turno.estado} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CobroTurno turno={turno} />
                    <AccionesTurno
                      turno={turno}
                      onReprogramar={(t) => {
                        setDiaSeleccionado(null);
                        setTurnoReprogramar(t);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setFechaParaAgendar(diaSeleccionado);
                setDiaSeleccionado(null);
                setAgendarAbierto(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Agendar en este día
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reprogramar */}
      <Dialog
        open={Boolean(turnoReprogramar)}
        onOpenChange={(e) => !e && setTurnoReprogramar(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar turno</DialogTitle>
          </DialogHeader>
          {turnoReprogramar && (
            <FormularioReprogramar
              turno={turnoReprogramar}
              onTerminado={() => setTurnoReprogramar(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
