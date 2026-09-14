import type {
  IResumidorConsulta,
  ResumenGenerado,
  TramoConsulta,
} from "@/dominio/servicios/IResumidorConsulta";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { ResumidorConsultaStub } from "./ResumidorConsultaStub";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

/**
 * Cuánta transcripción entra al prompt.
 *
 * Una consulta de una hora son del orden de 60 000 caracteres, que entran de
 * sobra en el contexto de cualquier modelo actual. El tope está para que una
 * grabación anómala —un micrófono que quedó abierto toda la tarde— no dispare
 * una llamada enorme: se recorta el MEDIO y se conservan el principio y el
 * final, que es donde están el motivo de consulta y las indicaciones.
 */
const MAX_CARACTERES = 120_000;

/**
 * Resumidor de consultas sobre el proveedor de LLM del inquilino.
 *
 * Usa el MISMO proveedor que el resto de la IA de la app (`ResolvedorConfigIA`)
 * y no el de transcripción: transcribir y resumir son dos capacidades
 * distintas, y quien tiene Claude configurado para el asistente quiere Claude
 * acá también, aunque transcriba con OpenAI.
 *
 * Sin proveedor configurado delega en el stub, que LANZA: un resumen de
 * demostración guardado junto a la consulta de un paciente se leería como el
 * resumen de esa consulta.
 */
export class ResumidorConsultaLLM implements IResumidorConsulta {
  private readonly stub = new ResumidorConsultaStub();

  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
  ) {}

  async resumir(
    tramos: TramoConsulta[],
    contexto: { nombrePaciente?: string | null; fecha?: Date | null },
  ): Promise<ResumenGenerado> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) return this.stub.resumir(tramos, contexto);

    const encabezado = [
      contexto.nombrePaciente ? `Paciente: ${contexto.nombrePaciente}.` : null,
      contexto.fecha
        ? `Fecha de la consulta: ${contexto.fecha.toISOString().slice(0, 10)}.`
        : null,
      tramos.length > 1
        ? `La consulta se grabó en ${tramos.length} tramos; van en orden y son una sola consulta.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    const cuerpo = tramos
      .map((t) =>
        tramos.length > 1 ? `--- Tramo ${t.orden} ---\n${t.texto}` : t.texto,
      )
      .join("\n\n");

    const texto = await llm.completar({
      system: await this.prompts.obtener("RESUMEN_CONSULTA"),
      usuario: [
        {
          tipo: "texto",
          texto: `${encabezado}\n\nTranscripción:\n\n${recortar(cuerpo)}`,
        },
      ],
      maxTokens: 2000,
    });

    const limpio = texto.trim();
    if (limpio.length === 0) {
      throw new Error("El modelo devolvió un resumen vacío.");
    }
    return { texto: limpio, modelo: llm.modelo };
  }
}

/** Conserva el principio y el final; el medio es lo que se sacrifica. */
function recortar(texto: string): string {
  if (texto.length <= MAX_CARACTERES) return texto;
  const mitad = Math.floor(MAX_CARACTERES / 2);
  return [
    texto.slice(0, mitad),
    "\n\n[…tramo intermedio omitido por longitud…]\n\n",
    texto.slice(texto.length - mitad),
  ].join("");
}
