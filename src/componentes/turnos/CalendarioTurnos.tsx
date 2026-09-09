"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import { useSedeActiva } from "@/lib/hooks/useSedeActiva";
import { agendaUnificada, sedePorDiaDeLaSemana } from "@/lib/sedes";
import { diaSemanaISO } from "@/lib/agenda";
import { aFechaISO, hoyArgentinaISO, horaArgentinaHHmm } from "@/lib/formato";
import { sumarDias, ventanaDeDias } from "@/lib/calendarioSemanal";
import { Button } from "@/componentes/ui/button";
import { MiniMes } from "@/componentes/turnos/MiniMes";
import { GrillaSemanal } from "@/componentes/turnos/GrillaSemanal";

/** Cuántos días muestra el detalle. */
const DIAS_VISIBLES = 7;

const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

interface PropsCalendario {
  turnos: TurnoSalidaDto[];
  mapaPacientes: Map<string, string>;
  /** Las sedes vigentes, en el orden en que se muestran. */
  sedes: EstablecimientoSalidaDto[];
  /** Color por establecimiento, compartido con el selector y la leyenda. */
  colores: Map<string, string>;
  /**
   * Click en un hueco libre: abrir el alta con ese día, esa hora y la sede a
   * la que pertenece el día.
   */
  onAgendar: (
    fechaISO: string,
    hora: string,
    establecimientoId: string,
  ) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  onGrabar: (turno: TurnoSalidaDto) => void;
}

/**
 * Calendario de turnos: el mes en chico al costado y el detalle de los
 * próximos 7 días con sus horas, al modo de Google Calendar.
 *
 * Reemplaza a la grilla mensual anterior, donde un turno era una línea de
 * texto en la casilla del día y verlo en detalle exigía abrir un diálogo con
 * la lista del día. Lo que se pierde de un vistazo con ese formato es
 * justamente lo que importa en una agenda: CUÁNDO, y cuánto dura. Acá el turno
 * ocupa su franja horaria y su alto es su duración, así que los huecos de la
 * jornada se ven sin leer una sola hora.
 *
 * La ventana de 7 días es ROLLING —arranca en el día anclado, no en el lunes
 * de la semana—: la pregunta del profesional es "qué viene ahora", y un
 * viernes a la tarde una semana calendario muestra dos días útiles.
 *
 * La navegación tiene dos velocidades y son distintas a propósito: las flechas
 * de arriba corren la ventana de a 7 días, y el mini mes salta a cualquier día
 * —de este mes o de otro— poniéndolo como primer día del detalle.
 */
