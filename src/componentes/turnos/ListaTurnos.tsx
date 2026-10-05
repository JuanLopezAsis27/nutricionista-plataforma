"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import { useSedeActiva } from "@/lib/hooks/useSedeActiva";
import { agendaUnificada, etiquetaSede } from "@/lib/sedes";
import { esDiaDeAtencion, diasDeAtencionEnTexto } from "@/lib/agenda";
import { sumarDias } from "@/lib/calendarioSemanal";
import {
  aFechaISO,
  formatearFecha,
  formatearFechaLarga,
  formatearMoneda,
  hoyArgentinaISO,
} from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  TablaDatos,
  type ColumnaTabla,
} from "@/componentes/comunes/TablaDatos";
import { EstadoBadge } from "@/componentes/comunes/EstadoBadge";
import { InfoCancelacion } from "@/componentes/turnos/InfoCancelacion";
import { AccionesTurno } from "@/componentes/turnos/AccionesTurno";
import { CobroTurno } from "@/componentes/turnos/CobroTurno";
import { MiniMes } from "@/componentes/turnos/MiniMes";
import { AccionesLoteTurnos } from "@/componentes/turnos/AccionesLoteTurnos";

/** Cuántos días mira hacia adelante o atrás para encontrar uno de atención. */
const BUSQUEDA_MAXIMA_DIAS = 14;

interface PropsListaTurnos {
  /** Turnos ya recortados por sede y estado (los filtra el servidor). */
  turnos: TurnoSalidaDto[];
  cargando: boolean;
  sedes: EstablecimientoSalidaDto[];
  colores: Map<string, string>;
  /** Día que se está mirando (YYYY-MM-DD), o null para ver todos juntos. */
  fechaISO: string | null;
  onCambiarFecha: (fechaISO: string | null) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  onGrabar: (turno: TurnoSalidaDto) => void;
}

/**
 * Vista de lista de la agenda: un DÍA por vez, con el mes en chico al costado
 * como el calendario, y selección múltiple para cambiar estado y cobro de
 * varios turnos juntos.
 *
 * Antes era la agenda entera en una tabla con un input de fecha suelto: para
 * cerrar el día —marcar quién vino y quién pagó— había que buscarlo a mano y
 * después tocar los turnos de a uno.
 *
 * El día se recorta en el navegador, sobre la MISMA consulta que usa el
 * calendario: el mini mes necesita saber qué días tienen turnos, y con la
 * consulta compartida pasar de una vista a la otra no vuelve a pedir nada.
 *
 * Las flechas saltan al día de atención anterior o siguiente según la agenda
 * de la sede elegida (o de la unión de todas): un consultorio que atiende
 * martes y jueves no tiene por qué pasar por el miércoles vacío.
 */
