"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, List, CalendarDays, FileDown } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { ESTADOS_TURNO, type EstadoTurno } from "@/dominio/entidades/Turno";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useEstablecimientos } from "@/lib/hooks/useEstablecimientos";
import { useSedeActiva } from "@/lib/hooks/useSedeActiva";
import { coloresDeSedes, etiquetaSede } from "@/lib/sedes";
import { formatearFecha, ETIQUETAS_ESTADO_TURNO } from "@/lib/formato";
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
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { FormularioTurno } from "@/componentes/turnos/FormularioTurno";
import { FormularioReprogramar } from "@/componentes/turnos/FormularioReprogramar";
import { GrabacionesConsulta } from "@/componentes/turnos/GrabacionesConsulta";
import { CalendarioTurnos } from "@/componentes/turnos/CalendarioTurnos";
import { SelectorSede } from "@/componentes/turnos/SelectorSede";
import { AccionesTurno } from "@/componentes/turnos/AccionesTurno";
import { CobroTurno } from "@/componentes/turnos/CobroTurno";

type Vista = "lista" | "calendario";

/** Día, hora y sede con los que abrir el alta desde el calendario. */
interface HuecoElegido {
  fecha: string;
  hora?: string;
  /**
   * La sede dueña del día clickeado. Viene resuelta desde la grilla: solo se
   * ofrecen huecos cuando el día pertenece a un único establecimiento.
   */
  establecimientoId?: string;
}

