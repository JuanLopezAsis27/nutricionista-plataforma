import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";

/**
 * Palabras con las que un paciente confirma que viene.
 *
 * La lista es corta y sin acentos a propósito: se compara contra el texto
 * normalizado, y lo que se busca es la respuesta de una palabra ("sí", "dale",
 * "confirmo"), que es como contesta la mayoría. Una respuesta larga se marca
 * como RESPONDIDA y la lee el profesional: adivinar la intención de un párrafo
 * y darle el turno por confirmado sería peor que no adivinar nada.
 */
const AFIRMACIONES = [
  "si",
  "sii",
  "siii",
  "sip",
  "ok",
  "oka",
  "okey",
  "okay",
  "dale",
  "perfecto",
  "confirmo",
  "confirmado",
  "asisto",
  "ahi estare",
  "ahi voy",
  "voy",
  "nos vemos",
  "listo",
  "de una",
  "genial",
  "buenisimo",
];

/** Tope de palabras para que una respuesta cuente como confirmación. */
const MAX_PALABRAS_CONFIRMACION = 4;

/** Qué se marcó al procesar la respuesta. */
export interface ResultadoRespuesta {
  /** Cuántos recordatorios pasaron a RESPONDIDO o CONFIRMADO. */
  marcados: number;
  /** true si el texto se interpretó como una confirmación de asistencia. */
  confirmo: boolean;
}

/**
 * Caso de uso: anotar que el paciente contestó un recordatorio.
 *
 * Corre en la ingesta del webhook, cuando entra un mensaje del paciente. Sin
 * esto, el log sabe que el aviso salió pero no si sirvió, que es justamente lo
 * que el profesional necesita mirar antes de liberar un horario.
 *
 * Marca RESPONDIDO todos los recordatorios que le salieron y todavía no
 * registraban respuesta, y CONFIRMADO cuando el texto es una afirmación corta.
 * La distinción importa: RESPONDIDO es un hecho verificable (contestó);
 * CONFIRMADO es una interpretación, y por eso se limita a los casos en que no
 * hay nada que interpretar. El profesional puede corregir las dos a mano.
 */
export class RegistrarRespuestaDeRecordatorio {
  constructor(
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    cuerpo: string,
    ahora: Date = new Date(),
  ): Promise<ResultadoRespuesta> {
    const pendientes =
      await this.recordatorios.sinRespuestaDePaciente(pacienteId);
    if (pendientes.length === 0) {
      return { marcados: 0, confirmo: false };
    }

    const confirmo = esConfirmacion(cuerpo);
    const estado = confirmo ? "CONFIRMADO" : "RESPONDIDO";

    let marcados = 0;
    for (const recordatorio of pendientes) {
      const actualizado = recordatorio.registrarEstado(estado, ahora);
      // `registrarEstado` devuelve la misma instancia si el estado no avanza.
      if (actualizado === recordatorio) continue;
      await this.recordatorios.actualizar(actualizado);
      marcados += 1;
    }

    return { marcados, confirmo };
  }
}

/** Normaliza el texto y decide si es una confirmación corta e inequívoca. */
export function esConfirmacion(cuerpo: string): boolean {
  const texto = cuerpo
    .toLowerCase()
    .normalize("NFD")
    // Saca los diacríticos: "sí" y "si" son la misma respuesta.
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (texto.length === 0) return false;
  // Una negación en cualquier parte descarta la confirmación: "no puedo, dale
  // para la semana que viene" no es un sí.
  if (/\bno\b|\bcancel/.test(texto)) return false;
  if (texto.split(" ").length > MAX_PALABRAS_CONFIRMACION) return false;

  return AFIRMACIONES.some(
    (afirmacion) => texto === afirmacion || texto.startsWith(`${afirmacion} `),
  );
}
