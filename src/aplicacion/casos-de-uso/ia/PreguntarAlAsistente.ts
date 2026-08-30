import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import type {
  IAsistenteNutricional,
  HerramientaAsistente,
} from "@/dominio/servicios/IAsistenteNutricional";
import { ConsultaIA } from "@/dominio/entidades/ConsultaIA";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Resultado de una consulta al asistente. */
export interface RespuestaAsistente {
  pregunta: string;
  respuesta: string;
}

/** Esquema de una herramienta sin argumentos. */
const SIN_ARGUMENTOS = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

/**
 * Caso de uso: responder una pregunta del paciente al asistente. Arma el
 * contexto real (nombre, objetivos, restricciones alimentarias e indicaciones
 * del nutricionista) y le da al asistente HERRAMIENTAS para consultar los datos
 * del paciente (plan, recetas, objetivos) según lo que pregunte. Guarda la
 * consulta como historial. Las herramientas cierran sobre los repositorios: el
 * adaptador de IA nunca toca la persistencia.
 */
export class PreguntarAlAsistente {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly objetivos: IObjetivoRepositorio,
    private readonly planes: IPlanRepositorio,
    private readonly recetas: IRecetaRepositorio,
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly axiomas: IAxiomaRepositorio,
    private readonly asistente: IAsistenteNutricional,
    private readonly historial: IHistorialIARepositorio,
    private readonly perfilesDeportivos: IPerfilDeportivoRepositorio,
    private readonly competencias: ICompetenciaRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    pregunta: string,
  ): Promise<RespuestaAsistente> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [objetivos, planActivo, alertas, axiomas] = await Promise.all([
      this.objetivos.listarPorPaciente(pacienteId),
      this.planes.obtenerPlanActivoDePaciente(pacienteId),
      this.alertas.listarPorPaciente(pacienteId),
      this.axiomas.listarActivos(),
    ]);

    const respuesta = await this.asistente.responder(
      pregunta,
      {
        nombrePaciente: paciente.nombreCompleto,
        objetivos: objetivos
          .map((o) => o.aPrimitivos())
          .filter((o) => o.estado === "EN_CURSO")
          .map((o) => o.titulo),
        tienePlan: planActivo != null,
        restricciones: alertas.map((a) => {
          const p = a.aPrimitivos();
          return `${p.tipo}: ${p.descripcion} (severidad ${p.severidad})`;
        }),
        recomendacionesNutricionista: axiomas.map((a) => a.aPrimitivos().texto),
      },
      this.construirHerramientas(pacienteId),
    );

    await this.historial.guardarConsulta(
      ConsultaIA.crear(
        { pacienteId, pregunta, respuesta },
        crypto.randomUUID(),
      ),
    );

    return { pregunta, respuesta };
  }

  /** Herramientas que el asistente puede invocar para traer datos del paciente. */
  private construirHerramientas(pacienteId: string): HerramientaAsistente[] {
    return [
      {
        nombre: "obtener_plan_nutricional",
        descripcion:
          "Devuelve el plan nutricional activo del paciente: sus comidas por franja con las " +
          "opciones, y las metas de macros. Usalo cuando pregunte por su plan, sus comidas o qué comer.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const plan =
            await this.planes.obtenerPlanActivoDePaciente(pacienteId);
          if (!plan) return "El paciente no tiene un plan activo asignado.";
          const p = plan.aPrimitivos();
          return JSON.stringify({
            nombre: p.nombre,
            descripcion: p.descripcion,
            metas: {
              caloriasMeta: p.caloriasMeta,
              proteinasMetaG: p.proteinasMetaG,
              carbohidratosMetaG: p.carbohidratosMetaG,
              grasasMetaG: p.grasasMetaG,
            },
            comidas: p.comidas.map((c) => ({
              franja: c.nombre,
              opciones: c.opciones.map((o) => o.contenido),
            })),
            recomendaciones: p.recomendaciones.map((r) => r.texto),
          });
        },
      },
      {
        nombre: "obtener_recetas_asignadas",
        descripcion:
          "Devuelve las recetas asignadas al paciente, con ingredientes, preparación y macros por " +
          "porción. Usalo cuando pregunte cómo preparar algo o por sus recetas.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const recetas = await this.recetas.listarPorPaciente(pacienteId);
          if (recetas.length === 0)
            return "El paciente no tiene recetas asignadas.";
          return JSON.stringify(
            recetas.map((r) => {
              const p = r.aPrimitivos();
              return {
                nombre: p.nombre,
                porciones: p.porciones,
                macrosPorPorcion: {
                  calorias: p.calorias,
                  proteinasG: p.proteinasG,
                  carbohidratosG: p.carbohidratosG,
                  grasasG: p.grasasG,
                },
                ingredientes: p.ingredientes.map((i) =>
                  i.cantidadGramos != null
                    ? `${i.nombre} (${i.cantidadGramos} g)`
                    : i.nombre,
                ),
                preparacion: p.preparacion,
              };
            }),
          );
        },
      },
      {
        nombre: "obtener_objetivos",
        descripcion:
          "Devuelve los objetivos del paciente con su estado y prioridad. Usalo cuando pregunte " +
          "por sus metas o su progreso hacia ellas.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const objetivos = await this.objetivos.listarPorPaciente(pacienteId);
          if (objetivos.length === 0)
            return "El paciente no tiene objetivos cargados.";
          return JSON.stringify(
            objetivos.map((o) => {
              const p = o.aPrimitivos();
              return {
                titulo: p.titulo,
                estado: p.estado,
                prioridad: p.prioridad,
                descripcion: p.descripcion,
              };
            }),
          );
        },
      },
      {
        nombre: "obtener_contexto_deportivo",
        descripcion:
          "Devuelve el perfil deportivo del paciente (deporte, disciplina, nivel, fase de la " +
          "temporada, carga de entrenamiento, categoría de peso) y sus próximas competencias. " +
          "Usalo si es deportista o pregunta sobre entrenamiento, competencias o alimentación " +
          "según su deporte.",
        esquema: SIN_ARGUMENTOS,
        ejecutar: async () => {
          const [perfil, competencias] = await Promise.all([
            this.perfilesDeportivos.obtenerPorPaciente(pacienteId),
            this.competencias.listarPorPaciente(pacienteId),
          ]);
          if (!perfil && competencias.length === 0) {
            return "El paciente no tiene perfil deportivo cargado.";
          }
          const p = perfil?.aPrimitivos();
          return JSON.stringify({
            perfil: p
              ? {
                  deporte: p.deporte,
                  disciplina: p.disciplina,
                  nivel: p.nivel,
                  faseTemporada: p.fase,
                  diasEntrenamientoSemana: p.diasEntrenamientoSemana,
                  horasSemana: p.horasSemana,
                  pesoCategoriaKg: p.pesoCategoriaKg,
                  posicion: p.posicion,
                  objetivo: p.objetivo,
                }
              : null,
            competencias: competencias.map((c) => {
              const cp = c.aPrimitivos();
              return {
                nombre: cp.nombre,
                fecha: cp.fecha.toISOString().slice(0, 10),
                importancia: cp.importancia,
                objetivo: cp.objetivo,
              };
            }),
          });
        },
      },
    ];
  }
}
