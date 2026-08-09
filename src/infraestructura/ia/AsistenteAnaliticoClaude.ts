import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";

const SYSTEM = [
  "Sos el asistente analítico de un nutricionista, dentro de la app de su consultorio.",
  "Ayudás a analizar los datos de su práctica: pacientes, planes, recetas y turnos.",
  "",
  "Tenés herramientas para leer los datos reales. USALAS antes de responder (no inventes",
  "datos ni pacientes). Flujo típico: primero `listar_pacientes` para ubicar id, después",
  "`datos_de_paciente` para el detalle. Para la agenda, `proximos_turnos`.",
  "",
  "Reglas:",
  "- Respondé en español rioplatense, preciso y conciso; usá listas/tablas cuando ayude.",
  "- Son DATOS DE SALUD, sensibles: analizalos solo para el profesional, no los expongas fuera.",
  "- Toda proyección o estimación aclarala como tal; no des diagnósticos médicos.",
  "- Si te falta un dato, decilo o pedí precisión, en vez de suponer.",
].join("\n");

/**
 * Adaptador del asistente analítico del nutricionista (Claude/OpenRouter, según
 * la config del profesional). Resuelve el proveedor por request y corre el loop
 * de herramientas. Degrada al stub si no hay IA o si la API falla.
 */
export class AsistenteAnaliticoClaude implements IAsistenteAnalitico {
  constructor(
    private readonly resolver: IResolvedorConfigIA,
    private readonly respaldo: IAsistenteAnalitico,
  ) {}

  async responder(pregunta: string, herramientas: HerramientaAsistente[]): Promise<string> {
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return this.respaldo.responder(pregunta, herramientas);

    try {
      const porNombre = new Map(herramientas.map((h) => [h.nombre, h]));
      const texto = await llm.conversar({
        system: SYSTEM,
        pregunta: pregunta.trim(),
        maxTokens: 2048,
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
        maxIteraciones: 5,
      });
      return texto || (await this.respaldo.responder(pregunta, herramientas));
    } catch {
      return this.respaldo.responder(pregunta, herramientas);
    }
  }
}
