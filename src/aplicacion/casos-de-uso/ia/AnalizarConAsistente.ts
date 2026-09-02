import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IConversacionIARepositorio } from "@/dominio/repositorios/IConversacionIARepositorio";
import { ConversacionIA } from "@/dominio/entidades/ConversacionIA";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";

/** Resultado de una consulta analítica del nutricionista. */
export interface RespuestaAnalisis {
  /** La conversación donde quedó registrada (nueva o la que se continuaba). */
  conversacionId: string;
  pregunta: string;
  respuesta: string;
}

/**
 * Turnos que se le mandan al modelo como contexto.
 *
 * Se recorta porque la conversación entera viaja en CADA pregunta y se paga
 * por token cada vez. Doce turnos son seis idas y vueltas, que es más de lo
 * que dura una consulta analítica típica.
 */
const TURNOS_DE_CONTEXTO = 12;

const SIN_ARGUMENTOS = {
  type: "object",
  properties: {},
  additionalProperties: false,
};
const CON_PACIENTE = {
  type: "object",
  properties: {
    pacienteId: { type: "string", description: "id del paciente" },
  },
  required: ["pacienteId"],
  additionalProperties: false,
};

/**
 * Caso de uso: responder una consulta analítica del nutricionista sobre su
 * consultorio. Le da al asistente HERRAMIENTAS que leen la base (pacientes,
 * planes, recetas, turnos) para fundamentar el análisis. Las herramientas
 * cierran sobre los repositorios (tenant-scoped): el adaptador de IA nunca toca
 * la persistencia. No persiste la conversación (es análisis ad-hoc).
 */
