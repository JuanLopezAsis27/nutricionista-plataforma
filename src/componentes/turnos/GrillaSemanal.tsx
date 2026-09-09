"use client";

import { useMemo } from "react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { AgendaVigente } from "@/lib/agenda";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import {
  aHora,
  aMinutos,
  esDiaDeAtencion,
  franjasDelDia,
  ETIQUETA_MOTIVO,
} from "@/lib/agenda";
import {
  altoDeHora,
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

/** Ancho de la columna de las horas, a la izquierda. */
const ANCHO_HORAS = "3.25rem";

/**
 * Ancho mínimo de cada columna de día.
 *
 * Con 7 días a la vista, repartir el ancho disponible en partes iguales
 * aplasta cada columna en una pantalla angosta hasta que el turno queda
 * ilegible. Este mínimo hace que la grilla entera scrollee horizontalmente en
 * vez de seguir achicando las columnas.
 */
const ANCHO_MIN_DIA = "6.5rem";

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
  /**
   * La agenda que gobierna la grilla: la de la sede elegida, o la unión de
   * todas cuando se las mira juntas (ver `agendaUnificada`).
   */
  agenda: AgendaVigente;
  /**
   * Se están mirando varias sedes a la vez: los globos llevan el color de su
   * establecimiento en el filo y aparece la leyenda.
   */
  unificado: boolean;
  /**
   * La sede a la que pertenece ese día, o `null` si no se puede decidir.
   *
   * Es lo que gobierna los huecos clickeables. Con una sola sede a la vista es
   * siempre esa. Con varias, solo cuando comparten horario y duración y sus
   * días no se pisan (ver `sedePorDiaDeLaSemana`): ahí el día ya dice el
   * lugar. Si devuelve `null` no se dibujan huecos, porque ofrecer uno sería
   * ofrecer un turno que alguna de las sedes va a rechazar.
   */
  sedeDelDia: (fechaISO: string) => EstablecimientoSalidaDto | null;
  /** Color por establecimiento, para distinguirlos en la vista unificada. */
  colores: Map<string, string>;
  hoyISO: string;
  /** Hora actual "HH:mm", o null mientras no haya reloj del cliente. */
  ahoraHHmm: string | null;
  /**
   * Click en una franja libre: abre el alta con ese día, esa hora y la sede
   * dueña del día ya elegidos.
   */
  onAgendar: (
    fechaISO: string,
    hora: string,
    establecimientoId: string,
  ) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  onGrabar: (turno: TurnoSalidaDto) => void;
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
  agenda,
  unificado,
  colores,
  sedeDelDia,
  hoyISO,
  ahoraHHmm,
  onAgendar,
  onReprogramar,
  onGrabar,
  turnoAbiertoId,
  onAbrirTurno,
}: PropsGrillaSemanal) {
  const enLaVentana = useMemo(() => {
    const delRango = new Set(dias);
    return turnos.filter((t) => delRango.has(aFechaISO(t.fecha)));
  }, [turnos, dias]);

  const { desdeMinutos, hastaMinutos } = useMemo(
    () => rangoHorarioVisible(agenda, enLaVentana),
    [agenda, enLaVentana],
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

  /**
   * La escala de la grilla, en píxeles por hora. Es lo único de lo que
   * dependen la posición de un turno, su alto y la línea de «ahora», así que
   * un turno de 30 minutos siempre mide la mitad que uno de una hora.
   *
   * Se ADAPTA al rango visible (`altoDeHora`): con un horario de atención
   * corto las franjas se agrandan hasta llenar la pantalla en vez de dejar la
   * jornada apretada arriba de todo.
   */
  const pxPorHora = altoDeHora(horas.length);
  const altoTotal = horas.length * pxPorHora;

  /** Minutos desde medianoche → píxeles desde el borde superior de la grilla. */
  const aPixeles = (minutos: number) =>
    ((minutos - desdeMinutos) / 60) * pxPorHora;

  const minutosAhora = ahoraHHmm != null ? aMinutos(ahoraHHmm) : null;

  return (
    <div className="overflow-hidden rounded-md border">
      {/*
        Cada columna de día tiene un ancho mínimo (ver ANCHO_MIN_DIA): en
        pantallas angostas el conjunto no entra, así que este contenedor
        scrollea horizontalmente en vez de aplastar los días hasta hacerlos
        ilegibles. El encabezado y el cuerpo comparten el mismo scroll
        horizontal por estar los dos adentro.
      */}
      <div className="overflow-x-auto">
        <div
          style={{
            minWidth: `calc(${ANCHO_HORAS} + ${dias.length} * ${ANCHO_MIN_DIA})`,
          }}
        >
          {/* Encabezado: qué día es cada columna. */}
          <div className="flex border-b bg-muted/40">
            <div className="shrink-0" style={{ width: ANCHO_HORAS }} />
            {dias.map((dia) => {
              const fecha = new Date(`${dia}T00:00:00Z`);
              const esHoy = dia === hoyISO;
              return (
                <div
                  key={dia}
                  className="flex-1 border-l py-1.5 text-center"
                  style={{ minWidth: ANCHO_MIN_DIA }}
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {DIAS_CORTOS[fecha.getUTCDay()]}
                  </p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums",
                      esHoy &&
                        "bg-primary font-semibold text-primary-foreground",
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
                    style={{ height: pxPorHora }}
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
                  agenda={agenda}
                  unificado={unificado}
                  colores={colores}
                  sedeDelDia={sedeDelDia}
                  desdeMinutos={desdeMinutos}
                  hastaMinutos={hastaMinutos}
                  altoTotal={altoTotal}
                  pxPorHora={pxPorHora}
                  aPixeles={aPixeles}
                  hoyISO={hoyISO}
                  ahoraHHmm={ahoraHHmm}
                  minutosAhora={minutosAhora}
                  onAgendar={onAgendar}
                  onReprogramar={onReprogramar}
                  onGrabar={onGrabar}
                  turnoAbiertoId={turnoAbiertoId}
                  onAbrirTurno={onAbrirTurno}
                />
              ))}
            </div>
          </div>
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
  agenda: AgendaVigente;
  unificado: boolean;
  colores: Map<string, string>;
  sedeDelDia: (fechaISO: string) => EstablecimientoSalidaDto | null;
  desdeMinutos: number;
  hastaMinutos: number;
  altoTotal: number;
  /** Escala de la grilla; la calcula `GrillaSemanal` según el rango visible. */
  pxPorHora: number;
  aPixeles: (minutos: number) => number;
  hoyISO: string;
  ahoraHHmm: string | null;
  minutosAhora: number | null;
  onAgendar: (
    fechaISO: string,
    hora: string,
    establecimientoId: string,
  ) => void;
  onReprogramar: (turno: TurnoSalidaDto) => void;
  onGrabar: (turno: TurnoSalidaDto) => void;
  turnoAbiertoId: string | null;
  onAbrirTurno: (turnoId: string | null) => void;
}

/** Un día de la grilla: sus franjas de fondo y sus turnos encima. */
function ColumnaDia({
  dia,
  bloques,
  turnosDelDia,
  nombrePaciente,
  agenda,
  unificado,
  colores,
  sedeDelDia,
  desdeMinutos,
  hastaMinutos,
  altoTotal,
  pxPorHora,
  aPixeles,
  hoyISO,
  ahoraHHmm,
  minutosAhora,
  onAgendar,
  onReprogramar,
  onGrabar,
  turnoAbiertoId,
  onAbrirTurno,
}: PropsColumnaDia) {
  const diaHabil = esDiaDeAtencion(agenda, dia);

  // De quién es este día. Con una sola sede a la vista es esa; con varias, solo
  // si los días no se pisan. Cuando hay dueño, las franjas se calculan con SU
  // agenda —su paso, su duración—, no con la unión: el hueco que se ofrece es
  // exactamente el que esa sede acepta.
  const duena = sedeDelDia(dia);
  const agendaDelDia = duena ?? agenda;
  const paso = agendaDelDia.turnoPasoMinutos;

  // Las franjas del día con su motivo, exactamente las que ofrece el
  // formulario: se dibujan como huecos clickeables y las demás no existen.
  // Salen de `franjasDelDia` en vez de rehacerse cada `paso` desde el borde de
  // la grilla porque el horario de atención no tiene por qué arrancar en hora
  // en punto: con apertura 08:15 y paso 30, una rejilla propia caería siempre
  // entre franjas y no habría un solo hueco para clickear.
  const franjas = useMemo(() => {
    // Sin dueño no se ofrecen huecos: un hueco es "acá se puede agendar", y sin
    // saber en cuál de las sedes la afirmación no significa nada. Se agenda
    // desde el botón, que sí pregunta dónde.
    if (!diaHabil || !duena) return [];
    return franjasDelDia({
      agenda: agendaDelDia,
      fechaISO: dia,
      duracionMinutos: agendaDelDia.turnoDuracionMinutos,
      ocupados: turnosDelDia,
      hoyISO,
      ahoraHHmm: ahoraHHmm ?? "00:00",
      // La última franja arranca EN la hora de cierre (nunca es agendable, pero
      // `franjasDelDia` la devuelve para poder explicar por qué): dibujarla
      // desbordaría la grilla por abajo.
    }).filter((f) => aMinutos(f.hora) < hastaMinutos);
  }, [
    agendaDelDia,
    duena,
    dia,
    diaHabil,
    turnosDelDia,
    hoyISO,
    ahoraHHmm,
    hastaMinutos,
  ]);

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
      style={{ height: altoTotal, minWidth: ANCHO_MIN_DIA }}
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
            onClick={() => onAgendar(dia, franja.hora, duena!.id)}
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
              height: (paso / 60) * pxPorHora,
            }}
          />
        );
      })}

      {bloques.map((bloque) => {
        const ancho = 100 / bloque.carriles;
        const alto = Math.max(
          16,
          ((bloque.finMinutos - bloque.inicioMinutos) / 60) * pxPorHora - 2,
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
                  // El relleno sigue diciendo el ESTADO; el filo izquierdo dice
                  // el LUGAR, y solo cuando hay más de uno a la vista. Si
                  // compitieran por el mismo color se perdería uno de los dos.
                  ...(unificado
                    ? {
                        borderLeftColor: colores.get(
                          bloque.turno.establecimientoId,
                        ),
                      }
                    : {}),
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
            <PopoverContent
              side="right"
              align="start"
              collisionPadding={12}
              className="w-[min(20rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-3"
            >
              <DetalleTurno
                turno={bloque.turno}
                nombrePaciente={nombre}
                onReprogramar={(turno) => {
                  onAbrirTurno(null);
                  onReprogramar(turno);
                }}
                onGrabar={(turno) => {
                  onAbrirTurno(null);
                  onGrabar(turno);
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
