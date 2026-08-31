"use client";

import { useMemo } from "react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import {
  aHora,
  aMinutos,
  esDiaDeAtencion,
  franjasDelDia,
  ETIQUETA_MOTIVO,
} from "@/lib/agenda";
import {
  rangoHorarioVisible,
  repartirCarriles,
  type BloqueTurno,
} from "@/lib/calendarioSemanal";
import { aFechaISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/componentes/ui/popover";
import { DetalleTurno } from "@/componentes/turnos/DetalleTurno";

/**
 * Alto de una hora en la grilla. Es la constante que fija la escala: todo lo
 * demás —el alto de un turno, su posición, la línea de "ahora"— se deriva de
 * acá, así que un turno de 30 minutos siempre mide exactamente la mitad de una
 * hora y la lectura visual no miente sobre la duración.
 */
const PX_POR_HORA = 56;

/** Ancho de la columna de las horas, a la izquierda. */
const ANCHO_HORAS = "3.25rem";

const COLOR_ESTADO: Record<EstadoTurno, string> = {
  PENDIENTE:
    "border-yellow-400 bg-yellow-100 text-yellow-900 hover:bg-yellow-200 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200 dark:hover:bg-yellow-900",
  CONFIRMADO:
    "border-blue-400 bg-blue-100 text-blue-900 hover:bg-blue-200 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900",
  COMPLETADO:
    "border-green-400 bg-green-100 text-green-900 hover:bg-green-200 dark:border-green-600 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900",
  CANCELADO:
    "border-red-400 bg-red-50 text-red-900/70 line-through hover:bg-red-100 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300/70 dark:hover:bg-red-900/60",
};

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

interface PropsGrillaSemanal {
  /** Los días a mostrar, en formato ISO y consecutivos. */
  dias: string[];
  /** Todos los turnos cargados; la grilla se queda con los de estos días. */
  turnos: TurnoSalidaDto[];
  nombrePaciente: (pacienteId: string) => string;
  config: ConfiguracionSalidaDto;
  hoyISO: string;
  /** Hora actual "HH:mm", o null mientras no haya reloj del cliente. */
  ahoraHHmm: string | null;
  /** Click en una franja libre: abre el alta con ese día y esa hora. */
  onAgendar: (fechaISO: string, hora: string) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  /** Turno cuyo globo está abierto (lo gobierna la pantalla, no la grilla). */
  turnoAbiertoId: string | null;
  onAbrirTurno: (turnoId: string | null) => void;
}

/**
 * Detalle de los días con sus horas: una columna por día, una fila por hora y
 * los turnos ubicados en su franja, con el alto que les da su duración.
 *
 * Clickear un turno abre su ficha en un globo anclado al bloque —cerca de
 * donde se hizo el click, como en Google Calendar—; clickear una franja libre
 * abre el alta ya con ese día y esa hora.
 *
 * Las franjas se apagan con la MISMA función que usa el formulario
 * (`franjasDelDia`), que a su vez es el espejo en pantalla de la regla del
 * dominio. No es duplicación: es que la grilla ofrezca exactamente los huecos
 * que el servidor va a aceptar, en vez de dejar que el profesional descubra el
 * rechazo después de elegir.
 */
export function GrillaSemanal({
  dias,
  turnos,
  nombrePaciente,
  config,
  hoyISO,
  ahoraHHmm,
  onAgendar,
  onReprogramar,
  turnoAbiertoId,
  onAbrirTurno,
}: PropsGrillaSemanal) {
  const enLaVentana = useMemo(() => {
    const delRango = new Set(dias);
    return turnos.filter((t) => delRango.has(aFechaISO(t.fecha)));
  }, [turnos, dias]);

  const { desdeMinutos, hastaMinutos } = useMemo(
    () => rangoHorarioVisible(config, enLaVentana),
    [config, enLaVentana],
  );

  /** Turnos ya ubicados en carriles, por día. */
  const bloquesPorDia = useMemo(() => {
    const porDia = new Map<string, TurnoSalidaDto[]>();
    for (const turno of enLaVentana) {
      const clave = aFechaISO(turno.fecha);
      porDia.set(clave, [...(porDia.get(clave) ?? []), turno]);
    }
    return new Map(
      [...porDia].map(([clave, lista]) => [clave, repartirCarriles(lista)]),
    );
  }, [enLaVentana]);

  const horas = Array.from(
    { length: (hastaMinutos - desdeMinutos) / 60 },
    (_, i) => desdeMinutos + i * 60,
  );
  const altoTotal = ((hastaMinutos - desdeMinutos) / 60) * PX_POR_HORA;

  /** Minutos desde medianoche → píxeles desde el borde superior de la grilla. */
  const aPixeles = (minutos: number) =>
    ((minutos - desdeMinutos) / 60) * PX_POR_HORA;

  const minutosAhora = ahoraHHmm != null ? aMinutos(ahoraHHmm) : null;

  return (
    <div className="overflow-hidden rounded-md border">
      {/* Encabezado: qué día es cada columna. */}
      <div className="flex border-b bg-muted/40">
        <div className="shrink-0" style={{ width: ANCHO_HORAS }} />
        {dias.map((dia) => {
          const fecha = new Date(`${dia}T00:00:00Z`);
          const esHoy = dia === hoyISO;
          return (
            <div key={dia} className="flex-1 border-l py-1.5 text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {DIAS_CORTOS[fecha.getUTCDay()]}
              </p>
              <p
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                  esHoy && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {fecha.getUTCDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Cuerpo con scroll: la jornada entera puede no entrar en pantalla. */}
      <div className="max-h-[65vh] overflow-y-auto">
        {/* El padding de arriba es para que la etiqueta de la primera hora,
            que se centra sobre su línea, no quede cortada. */}
        <div className="flex pt-2.5">
          <div className="shrink-0" style={{ width: ANCHO_HORAS }}>
            {horas.map((minutos) => (
              <div
                key={minutos}
                className="relative"
                style={{ height: PX_POR_HORA }}
              >
                <span className="absolute right-1.5 top-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
                  {aHora(minutos)}
                </span>
              </div>
            ))}
          </div>

          {dias.map((dia) => (
            <ColumnaDia
              key={dia}
              dia={dia}
              bloques={bloquesPorDia.get(dia) ?? []}
              turnosDelDia={enLaVentana.filter(
                (t) => aFechaISO(t.fecha) === dia,
              )}
              nombrePaciente={nombrePaciente}
              config={config}
              desdeMinutos={desdeMinutos}
              hastaMinutos={hastaMinutos}
              altoTotal={altoTotal}
              aPixeles={aPixeles}
              hoyISO={hoyISO}
              ahoraHHmm={ahoraHHmm}
              minutosAhora={minutosAhora}
              onAgendar={onAgendar}
              onReprogramar={onReprogramar}
              turnoAbiertoId={turnoAbiertoId}
              onAbrirTurno={onAbrirTurno}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface PropsColumnaDia {
  dia: string;
  bloques: BloqueTurno[];
  turnosDelDia: TurnoSalidaDto[];
  nombrePaciente: (pacienteId: string) => string;
  config: ConfiguracionSalidaDto;
  desdeMinutos: number;
  hastaMinutos: number;
  altoTotal: number;
  aPixeles: (minutos: number) => number;
  hoyISO: string;
  ahoraHHmm: string | null;
  minutosAhora: number | null;
  onAgendar: (fechaISO: string, hora: string) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  turnoAbiertoId: string | null;
  onAbrirTurno: (turnoId: string | null) => void;
}

/** Un día de la grilla: sus franjas de fondo y sus turnos encima. */
function ColumnaDia({
  dia,
  bloques,
  turnosDelDia,
  nombrePaciente,
  config,
  desdeMinutos,
  hastaMinutos,
  altoTotal,
  aPixeles,
  hoyISO,
  ahoraHHmm,
  minutosAhora,
  onAgendar,
  onReprogramar,
  turnoAbiertoId,
  onAbrirTurno,
}: PropsColumnaDia) {
  const diaHabil = esDiaDeAtencion(config, dia);
  const paso = config.turnoPasoMinutos;

  // Las franjas del día con su motivo, exactamente las que ofrece el
  // formulario: se dibujan como huecos clickeables y las demás no existen.
  // Salen de `franjasDelDia` en vez de rehacerse cada `paso` desde el borde de
  // la grilla porque el horario de atención no tiene por qué arrancar en hora
  // en punto: con apertura 08:15 y paso 30, una rejilla propia caería siempre
  // entre franjas y no habría un solo hueco para clickear.
  const franjas = useMemo(() => {
    if (!diaHabil) return [];
    return franjasDelDia({
      config,
      fechaISO: dia,
      duracionMinutos: config.turnoDuracionMinutos,
      ocupados: turnosDelDia,
      hoyISO,
      ahoraHHmm: ahoraHHmm ?? "00:00",
      // La última franja arranca EN la hora de cierre (nunca es agendable, pero
      // `franjasDelDia` la devuelve para poder explicar por qué): dibujarla
      // desbordaría la grilla por abajo.
    }).filter((f) => aMinutos(f.hora) < hastaMinutos);
  }, [config, dia, diaHabil, turnosDelDia, hoyISO, ahoraHHmm, hastaMinutos]);

  const horasEnPunto = Array.from(
    { length: (hastaMinutos - desdeMinutos) / 60 },
    (_, i) => desdeMinutos + i * 60,
  );

  const mostrarAhora =
    dia === hoyISO &&
    minutosAhora != null &&
    minutosAhora >= desdeMinutos &&
    minutosAhora <= hastaMinutos;

  return (
    <div
      className={cn("relative flex-1 border-l", !diaHabil && "bg-muted/40")}
      style={{ height: altoTotal }}
    >
      {/* Rayado de fondo: solo las horas en punto. Con una línea por franja la
          grilla se lee como un rayado y deja de leerse como horas. */}
      {horasEnPunto.map((minutos) => (
        <div
          key={minutos}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 border-t"
          style={{ top: aPixeles(minutos) }}
        />
      ))}

      {franjas.map((franja) => {
        const inicio = aMinutos(franja.hora);
        return (
          <button
            key={franja.hora}
            type="button"
            disabled={!franja.disponible}
            onClick={() => onAgendar(dia, franja.hora)}
            title={
              franja.disponible
                ? `Agendar a las ${franja.hora}`
                : franja.motivo
                  ? `${franja.hora} — ${ETIQUETA_MOTIVO[franja.motivo]}`
                  : undefined
            }
            aria-label={
              franja.disponible ? `Agendar a las ${franja.hora}` : undefined
            }
            className={cn(
              "absolute inset-x-0",
              franja.disponible
                ? "cursor-pointer hover:bg-primary/10"
                : "cursor-default",
            )}
            style={{
              top: aPixeles(inicio),
              height: (paso / 60) * PX_POR_HORA,
            }}
          />
        );
      })}

      {bloques.map((bloque) => {
        const ancho = 100 / bloque.carriles;
        const alto = Math.max(
          16,
          ((bloque.finMinutos - bloque.inicioMinutos) / 60) * PX_POR_HORA - 2,
        );
        const compacto = alto < 34;
        const nombre = nombrePaciente(bloque.turno.pacienteId);

        return (
          <Popover
            key={bloque.turno.id}
            open={turnoAbiertoId === bloque.turno.id}
            onOpenChange={(abierto) =>
              onAbrirTurno(abierto ? bloque.turno.id : null)
            }
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "absolute overflow-hidden rounded-[3px] border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight shadow-sm transition-colors",
                  COLOR_ESTADO[bloque.turno.estado],
                )}
                style={{
                  top: aPixeles(bloque.inicioMinutos),
                  height: alto,
                  left: `calc(${bloque.carril * ancho}% + 2px)`,
                  width: `calc(${ancho}% - 4px)`,
                }}
                title={`${bloque.turno.hora} · ${nombre}`}
              >
                {compacto ? (
                  <p className="truncate">
                    <span className="font-medium tabular-nums">
                      {bloque.turno.hora}
                    </span>{" "}
                    {nombre}
                  </p>
                ) : (
                  <>
                    <p className="truncate font-medium">{nombre}</p>
                    <p className="truncate tabular-nums opacity-80">
                      {bloque.turno.hora}–{aHora(bloque.finMinutos)}
                    </p>
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-80 p-3">
              <DetalleTurno
                turno={bloque.turno}
                nombrePaciente={nombre}
                onReprogramar={(turno) => {
                  onAbrirTurno(null);
                  onReprogramar(turno);
                }}
                onCerrar={() => onAbrirTurno(null)}
              />
            </PopoverContent>
          </Popover>
        );
      })}

      {mostrarAhora && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
          style={{ top: aPixeles(minutosAhora) }}
        >
          <span className="absolute -left-1 -top-[5px] block h-2 w-2 rounded-full bg-red-500" />
        </div>
      )}
    </div>
  );
}