export default function PaginaTurnos() {
  const { listar } = useTurnos();
  const { listar: listarPacientes } = usePacientes();
  const { listar: listarSedes } = useEstablecimientos();
  const { sedeActivaId } = useSedeActiva();

  // Solo las vigentes: las archivadas siguen siendo el lugar de turnos viejos,
  // pero no son un filtro que ofrecerle a nadie.
  const consultaSedes = listarSedes();
  const sedes = useMemo(() => consultaSedes.data ?? [], [consultaSedes.data]);
  const colores = useMemo(() => coloresDeSedes(sedes), [sedes]);
  // Nombre Y dirección: en la tabla el establecimiento se lee de un vistazo
  // para saber a dónde va el paciente, y el nombre solo no lo dice.
  const nombreSede = (id: string): string => {
    const sede = sedes.find((s) => s.id === id);
    return sede ? etiquetaSede(sede) : "—";
  };

  const [vista, setVista] = useState<Vista>("calendario");
  const [filtroEstado, setFiltroEstado] = useState<EstadoTurno | "TODOS">(
    "TODOS",
  );
  const [filtroFecha, setFiltroFecha] = useState("");
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [hueco, setHueco] = useState<HuecoElegido | null>(null);
  const [turnoReprogramar, setTurnoReprogramar] =
    useState<TurnoSalidaDto | null>(null);
  const [turnoGrabar, setTurnoGrabar] = useState<TurnoSalidaDto | null>(null);

  const pacientes = listarPacientes({ pagina: 1, porPagina: 100 });
  // Nombre + teléfono: el teléfono habilita el recordatorio por WhatsApp.
  const mapaPacientes = useMemo(() => {
    const mapa = new Map<string, { nombre: string; telefono: string | null }>();
    pacientes.data?.pacientes.forEach((p) =>
      mapa.set(p.id, {
        nombre: `${p.nombre} ${p.apellido}`,
        telefono: p.telefono,
      }),
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

  // `establecimientoId` sin valor = todas las sedes juntas, que es el
  // calendario unificado. El filtro es del turno, no del paciente: el mismo
  // paciente puede aparecer en las dos sedes y eso es correcto.
  const turnos = listar({
    estado: filtroEstado === "TODOS" ? undefined : filtroEstado,
    fecha: vista === "lista" && filtroFecha ? new Date(filtroFecha) : undefined,
    establecimientoId: sedeActivaId ?? undefined,
  });

  // Mismos filtros que la consulta de arriba: el Excel exporta lo que se ve.
  const parametrosExcel = new URLSearchParams();
  if (filtroEstado !== "TODOS") parametrosExcel.set("estado", filtroEstado);
  if (vista === "lista" && filtroFecha)
    parametrosExcel.set("fecha", filtroFecha);
  if (sedeActivaId) parametrosExcel.set("establecimientoId", sedeActivaId);

  function abrirAlta(
    fecha?: string,
    hora?: string,
    establecimientoId?: string,
  ) {
    setHueco(fecha ? { fecha, hora, establecimientoId } : null);
    setAgendarAbierto(true);
  }

  const columnas: ColumnaTabla<TurnoSalidaDto>[] = [
    {
      clave: "paciente",
      encabezado: "Paciente",
      render: (t) => (
        <Link
          href={`/dashboard/pacientes/${t.pacienteId}`}
          className="font-medium hover:underline"
        >
          {nombrePaciente(t.pacienteId)}
        </Link>
      ),
    },
    {
      clave: "fecha",
      encabezado: "Fecha",
      render: (t) => formatearFecha(t.fecha),
    },
    { clave: "hora", encabezado: "Hora", render: (t) => t.hora },
    {
      clave: "establecimiento",
      encabezado: "Establecimiento",
      render: (t) => (
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: colores.get(t.establecimientoId) }}
          />
          {nombreSede(t.establecimientoId)}
        </span>
      ),
    },
    {
      clave: "duracion",
      encabezado: "Duración",
      render: (t) => `${t.duracionMinutos} min`,
    },
    {
      clave: "estado",
      encabezado: "Estado",
      render: (t) => <EstadoBadge estado={t.estado} />,
    },
    {
      clave: "cobro",
      encabezado: "Cobro",
      render: (t) => <CobroTurno turno={t} />,
    },
    {
      clave: "acciones",
      encabezado: "Acciones",
      className: "text-right",
      render: (t) => (
        <AccionesTurno
          turno={t}
          onReprogramar={setTurnoReprogramar}
          onGrabar={setTurnoGrabar}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={vista === "calendario" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("calendario")}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </Button>
          <Button
            variant={vista === "lista" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setVista("lista")}
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <SelectorSede sedes={sedes} colores={colores} />

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

          <Button asChild variant="outline">
            <a href={`/api/turnos/excel?${parametrosExcel.toString()}`}>
              <FileDown className="h-4 w-4" />
              Excel
            </a>
          </Button>

          <Button onClick={() => abrirAlta()}>
            <Plus className="h-4 w-4" />
            Agendar turno
          </Button>
        </div>
      </div>

      {turnos.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los turnos.
        </p>
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
        <CalendarioTurnos
          turnos={turnos.data ?? []}
          mapaPacientes={mapaNombres}
          sedes={sedes}
          colores={colores}
          onAgendar={abrirAlta}
          onReprogramar={setTurnoReprogramar}
          onGrabar={setTurnoGrabar}
        />
      )}

      {/* Agendar */}
      <Dialog open={agendarAbierto} onOpenChange={setAgendarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar turno</DialogTitle>
          </DialogHeader>
          <FormularioTurno
            // La clave fuerza un formulario nuevo por hueco: sin esto, abrir el
            // diálogo desde otra franja reusa el que quedó montado y conserva
            // el día y la hora anteriores.
            key={`${hueco?.fecha ?? ""}-${hueco?.hora ?? ""}-${hueco?.establecimientoId ?? ""}`}
            fechaInicial={hueco?.fecha}
            horaInicial={hueco?.hora}
            establecimientoInicialId={hueco?.establecimientoId}
            onTerminado={() => setAgendarAbierto(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Grabación de la consulta */}
      <Dialog
        open={Boolean(turnoGrabar)}
        onOpenChange={(abierto) => !abierto && setTurnoGrabar(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Grabación de la consulta
              {turnoGrabar
                ? ` · ${mapaNombres.get(turnoGrabar.pacienteId) ?? ""}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {/* La clave monta un panel nuevo por turno: sin esto, abrirlo para
              otro turno reusaría el que quedó montado, con su grabador a medio
              camino. */}
          {turnoGrabar && (
            <GrabacionesConsulta
              key={turnoGrabar.id}
              turnoId={turnoGrabar.id}
            />
          )}
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
