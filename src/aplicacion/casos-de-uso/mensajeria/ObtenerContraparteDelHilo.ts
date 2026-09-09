import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import {
  type IdentidadVisible,
  nombreDelProfesional,
} from "@/aplicacion/casos-de-uso/perfil/identidad";

/**
 * Caso de uso: quién está del OTRO lado de un hilo, con nombre y foto.
 *
 * Un hilo de esta app tiene siempre exactamente dos extremos —el paciente y el
 * profesional del consultorio— así que la contraparte se deduce del rol de
 * quien mira y no hace falta buscarla en la conversación. Ese es todo el
 * parámetro `viewerEsNutricionista`.
 *
 * Va acá y no en el repositorio de mensajería porque no es un dato de la
 * conversación: la foto vive en `usuarios` y el nombre del profesional en la
 * configuración del consultorio. Meterlo en el `include` de la conversación
 * habría atado la mensajería a dos tablas que no son suyas.
 *
 * Nunca lanza: si la ficha o la cuenta del otro extremo no aparecen, devuelve
 * un nombre de respaldo y sin foto. Un chat que deja de abrirse porque falta
 * un avatar es peor que un chat con las iniciales puestas.
 */
export class ObtenerContraparteDelHilo {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    viewerEsNutricionista: boolean,
  ): Promise<IdentidadVisible> {
    return viewerEsNutricionista
      ? this.elPaciente(pacienteId)
      : this.elProfesional();
  }

  /** Lo que ve el NUTRICIONISTA: la persona que atiende. */
  private async elPaciente(pacienteId: string): Promise<IdentidadVisible> {
    const [paciente, cuenta] = await Promise.all([
      this.pacientes.obtenerPorId(pacienteId),
      this.usuarios.obtenerPorPacienteId(pacienteId),
    ]);
    return {
      nombre: paciente?.nombreCompleto ?? "Paciente",
      // Un paciente sin portal (no todos tienen cuenta) no tiene dónde guardar
      // una foto: se lo muestra con iniciales, como antes de esta función.
      fotoArchivoId: cuenta?.fotoPerfilId ?? null,
    };
  }

  /** Lo que ve el PACIENTE: su nutricionista. */
  private async elProfesional(): Promise<IdentidadVisible> {
    // Dentro del alcance de inquilino, `listarPorRol` devuelve el único
    // NUTRICIONISTA del consultorio: un inquilino ES un profesional.
    const [config, profesionales] = await Promise.all([
      this.configuracion.obtener(),
      this.usuarios.listarPorRol("NUTRICIONISTA"),
    ]);
    return {
      nombre: nombreDelProfesional(
        config?.aPrimitivos().nombreProfesional ?? null,
      ),
      fotoArchivoId: profesionales[0]?.fotoPerfilId ?? null,
    };
  }
}
