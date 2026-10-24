import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";

/** Cuántos sufijos se prueban antes de rendirse: «Julia Pérez (2)»…«(50)». */
const MAX_INTENTOS_DE_NOMBRE = 50;

/**
 * La carpeta de UN paciente en una colección de carpetas: la que ya tiene, o
 * una nueva con su nombre. La usan «crear plan para este paciente» y «crear
 * planificación deportiva para este paciente» (migración 94): cada colección
 * tiene sus carpetas, pero la regla es la misma.
 *
 * La carpeta queda atada al paciente (`pacienteId`) y no a su nombre:
 * reencontrarla por texto sería frágil (dos pacientes homónimos, un cambio
 * de apellido).
 *
 * El nombre puede chocar con una carpeta que alguien ya armó a mano (u
 * homónimos): se numera, como el nombre de un plan clonado, en vez de fallar
 * en un flujo que no tiene dónde escribir uno distinto.
 */
export async function obtenerOCrearCarpetaDelPaciente(
  grupos: IGrupoPlanRepositorio,
  pacienteId: string,
  nombreCompleto: string,
): Promise<GrupoPlan> {
  const existente = await grupos.obtenerPorPaciente(pacienteId);
  if (existente) return existente;

  for (let intento = 1; intento <= MAX_INTENTOS_DE_NOMBRE; intento += 1) {
    const nombre =
      intento === 1 ? nombreCompleto : `${nombreCompleto} (${intento})`;
    if (!(await grupos.existeNombre(nombre))) {
      return grupos.crear(
        GrupoPlan.crear({ nombre, pacienteId }, crypto.randomUUID()),
      );
    }
  }
  // Virtualmente inalcanzable, pero deja el tipo de retorno sin `| null`.
  return grupos.crear(
    GrupoPlan.crear(
      { nombre: nombreCompleto, pacienteId },
      crypto.randomUUID(),
    ),
  );
}
