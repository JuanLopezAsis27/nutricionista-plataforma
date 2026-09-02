import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IInterpretadorHistoriaClinica } from "@/dominio/servicios/IInterpretadorHistoriaClinica";
import type { CamposHistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import { leerDocumentoParaLLM } from "./documentoParaLLM";

const CAMPOS = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "habitos",
  "contexto",
] as const satisfies readonly (keyof CamposHistoriaClinica)[];

const ESQUEMA_HISTORIA = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    CAMPOS.map((campo) => [campo, { type: ["string", "null"] }]),
  ),
  required: [...CAMPOS],
};

const SYSTEM = `Sos el asistente de un consultorio de nutrición. Recibís un documento de historia clínica (una ficha, un informe, algo escrito a mano o impreso, o el texto de un Word) y extraés SOLO lo que está escrito ahí.

Reglas:
1. NO inventes ni completes nada que no esté en el documento. Si un campo no aparece, devolvé null para ese campo.
2. No diagnostiques ni agregues interpretación clínica propia: transcribí y organizá lo que ya está escrito.
3. Respondé en español, con el texto de cada campo breve y legible (no copies literalmente saltos de línea raros del original).

Campos a completar: motivo de consulta, diagnósticos, medicación, antecedentes personales, antecedentes familiares, hábitos (actividad, sueño, consumo), contexto (trabajo, horarios, entorno).`;

/**
 * Interpreta una foto, un PDF o un Word de historia clínica con el LLM del
 * consultorio y sugiere los 7 campos del formulario.
 *
 * Sin proveedor configurado LANZA (no hay stub que invente datos clínicos):
 * mismo criterio que `ResumidorConsultaLLM`, porque lo que salga de acá se
 * ofrece para cargar en la ficha del paciente.
 */
export class InterpretadorHistoriaClinicaLLM implements IInterpretadorHistoriaClinica {
  constructor(
    private readonly resolvedor: IResolvedorConfigIA,
    private readonly almacenamiento: IAlmacenamientoArchivos,
  ) {}

  async interpretar(archivo: {
    clave: string;
    mimeType: string;
  }): Promise<Partial<CamposHistoriaClinica>> {
    const llm = await this.resolvedor.obtenerLLM();
    if (!llm) {
      throw new Error(
        "No hay IA configurada para interpretar el archivo. Cargá la clave en Integraciones o completá los campos a mano.",
      );
    }

    const bloqueArchivo = await leerDocumentoParaLLM(
      this.almacenamiento,
      archivo,
    );

    const texto = await llm.completar({
      system: SYSTEM,
      usuario: [
        bloqueArchivo,
        {
          tipo: "texto",
          texto: "Extraé los campos de la historia clínica de este documento.",
        },
      ],
      maxTokens: 3000,
      // Mismo criterio que la ficha de alta: extraer de un documento clínico
      // no es una tarea de una pasada, y lo que salga se copia a la ficha.
      esfuerzo: "alto",
      esquemaJson: { nombre: "historia_clinica", esquema: ESQUEMA_HISTORIA },
    });

    const datos = JSON.parse(texto) as Record<string, unknown>;
    const resultado: Partial<CamposHistoriaClinica> = {};
    for (const campo of CAMPOS) {
      const valor = datos[campo];
      resultado[campo] =
        typeof valor === "string" && valor.trim() ? valor.trim() : null;
    }
    return resultado;
  }
}
