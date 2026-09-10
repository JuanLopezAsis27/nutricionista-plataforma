import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { RolUsuario } from "@/dominio/entidades/Usuario";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import { type IdentidadVisible, nombreDelProfesional } from "./identidad";

/** Lo que "Mi perfil" muestra de la cuenta propia. */
export interface MiPerfil extends IdentidadVisible {
  usuarioId: string;
  email: string;
  rol: RolUsuario;
}

/**
 * Caso de uso: los datos de la cuenta propia para la pantalla "Mi perfil".
 *
 * El NOMBRE no vive en `Usuario` —que solo guarda credenciales y rol— sino en
 * dos lugares distintos según quién sea: el paciente lo tiene en su ficha
 * (`Paciente.nombreCompleto`) y el profesional en la configuración del
 * consultorio (`nombreProfesional`). Resolver eso es justamente lo que hace
 * este caso de uso, y es la razón de que la pantalla muestre el nombre pero no
 * deje editarlo acá: cambiarlo es editar la ficha o la configuración, y tener
 * dos puertas para el mismo dato termina en dos nombres distintos.
 *
 * Un SUPERADMIN no tiene ni ficha ni consultorio, así que se lo nombra por su
 * email. No es un caso hipotético: la cuenta existe y también puede querer su
 * foto.
 */
export class ObtenerMiPerfil {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(usuarioId: string): Promise<MiPerfil> {
    const usuario = await this.usuarios.obtenerPorId(usuarioId);
    if (!usuario) {
      throw new ErrorUsuarioNoEncontrado(usuarioId);
    }

    return {
      usuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      // `?? null` explícito: el DTO de salida declara `nullable()` y nadie
      // valida la salida en el borde, así que un `undefined` que se colara
      // desde el mapeador viajaría igual y llegaría al cliente como un campo
      // ausente en vez de como "no tiene foto".
      fotoArchivoId: usuario.fotoPerfilId ?? null,
      nombre: await this.nombreDe(
        usuario.rol,
        usuario.pacienteId,
        usuario.email,
      ),
    };
  }

  private async nombreDe(
    rol: RolUsuario,
    pacienteId: string | null,
    email: string,
  ): Promise<string> {
    if (rol === "PACIENTE" && pacienteId) {
      const paciente = await this.pacientes.obtenerPorId(pacienteId);
      if (paciente) return paciente.nombreCompleto;
      // La ficha se archivó o se borró y la cuenta quedó: mejor el email que
      // una pantalla que no dice de quién es.
      return email;
    }
    if (rol === "NUTRICIONISTA") {
      const config = await this.configuracion.obtener();
      return nombreDelProfesional(
        config?.aPrimitivos().nombreProfesional ?? null,
      );
    }
    return email;
  }
}
