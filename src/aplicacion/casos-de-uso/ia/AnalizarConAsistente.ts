import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";

/** Resultado de una consulta analítica del nutricionista. */
export interface RespuestaAnalisis {
  pregunta: string;
  respuesta: string;
}

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
    private readonly recetas: IRecetaRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly objetivos: IObjetivoRepositorio,
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly asistente: IAsistenteAnalitico,
  ) {}

  async ejecutar(pregunta: string): Promise<RespuestaAnalisis> {
    const respuesta = await this.asistente.responder(
      pregunta,
      this.construirHerramientas(),
    );
    return { pregunta, respuesta };
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
            this.planes.obtenerPlanActivoDePaciente(pacienteId),
            this.objetivos.listarPorPaciente(pacienteId),
            this.alertas.listarPorPaciente(pacienteId),
          ]);
          return JSON.stringify({
            paciente: paciente.nombreCompleto,
            planActivo: plan
              ? {
                  nombre: plan.aPrimitivos().nombre,
                  caloriasMeta: plan.aPrimitivos().caloriasMeta,
                  comidas: plan.aPrimitivos().comidas.map((c) => c.nombre),
                }
              : null,
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
                caloriasMeta: d.caloriasMeta,
                proteinasMetaG: d.proteinasMetaG,
              };
            }),
          );
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
          const inicioHoy = new Date();
          inicioHoy.setHours(0, 0, 0, 0);

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