export function CalendarioTurnos({
  turnos,
  mapaPacientes,
  sedes,
  colores,
  onAgendar,
  onReprogramar,
  onGrabar,
}: PropsCalendario) {
  // Qué agenda gobierna la grilla: la de la sede elegida, o la UNIÓN de todas
  // cuando se las mira juntas. La unión no recorta nada —días, horario y paso
  // son los más amplios de las sedes visibles—, así que ningún turno queda
  // fuera de la ventana ni un sábado se pinta cerrado porque una sola sede
  // descansa. `rangoHorarioVisible` ensancha además por los turnos que caigan
  // fuera del horario declarado.
  const { sedeActivaId } = useSedeActiva();
  const sedesVisibles = useMemo(
    () => (sedeActivaId ? sedes.filter((s) => s.id === sedeActivaId) : sedes),
    [sedes, sedeActivaId],
  );
  const agenda = useMemo(() => agendaUnificada(sedesVisibles), [sedesVisibles]);
  const unificado = sedesVisibles.length > 1;

  /**
   * De quién es cada día, cuando se puede decidir. Con una sola sede a la
   * vista es siempre esa; con varias, solo si comparten horario y duración y
   * sus días no se pisan. Es lo que decide si se puede agendar clickeando un
   * hueco (ver `sedePorDiaDeLaSemana`).
   */
  const duenaPorDia = useMemo(
    () => (unificado ? sedePorDiaDeLaSemana(sedesVisibles) : null),
    [unificado, sedesVisibles],
  );
  const sedeDelDia = useCallback(
    (fechaISO: string) => {
      if (!unificado) return sedesVisibles[0] ?? null;
      return duenaPorDia?.get(diaSemanaISO(fechaISO)) ?? null;
    },
    [unificado, sedesVisibles, duenaPorDia],
  );

  const hoyISO = hoyArgentinaISO();
  const [anclaISO, setAnclaISO] = useState(hoyISO);
  const [mesReferencia, setMesReferencia] = useState(() =>
    primerDiaDelMes(hoyISO),
  );
  const [turnoAbiertoId, setTurnoAbiertoId] = useState<string | null>(null);

  const ahoraHHmm = useMinutoActual();

  const dias = useMemo(
    () => ventanaDeDias(anclaISO, DIAS_VISIBLES),
    [anclaISO],
  );
  const diasVisibles = useMemo(() => new Set(dias), [dias]);

  const turnosPorDia = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const turno of turnos) {
      const clave = aFechaISO(turno.fecha);
      cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    }
    return cuenta;
  }, [turnos]);

  const nombrePaciente = (pacienteId: string): string =>
    mapaPacientes.get(pacienteId) ?? "Paciente";

  /** Mover la ventana también acompaña el mini mes al mes que corresponde. */
  function irA(fechaISO: string) {
    setAnclaISO(fechaISO);
    setMesReferencia(primerDiaDelMes(fechaISO));
    setTurnoAbiertoId(null);
  }

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
          anclaISO={anclaISO}
          diasVisibles={diasVisibles}
          turnosPorDia={turnosPorDia}
          hoyISO={hoyISO}
          onSeleccionar={irA}
        />
        <p className="text-xs text-muted-foreground">
          {unificado && !duenaPorDia
            ? "Clickeá un día para ver esa semana o un turno para abrir su ficha. Para agendar desde un hueco, elegí un establecimiento: los consultorios comparten días u horarios y el hueco no diría en cuál."
            : "Clickeá un día para ver esa semana, un turno para abrir su ficha o un hueco libre para agendar."}
        </p>

        {/* La leyenda solo aparece cuando el color significa algo: con una sola
            sede a la vista, todos los globos serían del mismo color. */}
        {unificado && (
          <ul className="space-y-1">
            {sedesVisibles.map((sede) => (
              <li
                key={sede.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colores.get(sede.id) }}
                />
                <span className="truncate">{sede.nombre}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold capitalize">
            {rotuloDelRango(dias)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="7 días antes"
              onClick={() => irA(sumarDias(anclaISO, -DIAS_VISIBLES))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={anclaISO === hoyISO}
              onClick={() => irA(hoyISO)}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="7 días después"
              onClick={() => irA(sumarDias(anclaISO, DIAS_VISIBLES))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <GrillaSemanal
          dias={dias}
          turnos={turnos}
          nombrePaciente={nombrePaciente}
          agenda={agenda}
          unificado={unificado}
          colores={colores}
          sedeDelDia={sedeDelDia}
          hoyISO={hoyISO}
          ahoraHHmm={ahoraHHmm}
          onAgendar={onAgendar}
          onReprogramar={onReprogramar}
          onGrabar={onGrabar}
          turnoAbiertoId={turnoAbiertoId}
          onAbrirTurno={setTurnoAbiertoId}
        />
      </div>
    </div>
  );
}

/**
 * Minuto actual en horario argentino ("HH:mm"), o null antes de hidratar.
 *
 * El reloj es un sistema EXTERNO a React —cambia solo, sin que nadie
 * despache—, así que se lee con `useSyncExternalStore` y no con un estado que
 * un efecto rellena al montar. Devolver null como instantánea del servidor es
 * lo que evita la diferencia de hidratación: la hora del servidor y la del
 * navegador no tienen por qué coincidir, y la línea de "ahora" pintada en el
 * HTML inicial quedaría en otro lugar del que le corresponde.
 *
 * Se consulta cada 15 s y no cada 60: un intervalo de un minuto no está
 * alineado con el cambio de minuto del reloj, así que la línea llegaría a
 * atrasarse casi un minuto entero. React solo vuelve a renderizar cuando el
 * texto cambia, de modo que el costo real sigue siendo un render por minuto.
 */
function useMinutoActual(): string | null {
  return useSyncExternalStore(suscribirAlReloj, horaArgentinaHHmm, () => null);
}

function suscribirAlReloj(alCambiar: () => void): () => void {
  const id = setInterval(alCambiar, 15_000);
  return () => clearInterval(id);
}

/** Primer día (UTC) del mes al que pertenece una fecha ISO. */
function primerDiaDelMes(fechaISO: string): Date {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

/**
 * "1 – 7 de septiembre de 2026", y con el mes o el año de cada punta cuando la
 * ventana los cruza. Siete días rodantes cruzan el fin de mes una vez de cada
 * cuatro: omitirlo dejaría "28 – 3" sin decir de qué meses.
 */
function rotuloDelRango(dias: string[]): string {
  const primero = new Date(`${dias[0]}T00:00:00Z`);
  const ultimo = new Date(`${dias[dias.length - 1]}T00:00:00Z`);

  const mismoAnio = primero.getUTCFullYear() === ultimo.getUTCFullYear();
  const mismoMes = mismoAnio && primero.getUTCMonth() === ultimo.getUTCMonth();

  const desde = mismoMes
    ? `${primero.getUTCDate()}`
    : `${primero.getUTCDate()} de ${MESES_LARGOS[primero.getUTCMonth()]}${
        mismoAnio ? "" : ` de ${primero.getUTCFullYear()}`
      }`;

  const hasta = `${ultimo.getUTCDate()} de ${MESES_LARGOS[ultimo.getUTCMonth()]} de ${ultimo.getUTCFullYear()}`;

  return `${desde} – ${hasta}`;
}
