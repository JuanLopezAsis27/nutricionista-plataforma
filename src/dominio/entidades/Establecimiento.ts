import { ErrorValidacion } from "../errores/ErrorValidacion";

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const PATRON_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Campos editables de un establecimiento. */
export interface DatosEstablecimiento {
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  /** Color del globo en el calendario, hexadecimal (ej. "#F4535E"). */
  color: string | null;
  orden: number;
  // Agenda del LUGAR. Misma semántica que tenían estos campos en
  // ConfiguracionConsultorio (ver docs/AGENDA.md): la lista de días vacía y el
  // horario nulo significan "sin restricción", no "cerrado".
  turnoDuracionMinutos: number;
  turnoPasoMinutos: number;
  atencionHoraDesde: string | null;
  atencionHoraHasta: string | null;
  /** Días de atención: 0=domingo … 6=sábado. */
  diasAtencion: number[];
}

/** Estado completo persistido. */
export interface PropiedadesEstablecimiento extends DatosEstablecimiento {
  id: string;
  esPrincipal: boolean;
  archivadoEn: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Establecimiento: un lugar donde el profesional atiende.
 *
 * Lo que pertenece a un establecimiento es el TURNO, no el paciente. La misma
 * persona se atiende en los dos consultorios, y hacerla "de" uno solo obligaría
 * a elegir por ella. El paciente guarda a lo sumo una preferencia
 * (`establecimientoHabitualId`), que solo precarga formularios.
 *
 * Lo que NO cambia por tener varias sedes: el no solapamiento de turnos. El
 * profesional no puede estar en dos lugares a las 10:00, así que esa regla
 * sigue siendo por nutricionista y nada más (ver `Turno.seSolapaCon` y el
 * EXCLUDE `turnos_sin_solapamiento` de la migración 27).
 *
 * Invariantes: nombre no vacío; duración/paso 5–480 min; horas HH:mm y no
 * invertidas; días entre 0 y 6; color hexadecimal.
 */
export class Establecimiento {
  private constructor(private readonly props: PropiedadesEstablecimiento) {}

