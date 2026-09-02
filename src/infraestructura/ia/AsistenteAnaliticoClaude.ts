import type {
  IAsistenteAnalitico,
  TurnoAsistente,
} from "@/dominio/servicios/IAsistenteAnalitico";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";

const BASE = [
  "Sos el asistente analítico de un nutricionista, dentro de la app de su consultorio.",
  "Ayudás a analizar los datos de su práctica: pacientes, planes, recetas y turnos.",
  "",
  "Tenés herramientas para leer los datos reales. USALAS antes de responder (no inventes",
  "datos ni pacientes). Flujo típico: primero `listar_pacientes` para ubicar id, después",
  "`datos_de_paciente` para el detalle. Para la agenda, `proximos_turnos`. Para el contenido",
  "de un plan (sus comidas y opciones), `detalle_de_plan` con el id que da `listar_planes`.",
  "",
  "Reglas:",
  "- Respondé en español rioplatense, preciso y conciso; usá listas/tablas cuando ayude.",
  "- Son DATOS DE SALUD, sensibles: analizalos solo para el profesional, no los expongas fuera.",
  "- Toda proyección o estimación aclarala como tal; no des diagnósticos médicos.",
  "- Si te falta un dato, decilo o pedí precisión, en vez de suponer.",
  "- Estás en una conversación: los mensajes anteriores son contexto y podés referirte a ellos.",
];

/**
 * System prompt con la fecha de hoy adentro.
 *
 * Un modelo NO sabe qué día es. Sin esto no podía responder «¿qué turnos tengo
 * hoy?» por más que la herramienta le devolviera los turnos con su fecha: no
 * tenía contra qué compararlas, y contestaba que no había ninguno.
 */
function construirSystem(ahora: Date): string {
  const fecha = ahora.toISOString().slice(0, 10);
  const diaSemana = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(ahora);
  return [
    ...BASE,
    "",
    `Hoy es ${diaSemana} ${fecha} (formato ISO YYYY-MM-DD). Las fechas que devuelven las`,
    "herramientas vienen en ese mismo formato: compará contra esta para saber qué es hoy,",
    "mañana o esta semana.",
  ].join("\n");
}

/**
 * Adaptador del asistente analítico del nutricionista (Claude/OpenRouter, según
 * la config del profesional). Resuelve el proveedor por request y corre el loop
 * de herramientas.
 *
 * Degrada al stub SOLO si no hay IA configurada. Si la hay y la llamada falla,
 * el error se propaga: antes cualquier excepción se tragaba y se devolvía el
 * texto de demostración, así que un 401 o un timeout llegaban a la pantalla
 * disfrazados de respuesta y el profesional no tenía cómo saber que la IA no
 * había contestado nada.
 */
export class AsistenteAnaliticoClaude implements IAsistenteAnalitico {
  constructor(
    private readonly resolver: IResolvedorConfigIA,
    private readonly respaldo: IAsistenteAnalitico,
  ) {}

  async responder(
    mensajes: TurnoAsistente[],
    herramientas: HerramientaAsistente[],
    ahora: Date,
  ): Promise<string> {
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return this.respaldo.responder(mensajes, herramientas, ahora);

    const porNombre = new Map(herramientas.map((h) => [h.nombre, h]));
    const texto = await llm.conversar({
      system: construirSystem(ahora),
      mensajes: mensajes.map((m) => ({ rol: m.rol, texto: m.texto.trim() })),
      maxTokens: 4096,
      // Analizar de verdad requiere encadenar herramientas (ubicar al paciente,
      // traer su plan, mirar la agenda); con esfuerzo bajo el modelo contesta
      // con la primera que llama.
      esfuerzo: "medio",
      herramientas: herramientas.map((h) => ({
        nombre: h.nombre,
        descripcion: h.descripcion,
        esquema: h.esquema,
      })),
      ejecutar: async (nombre, args) => {
        const herramienta = porNombre.get(nombre);
        if (!herramienta) return `No existe la herramienta "${nombre}".`;
        return herramienta.ejecutar(args);
      },
      maxIteraciones: 8,
    });

    if (!texto) {
      throw new Error(
        "La IA no devolvió ninguna respuesta. Probá de nuevo o revisá la configuración en Integraciones.",
      );
    }
    return texto;
  }
}