export class AnalizarConAsistente {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
    private readonly recetas: IRecetaRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly objetivos: IObjetivoRepositorio,
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly asistente: IAsistenteAnalitico,
    private readonly reloj: IRelojFecha,
    private readonly conversaciones: IConversacionIARepositorio,
  ) {}

  /**
   * Responde una pregunta dentro de una conversación.
   *
   * Sin `conversacionId` abre una nueva; con él continúa la existente y le
   * manda al modelo los turnos anteriores. La pregunta se guarda ANTES de
   * llamar al modelo y la respuesta después: si el modelo falla, lo que el
   * profesional escribió no se pierde.
   */
  async ejecutar(datos: {
    pregunta: string;
    conversacionId?: string | null;
  }): Promise<RespuestaAnalisis> {
    const pregunta = datos.pregunta?.trim() ?? "";
    if (pregunta.length === 0) {
      throw new ErrorValidacion("La consulta no puede estar vacía.");
    }
    const ahora = this.reloj.ahora();

    let conversacion = datos.conversacionId
      ? await this.conversaciones.obtenerPorId(datos.conversacionId)
      : null;
    if (!conversacion) {
      conversacion = ConversacionIA.iniciar(
        pregunta,
        crypto.randomUUID(),
        ahora,
      );
      await this.conversaciones.crear(conversacion);
    }

    const previos = conversacion.ultimosTurnos(TURNOS_DE_CONTEXTO);

    conversacion = conversacion.agregar(
      "USUARIO",
      pregunta,
      crypto.randomUUID(),
      ahora,
    );
    const mensajeUsuario = conversacion.mensajes.at(-1)!;
    await this.conversaciones.agregarMensaje(conversacion.id, mensajeUsuario);

    const respuesta = await this.asistente.responder(
      [
        ...previos.map((m) => ({
          rol:
            m.rol === "USUARIO" ? ("usuario" as const) : ("asistente" as const),
          texto: m.contenido,
        })),
        { rol: "usuario" as const, texto: pregunta },
      ],
      this.construirHerramientas(),
      this.reloj.ahora(),
    );

    await this.conversaciones.agregarMensaje(conversacion.id, {
      id: crypto.randomUUID(),
      rol: "ASISTENTE",
      contenido: respuesta,
      creadoEn: this.reloj.ahora(),
    });

    return { conversacionId: conversacion.id, pregunta, respuesta };
  }

  private construirHerramientas(): HerramientaAsistente[] {
    return [
      {
        nombre: "listar_pacientes",
        descripcion:
          "Lista los pacientes del consultorio (id, nombre, email, notas). Usalo para saber " +
          "qué pacientes hay y obtener sus id antes de pedir su detalle.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const pacientes = await this.pacientes.listar();
          return JSON.stringify(
            pacientes.slice(0, 300).map((p) => {
              const d = p.aPrimitivos();
              return {
                id: d.id,
                nombre: `${d.nombre} ${d.apellido}`,
                email: d.email,
                notas: d.notas,
              };
            }),
          );
        },
      },
      {
        nombre: "datos_de_paciente",
        descripcion:
          "Detalle de un paciente: su plan activo (comidas y metas), sus objetivos y sus " +
          "restricciones alimentarias. Requiere el id (obtenelo con listar_pacientes).",
        esquema: CON_PACIENTE,
        ejecutar: async (args) => {
          const pacienteId =
            typeof args.pacienteId === "string" ? args.pacienteId : "";
          const paciente = await this.pacientes.obtenerPorId(pacienteId);
          if (!paciente) return "No existe un paciente con ese id.";
          const [plan, objetivos, alertas] = await Promise.all([
            this.asignaciones.obtenerPlanActivoDePaciente(pacienteId),
            this.objetivos.listarPorPaciente(pacienteId),
            this.alertas.listarPorPaciente(pacienteId),
          ]);
          return JSON.stringify({
            paciente: paciente.nombreCompleto,
            planActivo: plan ? detallePlan(plan.aPrimitivos()) : null,
            objetivos: objetivos.map((o) => {
              const d = o.aPrimitivos();
              return {
                titulo: d.titulo,
                estado: d.estado,
                prioridad: d.prioridad,
              };
            }),
            restricciones: alertas.map((a) => {
              const d = a.aPrimitivos();
              return `${d.tipo}: ${d.descripcion} (severidad ${d.severidad})`;
            }),
          });
        },
      },
      {
        nombre: "listar_planes",
        descripcion:
          "Lista los planes y plantillas del consultorio con sus metas de macros. Usalo para " +
          "analizar o comparar planes.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const planes = await this.planes.listar();
          return JSON.stringify(
            planes.slice(0, 200).map((p) => {
              const d = p.aPrimitivos();
              return {
                id: d.id,
                nombre: d.nombre,
                esPlantilla: d.esPlantilla,
                modalidad: d.modalidad,
                caloriasMeta: d.caloriasMeta,
                proteinasMetaG: d.proteinasMetaG,
                carbohidratosMetaG: d.carbohidratosMetaG,
                grasasMetaG: d.grasasMetaG,
                // El detalle de las comidas se pide con `detalle_de_plan`:
                // mandar todas las franjas de 200 planes desborda el contexto.
                cantidadComidas: d.comidas.length,
              };
            }),
          );
        },
      },
      {
        nombre: "detalle_de_plan",
        descripcion:
          "Devuelve UN plan o plantilla completo: sus franjas horarias con TODAS las opciones de " +
          "comida, las metas de macros y las recomendaciones. Usalo siempre que pregunten qué " +
          "come alguien, qué tiene un plan o para comparar el contenido de dos planes. " +
          "Requiere el id (obtenelo con listar_planes).",
        esquema: {
          type: "object",
          properties: {
            planId: { type: "string", description: "id del plan o plantilla" },
          },
          required: ["planId"],
          additionalProperties: false,
        },
        ejecutar: async (args) => {
          const planId = typeof args.planId === "string" ? args.planId : "";
          const plan = await this.planes.obtenerPorId(planId);
          if (!plan) return "No existe un plan con ese id.";
          return JSON.stringify(detallePlan(plan.aPrimitivos()));
        },
      },
      {
        nombre: "listar_recetas",
        descripcion:
          "Lista las recetas del recetario con sus macros por porción y etiquetas. Usalo para " +
          "sugerir o analizar recetas.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const recetas = await this.recetas.listar();
          return JSON.stringify(
            recetas.slice(0, 200).map((r) => {
              const d = r.aPrimitivos();
              return {
                nombre: d.nombre,
                calorias: d.calorias,
                proteinasG: d.proteinasG,
                etiquetas: d.etiquetas,
              };
            }),
          );
        },
      },
      {
        nombre: "proximos_turnos",
        descripcion:
          "Turnos pendientes o confirmados de hoy en adelante, ordenados por fecha, con el " +
          "nombre del paciente. Usalo para preguntas sobre la agenda.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const [pendientes, confirmados, pacientes] = await Promise.all([
            this.turnos.listar({ estado: "PENDIENTE" }),
            this.turnos.listar({ estado: "CONFIRMADO" }),
            this.pacientes.listar(),
          ]);
          const nombrePorId = new Map(
            pacientes.map((p) => [p.aPrimitivos().id, p.nombreCompleto]),
          );
          // `Turno.fecha` es un DATE que llega como MEDIANOCHE UTC. Comparar
          // contra la medianoche LOCAL dejaba afuera los turnos de hoy: en
          // Argentina (UTC-3) la medianoche local de hoy son las 03:00 UTC, y
          // el turno de hoy (00:00 UTC) quedaba "antes de hoy". Por eso el
          // asistente decía que no había turnos hoy cuando sí los había.
          const inicioHoy = this.reloj.hoy();

          const proximos = [...pendientes, ...confirmados]
            .map((t) => t.aPrimitivos())
            .filter((t) => t.fecha.getTime() >= inicioHoy.getTime())
            .sort(
              (a, b) =>
                a.fecha.getTime() - b.fecha.getTime() ||
                a.hora.localeCompare(b.hora),
            )
            .slice(0, 25)
            .map((t) => ({
              fecha: t.fecha.toISOString().slice(0, 10),
              hora: t.hora,
              estado: t.estado,
              paciente: nombrePorId.get(t.pacienteId) ?? "—",
            }));
          return JSON.stringify(proximos);
        },
      },
    ];
  }
}

/** Plan con sus franjas y opciones, que es lo que se pregunta de un plan. */
function detallePlan(d: {
  nombre: string;
  descripcion: string | null;
  caloriasMeta: number | null;
  proteinasMetaG: number | null;
  carbohidratosMetaG: number | null;
  grasasMetaG: number | null;
  comidas: {
    nombre: string;
    horaDesde: string | null;
    horaHasta: string | null;
    opciones: { contenido: string }[];
  }[];
  recomendaciones: { texto: string }[];
}) {
  return {
    nombre: d.nombre,
    descripcion: d.descripcion,
    metas: {
      caloriasMeta: d.caloriasMeta,
      proteinasMetaG: d.proteinasMetaG,
      carbohidratosMetaG: d.carbohidratosMetaG,
      grasasMetaG: d.grasasMetaG,
    },
    // Las OPCIONES de cada franja son el contenido real del plan. Antes acá
    // iba solo `c.nombre` —"Desayuno", "Almuerzo"—, así que el asistente no
    // podía decir qué come el paciente por más que se lo preguntaran.
    comidas: d.comidas.map((c) => ({
      franja: c.nombre,
      desde: c.horaDesde,
      hasta: c.horaHasta,
      opciones: c.opciones.map((o) => o.contenido),
    })),
    recomendaciones: d.recomendaciones.map((r) => r.texto),
  };
}
