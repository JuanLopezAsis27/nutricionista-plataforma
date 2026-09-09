import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";

/**
 * Caso de uso: qué sede rige cuando nadie eligió una.
 *
 * Es la MISMA regla que aplica `AgendarTurno` al resolver el turno: la
 * principal, y si no hay, la primera vigente. Existe como caso de uso propio
 * para que la pantalla pueda anticiparla —qué agenda mostrar en el formulario,
 * contra qué días apagar las franjas— sin volver a inventarla. Si las dos se
 * separaran, el formulario ofrecería horarios que el servidor rechaza, que es
 * exactamente el problema que resolvió `docs/AGENDA.md`.
 */
export class ObtenerEstablecimientoVigente {
  constructor(private readonly repo: IEstablecimientoRepositorio) {}

  async ejecutar(): Promise<Establecimiento | null> {
    const principal = await this.repo.obtenerPrincipal();
    if (principal) return principal;

    const [primero] = await this.repo.listar();
    return primero ?? null;
  }
}