export function ListaTurnos({
  turnos,
  cargando,
  sedes,
  colores,
  fechaISO,
  onCambiarFecha,
  onReprogramar,
  onGrabar,
}: PropsListaTurnos) {
  const { sedeActivaId } = useSedeActiva();
  const sedesVisibles = useMemo(
    () => (sedeActivaId ? sedes.filter((s) => s.id === sedeActivaId) : sedes),
    [sedes, sedeActivaId],
  );
  const agenda = useMemo(() => agendaUnificada(sedesVisibles), [sedesVisibles]);
  const atiende = useCallback(
    (iso: string) => esDiaDeAtencion(agenda, iso),
    [agenda],
  );

  const hoyISO = hoyArgentinaISO();
  const [mesReferencia, setMesReferencia] = useState(() =>
    primerDiaDelMes(fechaISO ?? hoyISO),
  );
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());

  const turnosPorDia = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const turno of turnos) {
      const clave = aFechaISO(turno.fecha);
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
    return cuenta;
  }, [turnos]);

  const visibles = useMemo(
    () =>
      fechaISO ? turnos.filter((t) => aFechaISO(t.fecha) === fechaISO) : turnos,
    [turnos, fechaISO],
  );

  // La selección se recorta a lo que está a la vista: cambiar de día o de
  // filtro no puede dejar tildado algo que ya no se ve y que la acción en lote
  // tocaría a ciegas.
  const seleccionados = useMemo(
    () => visibles.filter((t) => seleccion.has(t.id)),
    [visibles, seleccion],
  );
  const idsSeleccionados = useMemo(
    () => new Set(seleccionados.map((t) => t.id)),
    [seleccionados],
  );

  /** Cobrado y por cobrar de lo que está a la vista; los cancelados no suman. */
  const totales = useMemo(() => {
    let cobrado = 0;
    let pendiente = 0;
    for (const turno of visibles) {
      if (turno.estado === "CANCELADO" || turno.precio == null) continue;
      if (turno.pagado) cobrado += turno.precio;
      else pendiente += turno.precio;
    }
    return { cobrado, pendiente };
  }, [visibles]);

  function irA(iso: string | null) {
    onCambiarFecha(iso);
    if (iso) setMesReferencia(primerDiaDelMes(iso));
  }

  /** El próximo día de atención en esa dirección; si no hay, el contiguo. */
  function diaDeAtencionDesde(desdeISO: string, paso: 1 | -1): string {
    let iso = sumarDias(desdeISO, paso);
    for (let i = 0; i < BUSQUEDA_MAXIMA_DIAS; i += 1) {
      if (atiende(iso)) return iso;
      iso = sumarDias(iso, paso);
    }
    return sumarDias(desdeISO, paso);
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
          {t.pacienteNombre}
        </Link>
      ),
    },
    // Con un día elegido la fecha es la del encabezado: repetirla en cada fila
    // solo le quita lugar a lo que cambia.
    ...(fechaISO
      ? []
      : [
          {
            clave: "fecha",
            encabezado: "Fecha",
            render: (t: TurnoSalidaDto) => formatearFecha(t.fecha),
          },
        ]),
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
          {nombreSede(sedes, t)}
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
      render: (t) => (
        <span className="space-y-0.5">
          <EstadoBadge estado={t.estado} />
          <InfoCancelacion turno={t} />
        </span>
      ),
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
          onReprogramar={onReprogramar}
          onGrabar={onGrabar}
        />
      ),
    },
  ];

  const ancla = fechaISO ?? hoyISO;

  return (
    <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="space-y-3">
        <MiniMes
          referencia={mesReferencia}
          onCambiarMes={(delta) =>
            setMesReferencia(
              (actual) =>
                new Date(
                  Date.UTC(
                    actual.getUTCFullYear(),
                    actual.getUTCMonth() + delta,
                    1,
                  ),
                ),
            )
          }
          anclaISO={fechaISO ?? ""}
          diasVisibles={new Set(fechaISO ? [fechaISO] : [])}
          turnosPorDia={turnosPorDia}
          hoyISO={hoyISO}
          onSeleccionar={irA}
          esDiaDeAtencion={atiende}
        />
        <p className="text-xs text-muted-foreground">
          Se atiende {diasDeAtencionEnTexto(agenda)}. Clickeá un día para ver
          sus turnos; los días apagados no son de atención.
        </p>
      </aside>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold first-letter:uppercase">
              {fechaISO ? formatearFechaLarga(fechaISO) : "Todos los días"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {visibles.length === 1 ? "1 turno" : `${visibles.length} turnos`}
              {totales.cobrado + totales.pendiente > 0 &&
                ` · Cobrado ${formatearMoneda(totales.cobrado)} · Por cobrar ${formatearMoneda(totales.pendiente)}`}
              {fechaISO && !atiende(fechaISO) && " · Día sin atención"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Día de atención anterior"
              onClick={() => irA(diaDeAtencionDesde(ancla, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={fechaISO === hoyISO}
              onClick={() => irA(hoyISO)}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Día de atención siguiente"
              onClick={() => irA(diaDeAtencionDesde(ancla, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant={fechaISO ? "ghost" : "secondary"}
              size="sm"
              onClick={() => irA(null)}
            >
              Todos los días
            </Button>
          </div>
        </div>

        {seleccionados.length > 0 && (
          <AccionesLoteTurnos
            seleccionados={seleccionados}
            onLimpiar={() => setSeleccion(new Set())}
          />
        )}

        <TablaDatos
          columnas={columnas}
          datos={visibles}
          obtenerClave={(t) => t.id}
          cargando={cargando}
          mensajeVacio={
            fechaISO ? "No hay turnos ese día." : "No hay turnos para mostrar."
          }
          seleccionados={idsSeleccionados}
          onCambiarSeleccion={(id, marcado) =>
            setSeleccion((actual) => {
              const nueva = new Set(actual);
              if (marcado) nueva.add(id);
              else nueva.delete(id);
              return nueva;
            })
          }
          onCambiarSeleccionTodos={(marcado) =>
            setSeleccion(
              marcado ? new Set(visibles.map((t) => t.id)) : new Set(),
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * Nombre Y dirección: en la tabla el establecimiento se lee de un vistazo para
 * saber a dónde va el paciente. Si la sede ya no está entre las vigentes, la
 * que resolvió el servidor para ese turno.
 */
function nombreSede(
  sedes: EstablecimientoSalidaDto[],
  turno: TurnoSalidaDto,
): string {
  const sede = sedes.find((s) => s.id === turno.establecimientoId);
  return sede ? etiquetaSede(sede) : turno.establecimientoNombre || "—";
}

/** Primer día (UTC) del mes al que pertenece una fecha ISO. */
function primerDiaDelMes(fechaISO: string): Date {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}
