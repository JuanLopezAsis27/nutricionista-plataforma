import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { PREFIJO_PAIS_POR_DEFECTO } from "@/dominio/servicios/telefono";
import {
  Paciente,
  type DatosNuevoPaciente,
} from "@/dominio/entidades/Paciente";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Entrada del dominio: datos del paciente + contraseña de su cuenta. */
export interface DatosNuevoPacienteConAcceso extends DatosNuevoPaciente {
  password: string;
}

/**
 * Caso de uso: dar de alta un paciente JUNTO con su cuenta de acceso.
 *
 * La app es multiusuario: el nutricionista crea la ficha del paciente y, en el
 * mismo acto, su usuario con rol PACIENTE (mismo email, contraseña hasheada).
 * Así el paciente puede iniciar sesión y ver sus turnos y su plan.
 *
 * Responsabilidad: validar unicidad del email (en pacientes y usuarios),
 * persistir el paciente, hashear la contraseña y crear el usuario. Si falla la
 * creación del usuario, se compensa eliminando el paciente recién creado.
 */
export class CrearPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevoPacienteConAcceso): Promise<Paciente> {
    const email = datos.email.trim().toLowerCase();

    // 1. El email debe estar libre. Son TRES preguntas distintas y cada una
    //    merece su propia respuesta: lo que el profesional tiene que hacer a
    //    continuación no es lo mismo en los tres casos.
    const pacienteExistente = await this.repositorio.obtenerPorEmail(email);
    if (pacienteExistente) {
      throw new ErrorValidacion(
        `Ya tenés un paciente con el email ${email}: ${pacienteExistente.nombreCompleto}. ` +
          `Si es la misma persona, editá su ficha en vez de crear una nueva; si son distintas, usá otro email.`,
      );
    }

    // Del propio consultorio: puede ser el nutricionista o una cuenta cuya
    // ficha de paciente ya se borró (la cuenta queda, el email sigue tomado).
    if (await this.usuarios.obtenerPorEmail(email)) {
      throw new ErrorValidacion(
        `El email ${email} ya está usado por otra cuenta de este consultorio. Elegí uno distinto para el paciente.`,
      );
    }

    // Global: `usuarios.email` es único en toda la plataforma. Sin esta
    // pregunta el alta seguía y reventaba contra el índice de Postgres, que no
    // es un error de dominio y llegaba a pantalla como "error inesperado".
    // El mensaje dice la restricción y qué hacer, pero NO de quién es la
    // cuenta: eso sería filtrar datos de otro consultorio.
    if (await this.usuarios.emailYaRegistrado(email)) {
      throw new ErrorValidacion(
        `El email ${email} ya tiene una cuenta en la plataforma. ` +
          `Cada cuenta necesita un email propio, así que usá otro para este paciente.`,
      );
    }

    // 2. Crear y persistir la ficha del paciente (valida invariantes).
    //    El prefijo del consultorio define cómo se canoniza el teléfono a
    //    E.164, que es la clave con la que después se resuelve por WhatsApp.
    const paciente = Paciente.crear(
      datos,
      crypto.randomUUID(),
      new Date(),
      await this.prefijoPais(),
    );
    const pacienteCreado = await this.repositorio.crear(paciente);

    // 3. Crear la cuenta de acceso del paciente (compensa si falla).
    try {
      const passwordHash = await this.hasheador.hashear(datos.password);
      const usuario = Usuario.crear(
        {
          email: pacienteCreado.email,
          passwordHash,
          rol: "PACIENTE",
          pacienteId: pacienteCreado.id,
        },
        crypto.randomUUID(),
      );
      await this.usuarios.crear(usuario);
    } catch (error) {
      await this.repositorio.eliminar(pacienteCreado.id);
      throw error;
    }

    return pacienteCreado;
  }

  private async prefijoPais(): Promise<string> {
    const config = await this.configuracion.obtener();
    return config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;
  }
}
