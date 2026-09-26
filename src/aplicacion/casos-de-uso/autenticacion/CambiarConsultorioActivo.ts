import type {
  ConsultorioDeCuenta,
  ICuentaPacienteRepositorio,
} from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";

/**
 * Caso de uso: el paciente elige en qué consultorio trabajar.
 *
 * Lo único que decide es si puede: la ficha tiene que ser de ESA
 * cuenta. El `pacienteId` llega del navegador, así que sin este chequeo
 * cualquiera podría abrir la ficha de otra persona con solo nombrarla.
 * Recordar la elección y reemitir la sesión es del borde (la cookie y el JWT).
 */
export class CambiarConsultorioActivo {
  constructor(private readonly cuentas: ICuentaPacienteRepositorio) {}

  async ejecutar(
    usuarioId: string,
    pacienteId: string,
  ): Promise<ConsultorioDeCuenta> {
    const consultorios = await this.cuentas.listarDeUsuario(usuarioId);
    const elegido = consultorios.find((c) => c.pacienteId === pacienteId);
    if (!elegido) {
      throw new ErrorAccesoDenegado("No tenés acceso a ese consultorio.");
    }
    return elegido;
  }
}
