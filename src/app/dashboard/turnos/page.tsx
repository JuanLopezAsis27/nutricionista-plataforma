"use client";

import { useMemo, useState } from "react";
import { Plus, List, CalendarDays, FileDown } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { ESTADOS_TURNO, type EstadoTurno } from "@/dominio/entidades/Turno";
import { useTurnos } from "@/lib/hooks/useTurnos";
import { useEstablecimientos } from "@/lib/hooks/useEstablecimientos";
import { useSedeActiva } from "@/lib/hooks/useSedeActiva";
import { coloresDeSedes } from "@/lib/sedes";
import { ETIQUETAS_ESTADO_TURNO, hoyArgentinaISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
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
import { FormularioTurno } from "@/componentes/turnos/FormularioTurno";
import { FormularioReprogramar } from "@/componentes/turnos/FormularioReprogramar";
import { useAbrirGrabacion } from "@/componentes/turnos/ProveedorGrabacionConsulta";
import { CalendarioTurnos } from "@/componentes/turnos/CalendarioTurnos";
import { SelectorSede } from "@/componentes/turnos/SelectorSede";
import { ListaTurnos } from "@/componentes/turnos/ListaTurnos";

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
  /** La del turno cancelado cuyo horario se vuelve a ocupar. */
  duracionMinutos?: number;
}

export default function PaginaTurnos() {
  const { listar } = useTurnos();
  const { listar: listarSedes } = useEstablecimientos();
  const { sedeActivaId } = useSedeActiva();

  // Solo las vigentes: las archivadas siguen siendo el lugar de turnos viejos,
  // pero no son un filtro que ofrecerle a nadie.
  const consultaSedes = listarSedes();
  const sedes = useMemo(() => consultaSedes.data ?? [], [consultaSedes.data]);
  const colores = useMemo(() => coloresDeSedes(sedes), [sedes]);

  const [vista, setVista] = useState<Vista>("calendario");
  const [filtroEstado, setFiltroEstado] = useState<EstadoTurno | "TODOS">(
    "TODOS",
  );
  // El día de la lista; null = todos juntos. Arranca en hoy, que es lo que se
  // abre la lista para mirar.
  const [diaLista, setDiaLista] = useState<string | null>(() =>
    hoyArgentinaISO(),
  );
  const [agendarAbierto, setAgendarAbierto] = useState(false);
  const [hueco, setHueco] = useState<HuecoElegido | null>(null);
  const [turnoReprogramar, setTurnoReprogramar] =
    useState<TurnoSalidaDto | null>(null);
  // Grabar no abre un diálogo de esta pantalla: se le pide al proveedor del
  // layout, que es el que sobrevive a navegar a otra mientras se graba.
  const abrirPanel = useAbrirGrabacion();

  // `establecimientoId` sin valor = todas las sedes juntas, que es el
  // calendario unificado. El filtro es del turno, no del paciente: el mismo
  // paciente puede aparecer en las dos sedes y eso es correcto.
  //
  // Las dos vistas comparten la consulta: la lista recorta el día en el
  // navegador porque su mini mes necesita saber qué días tienen turnos, y así
  // cambiar de vista no vuelve a pedir nada.
  const turnos = listar({
    estado: filtroEstado === "TODOS" ? undefined : filtroEstado,
    establecimientoId: sedeActivaId ?? undefined,
  });

  // Mismos filtros que la consulta de arriba: el Excel exporta lo que se ve.
  const parametrosExcel = new URLSearchParams();
  if (filtroEstado !== "TODOS") parametrosExcel.set("estado", filtroEstado);
  if (vista === "lista" && diaLista) parametrosExcel.set("fecha", diaLista);
  if (sedeActivaId) parametrosExcel.set("establecimientoId", sedeActivaId);

  function abrirAlta(
    fecha?: string,
    hora?: string,
    establecimientoId?: string,
    duracionMinutos?: number,
  ) {
    setHueco(
      fecha ? { fecha, hora, establecimientoId, duracionMinutos } : null,
    );
    setAgendarAbierto(true);
  }

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
        <ListaTurnos
          turnos={turnos.data ?? []}
          cargando={turnos.isLoading}
          sedes={sedes}
          colores={colores}
          fechaISO={diaLista}
          onCambiarFecha={setDiaLista}
          onReprogramar={setTurnoReprogramar}
          onGrabar={abrirPanel}
        />
      ) : turnos.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando calendario…</p>
      ) : (
        <CalendarioTurnos
          turnos={turnos.data ?? []}
          sedes={sedes}
          colores={colores}
          onAgendar={abrirAlta}
          onReprogramar={setTurnoReprogramar}
          onGrabar={abrirPanel}
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
            duracionInicial={hueco?.duracionMinutos}
            onTerminado={() => setAgendarAbierto(false)}
          />
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
