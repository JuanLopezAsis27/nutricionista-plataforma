import type { IRecordatorioWhatsappRepositorio } from "../../repositorios/IRecordatorioWhatsappRepositorio";
import type { IProveedorWhatsapp } from "../../servicios/IProveedorWhatsapp";
import type { Turno } from "../../entidades/Turno";
import type { Paciente } from "../../entidades/Paciente";
import type { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import type { PlantillaWhatsapp } from "../../entidades/PlantillaWhatsapp";
import type { OrigenRecordatorio } from "../../entidades/RecordatorioWhatsapp";
import { RecordatorioWhatsapp } from "../../entidades/RecordatorioWhatsapp";
import { armarRecordatorio } from "./armadoRecordatorio";

/** Un envío concreto, con todo ya resuelto por quien orquesta el lote. */
export interface PedidoRecordatorio {
  turno: Turno;
  paciente: Paciente;
  plantilla: PlantillaWhatsapp;
  configuracion: ConfiguracionConsultorio;
  /** Escalón de la programación, o null si es un envío manual. */
  diasAntes: number | null;
  origen: OrigenRecordatorio;
  usuarioId: string | null;
  /**
   * Recordatorios que ese turno ya tiene. Los trae quien arma el lote en UNA
   * consulta para todos los turnos: preguntarlo acá adentro convertiría un
   * envío de 40 pacientes en 40 consultas de más.
   */
  existentes: RecordatorioWhatsapp[];
  /** Insiste aunque el último aviso sea reciente (dentro del margen). */
  forzar: boolean;
  /** Momento de la corrida, para medir el margen sin depender del reloj real. */
  ahora: Date;
  /**
   * Horas que tienen que pasar desde el último aviso que SALIÓ para poder
   * volver a mandarle a ese turno. Sale de la configuración del consultorio.
   */
  horasEntreAvisos: number;
  /**
   * Texto retocado a mano en el diálogo de un turno suelto. Cuando viene,
   * reemplaza al de la plantilla Y sale como texto libre, no como plantilla de
   * Meta: un cuerpo editado ya no coincide con el que Meta aprobó, y mandarlo
   * bajo ese nombre haría que el paciente leyera el texto aprobado en lugar
   * del que el profesional acaba de escribir.
   */
  textoManual?: string | null;
}

/** Qué pasó con un envío. */
export type ResultadoRecordatorio =
  | { estado: "ENVIADO"; recordatorio: RecordatorioWhatsapp }
  | { estado: "PREPARADO"; recordatorio: RecordatorioWhatsapp; enlace: string }
  | { estado: "OMITIDO"; motivo: string }
  | { estado: "FALLIDO"; motivo: string };

const HORA_MS = 60 * 60 * 1000;

/** Estados de turno a los que tiene sentido recordarles algo. */
const ESTADOS_RECORDABLES = new Set(["PENDIENTE", "CONFIRMADO"]);

/**
 * El envío de UN recordatorio por WhatsApp: la pieza que comparten el envío
 * masivo manual y el barrido automático.
 *
 * Existe como pieza separada porque los dos caminos tienen que tomar las
 * mismas decisiones —qué turnos son recordables, cuándo un aviso ya salió,
 * cómo se reintenta uno fallido— y duplicarlas garantizaba que se separaran a
 * la primera corrección.
 *
 * Sobre el antiduplicado, que es el punto delicado: la garantía dura la da el
 * índice único (turno, diasAntes) del motor, no esta clase. Lo que hace acá es
 * evitar el intento y, sobre todo, distinguir dos situaciones que a simple
 * vista son la misma fila:
 *
 *   * un aviso que YA SALIÓ para ese escalón → se omite;
 *   * uno que quedó FALLIDO o DESCARTADO → se reintenta REUSANDO esa fila,
 *     porque el índice único no deja insertar otra.
 *
 * Los envíos manuales llevan `diasAntes` en null, y en Postgres los NULL no
 * colisionan entre sí: el profesional puede insistir a mano las veces que
 * quiera. Lo que se corta es el duplicado por error, no la insistencia
 * deliberada — por eso `forzar` existe y por eso no está prendido por defecto.
 */
export class EnviarRecordatorioWhatsapp {
  constructor(
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(pedido: PedidoRecordatorio): Promise<ResultadoRecordatorio> {
    if (!ESTADOS_RECORDABLES.has(pedido.turno.estado)) {
      return {
        estado: "OMITIDO",
        motivo: "El turno está cancelado o ya se completó.",
      };
    }
    if (!pedido.paciente.telefono) {
      return {
        estado: "OMITIDO",
        motivo: "El paciente no tiene teléfono cargado.",
      };
    }

    const previo = this.recordatorioPrevio(pedido);
    // Lo único que bloquea es un aviso que efectivamente SALIÓ. Un borrador sin
    // confirmar, uno descartado o un rechazo del proveedor no le llegaron a
    // nadie: no son "ya se le avisó", son el mismo aviso todavía sin resolver.
    //
    // Y bloquea POR UN RATO, no para siempre: pasado el margen configurado, se
    // puede volver a avisar sin apagar la protección de todo el lote. Un turno
    // agendado con tres semanas y reprogramado dos veces necesita más de un
    // aviso, y antes la única salida era tildar "reenviar a todos".
    if (previo?.salio && !pedido.forzar) {
      const desde = previo.salioEn;
      const horas =
        (pedido.ahora.getTime() - (desde?.getTime() ?? 0)) / HORA_MS;
      if (horas < pedido.horasEntreAvisos) {
        return {
          estado: "OMITIDO",
          motivo: `Ya se le avisó hace ${Math.max(1, Math.round(horas))} h. Se puede volver a avisar a las ${pedido.horasEntreAvisos} h.`,
        };
      }
    }

    const plantillaArmada = armarRecordatorio(
      pedido.turno,
      pedido.paciente,
      pedido.configuracion,
      pedido.plantilla,
    );
    const texto = pedido.textoManual?.trim() || plantillaArmada.mensaje;
    const armado = {
      ...plantillaArmada,
      mensaje: texto,
      // Texto editado a mano ya no es la plantilla que Meta aprobó.
      envioPlantilla: pedido.textoManual
        ? null
        : plantillaArmada.envioPlantilla,
    };

    let resultado;
    try {
      // Un recordatorio casi siempre cae fuera de la ventana de 24 h, donde
      // Meta solo acepta plantillas aprobadas. Si la plantilla no tiene clave
      // de Meta se manda como texto: con la API eso funciona solo dentro de la
      // ventana, y con el enlace wa.me funciona siempre.
      resultado = armado.envioPlantilla
        ? await this.proveedor.enviarPlantilla(armado.envioPlantilla)
        : await this.proveedor.preparar({
            telefono: armado.telefono,
            texto: armado.mensaje,
          });
    } catch (error) {
      const motivo =
        error instanceof Error ? error.message : "WhatsApp rechazó el envío.";
      await this.registrarFallo(
        pedido,
        armado.mensaje,
        armado.telefono,
        this.filaAReusar(pedido, previo),
        motivo,
      );
      return { estado: "FALLIDO", motivo };
    }

    const salioSolo = resultado.modo === "API";
    const aReusar = this.filaAReusar(pedido, previo);
    const recordatorio = aReusar
      ? await this.recordatorios.actualizar(
          aReusar.reintentar({
            mensaje: armado.mensaje,
            telefono: armado.telefono,
            idExterno: resultado.idExterno,
            enviado: salioSolo,
          }),
        )
      : await this.recordatorios.registrar(
          RecordatorioWhatsapp.crear(
            {
              turnoId: pedido.turno.id,
              pacienteId: pedido.paciente.id,
              telefono: armado.telefono,
              mensaje: armado.mensaje,
              usuarioId: pedido.usuarioId,
              idExterno: resultado.idExterno,
              origen: pedido.origen,
              diasAntes: pedido.diasAntes,
              plantillaId: pedido.plantilla.id,
              // Con la API el mensaje ya salió; con el enlace queda PREPARADO
              // hasta que el profesional abra el chat y lo confirme.
              estado: salioSolo ? "ENVIADO" : "PREPARADO",
            },
            crypto.randomUUID(),
          ),
        );

    return salioSolo
      ? { estado: "ENVIADO", recordatorio }
      : { estado: "PREPARADO", recordatorio, enlace: resultado.enlace ?? "" };
  }

  /**
   * La fila que hay que ACTUALIZAR en vez de insertar una nueva.
   *
   * La regla de fondo es una sola: **el log registra avisos que SALIERON, no
   * intentos**. Un aviso que no llegó a ningún lado —el borrador sin confirmar,
   * el que el profesional descartó, el que el proveedor rechazó— no es una
   * línea de historia: es el mismo aviso pendiente, y el intento siguiente lo
   * pisa.
   *
   * Sin esa regla cada clic dejaba una fila más. El caso que se escapó la
   * primera vez fue el del DESCARTADO: preparar → descartar → preparar →
   * descartar apilaba avisos sin techo, porque solo se reusaba el PREPARADO.
   *
   * Para los escalones programados se reusa SIEMPRE, incluso una fila ya
   * enviada, y no por prolijidad: el índice único (turno, diasAntes) no deja
   * meter una segunda fila para el mismo escalón, así que no hay otro lugar
   * donde escribir.
   *
   * Un reenvío manual sobre un aviso QUE SÍ SALIÓ crea fila nueva: ahí la
   * insistencia es real, y pisar la anterior convertiría "le mandé el lunes y
   * volví a insistir el jueves" en "le mandé el jueves".
   */
  private filaAReusar(
    pedido: PedidoRecordatorio,
    previo: RecordatorioWhatsapp | null,
  ): RecordatorioWhatsapp | null {
    if (previo == null) return null;
    if (pedido.diasAntes != null) return previo;
    return previo.salio ? null : previo;
  }

  /**
   * La fila sobre la que hay que decidir. Para un escalón programado es la de
   * ese escalón; para un envío manual, el ÚLTIMO aviso manual de ese turno,
   * esté como esté.
   *
   * Mirar todos y no solo los que salieron es justamente lo que arregla el
   * apilado: si acá se filtraran los descartados, el envío siguiente no
   * encontraría nada que reusar e insertaría una fila nueva cada vez.
   */
  private recordatorioPrevio(
    pedido: PedidoRecordatorio,
  ): RecordatorioWhatsapp | null {
    if (pedido.diasAntes != null) {
      return (
        pedido.existentes.find((r) => r.diasAntes === pedido.diasAntes) ?? null
      );
    }
    // Solo los manuales (`diasAntes` null): un envío a mano no puede pisar el
    // aviso automático que tiene que salir mañana.
    const manuales = pedido.existentes.filter((r) => r.diasAntes == null);
    if (manuales.length === 0) return null;
    return manuales.reduce((a, b) => (a.creadoEn >= b.creadoEn ? a : b));
  }

  /**
   * Deja registro del rechazo. Interesa por dos motivos: el profesional tiene
   * que poder ver a quién NO le llegó, y la fila es la que el reintento va a
   * reusar cuando el escalón esté tomado por el índice único.
   */
  private async registrarFallo(
    pedido: PedidoRecordatorio,
    mensaje: string,
    telefono: string,
    previo: RecordatorioWhatsapp | null,
    motivo: string,
  ): Promise<void> {
    if (previo) {
      await this.recordatorios.actualizar(previo.registrarFallo(motivo));
      return;
    }
    await this.recordatorios.registrar(
      RecordatorioWhatsapp.crear(
        {
          turnoId: pedido.turno.id,
          pacienteId: pedido.paciente.id,
          telefono,
          mensaje,
          usuarioId: pedido.usuarioId,
          origen: pedido.origen,
          diasAntes: pedido.diasAntes,
          plantillaId: pedido.plantilla.id,
        },
        crypto.randomUUID(),
      ).registrarFallo(motivo),
    );
  }
}