  static crear(
    datos: Partial<DatosEstablecimiento> & { nombre: string },
    id: string = crypto.randomUUID(),
    ahora: Date = new Date(),
  ): Establecimiento {
    const completos = conDefaults(datos);
    validar(completos);
    return new Establecimiento({
      ...completos,
      nombre: completos.nombre.trim(),
      id,
      esPrincipal: false,
      archivadoEn: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesEstablecimiento): Establecimiento {
    return new Establecimiento(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosEstablecimiento>,
    ahora: Date = new Date(),
  ): Establecimiento {
    const fusionar = <T>(nuevo: T | undefined, actual: T): T =>
      nuevo !== undefined ? nuevo : actual;

    const datos: DatosEstablecimiento = {
      nombre: cambios.nombre ?? this.props.nombre,
      direccion: fusionar(cambios.direccion, this.props.direccion),
      telefono: fusionar(cambios.telefono, this.props.telefono),
      color: fusionar(cambios.color, this.props.color),
      orden: cambios.orden ?? this.props.orden,
      turnoDuracionMinutos:
        cambios.turnoDuracionMinutos ?? this.props.turnoDuracionMinutos,
      turnoPasoMinutos: cambios.turnoPasoMinutos ?? this.props.turnoPasoMinutos,
      atencionHoraDesde: fusionar(
        cambios.atencionHoraDesde,
        this.props.atencionHoraDesde,
      ),
      atencionHoraHasta: fusionar(
        cambios.atencionHoraHasta,
        this.props.atencionHoraHasta,
      ),
      diasAtencion: cambios.diasAtencion ?? this.props.diasAtencion,
    };
    validar(datos);
    return new Establecimiento({
      ...this.props,
      ...datos,
      nombre: datos.nombre.trim(),
      actualizadoEn: ahora,
    });
  }

  /**
   * Baja lógica. No se borra: los turnos de los últimos años ocurrieron acá y
   * la FK desde `turnos` es RESTRICT. Quién puede archivarse (no el último
   * vigente) lo decide el caso de uso, que es el único que ve al resto de los
   * establecimientos.
   */
  archivar(ahora: Date = new Date()): Establecimiento {
    if (this.props.archivadoEn) return this;
    return new Establecimiento({
      ...this.props,
      archivadoEn: ahora,
      // Deja de ser el principal al archivarse: el fallback no puede apuntar a
      // un lugar que ya no se ofrece.
      esPrincipal: false,
      actualizadoEn: ahora,
    });
  }

  restaurar(ahora: Date = new Date()): Establecimiento {
    if (!this.props.archivadoEn) return this;
    return new Establecimiento({
      ...this.props,
      archivadoEn: null,
      actualizadoEn: ahora,
    });
  }

  /**
   * Marca/desmarca la sede principal, que es la que resuelve el fallback
   * cuando todavía nadie eligió dónde está trabajando.
   */
  marcarPrincipal(
    esPrincipal: boolean,
    ahora: Date = new Date(),
  ): Establecimiento {
    if (esPrincipal && this.props.archivadoEn) {
      throw new ErrorValidacion(
        "Un establecimiento archivado no puede ser el principal.",
      );
    }
    return new Establecimiento({
      ...this.props,
      esPrincipal,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get direccion(): string | null {
    return this.props.direccion;
  }
  get telefono(): string | null {
    return this.props.telefono;
  }
  get color(): string | null {
    return this.props.color;
  }
  get orden(): number {
    return this.props.orden;
  }
  get esPrincipal(): boolean {
    return this.props.esPrincipal;
  }
  get archivadoEn(): Date | null {
    return this.props.archivadoEn;
  }
  get estaArchivado(): boolean {
    return this.props.archivadoEn !== null;
  }
  get turnoDuracionMinutos(): number {
    return this.props.turnoDuracionMinutos;
  }
  get turnoPasoMinutos(): number {
    return this.props.turnoPasoMinutos;
  }
  get atencionHoraDesde(): string | null {
    return this.props.atencionHoraDesde;
  }
  get atencionHoraHasta(): string | null {
    return this.props.atencionHoraHasta;
  }
  /** Días de atención declarados (0=domingo … 6=sábado). */
  get diasAtencion(): ReadonlyArray<number> {
    return this.props.diasAtencion;
  }

  /**
   * ¿Se atiende en esta sede ese día?
   *
   * Idéntico a `ConfiguracionConsultorio.atiendeEl`, incluido el `getUTCDay()`:
   * `Turno.fecha` es un DATE de Postgres y llega como medianoche UTC, así que
   * con `getDay()` un lunes se leería como domingo en cualquier zona al oeste
   * de Greenwich (la nuestra).
   *
   * La lista vacía significa "sin restricción": una sede recién creada tiene
   * que poder recibir turnos, y vaciar el campo no puede ser la forma de
   * bloquearla.
   *
   * Convive con la copia de `ConfiguracionConsultorio` hasta que
   * `agendaConsultorio.ts` pase a leer el establecimiento del turno: ahí se
   * borra aquella y esta queda como única.
   */
  atiendeEl(fecha: Date): boolean {
    if (this.props.diasAtencion.length === 0) return true;
    return this.props.diasAtencion.includes(fecha.getUTCDay());
  }

  /**
   * ¿El turno entra COMPLETO en el horario de la sede? Se mira el fin y no
   * solo el inicio: una consulta de 30 minutos que arranca a la hora de cierre
   * es media hora después de cerrar. Sin horario configurado no restringe.
   */
  admiteHorario(hora: string, duracionMinutos: number): boolean {
    const inicio = aMinutos(hora);
    if (inicio === null) return false;
    const fin = inicio + duracionMinutos;
    const desde = aMinutos(this.props.atencionHoraDesde);
    const hasta = aMinutos(this.props.atencionHoraHasta);
    if (desde !== null && inicio < desde) return false;
    if (hasta !== null && fin > hasta) return false;
    return true;
  }

  aPrimitivos(): PropiedadesEstablecimiento {
    return { ...this.props, diasAtencion: [...this.props.diasAtencion] };
  }
}

/**
 * Defaults de una sede nueva.
 *
 * `diasAtencion: []` y horario nulo = sin restricción, que es lo correcto para
 * un lugar recién dado de alta: primero existe, después se le configura la
 * agenda. Duración y paso repiten los de `ConfiguracionConsultorio.porDefecto`.
 */
function conDefaults(
  datos: Partial<DatosEstablecimiento> & { nombre: string },
): DatosEstablecimiento {
  return {
    nombre: datos.nombre,
    direccion: datos.direccion ?? null,
    telefono: datos.telefono ?? null,
    color: datos.color ?? null,
    orden: datos.orden ?? 0,
    turnoDuracionMinutos: datos.turnoDuracionMinutos ?? 30,
    turnoPasoMinutos: datos.turnoPasoMinutos ?? 15,
    atencionHoraDesde: datos.atencionHoraDesde ?? null,
    atencionHoraHasta: datos.atencionHoraHasta ?? null,
    diasAtencion: datos.diasAtencion ?? [],
  };
}

function validar(d: DatosEstablecimiento): void {
  if (!d.nombre.trim()) {
    throw new ErrorValidacion("El establecimiento necesita un nombre.");
  }
  if (d.nombre.trim().length > 120) {
    throw new ErrorValidacion(
      "El nombre del establecimiento no puede superar los 120 caracteres.",
    );
  }
  const rangoMinutos = (v: number): boolean =>
    Number.isInteger(v) && v >= 5 && v <= 480;
  if (!rangoMinutos(d.turnoDuracionMinutos)) {
    throw new ErrorValidacion(
      "La duración de turno debe estar entre 5 y 480 minutos.",
    );
  }
  if (!rangoMinutos(d.turnoPasoMinutos)) {
    throw new ErrorValidacion(
      "El paso de la agenda debe estar entre 5 y 480 minutos.",
    );
  }
  if (d.atencionHoraDesde != null && !PATRON_HORA.test(d.atencionHoraDesde)) {
    throw new ErrorValidacion(
      "La hora de atención (desde) debe tener formato HH:mm.",
    );
  }
  if (d.atencionHoraHasta != null && !PATRON_HORA.test(d.atencionHoraHasta)) {
    throw new ErrorValidacion(
      "La hora de atención (hasta) debe tener formato HH:mm.",
    );
  }
  if (
    d.atencionHoraDesde &&
    d.atencionHoraHasta &&
    d.atencionHoraHasta <= d.atencionHoraDesde
  ) {
    throw new ErrorValidacion("El horario de atención está invertido.");
  }
  if (d.diasAtencion.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) {
    throw new ErrorValidacion(
      "Los días de atención deben ser números entre 0 y 6.",
    );
  }
  if (d.color != null && !PATRON_COLOR.test(d.color)) {
    throw new ErrorValidacion(
      "El color del establecimiento debe ser un hexadecimal, ej. #F4535E.",
    );
  }
}

/** "HH:mm" → minutos desde medianoche; null si no hay hora o no es válida. */
function aMinutos(hora: string | null): number | null {
  if (!hora || !PATRON_HORA.test(hora)) return null;
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
