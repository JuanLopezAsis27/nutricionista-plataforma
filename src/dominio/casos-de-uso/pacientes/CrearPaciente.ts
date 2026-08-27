import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "../../servicios/IHasheadorContrasena";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import { PREFIJO_PAIS_POR_DEFECTO } from "../../servicios/telefono";
import { Paciente, type DatosNuevoPaciente } from "../../entidades/Paciente";
import { Usuario } from "../../entidades/Usuario";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

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

    // 1. El email debe ser único tanto en pacientes como en usuarios.
    if (await this.repositorio.obtenerPorEmail(email)) {
      throw new ErrorValidacion("Ya existe un paciente con ese email.");
    }
    if (await this.usuarios.obtenerPorEmail(email)) {
      throw new ErrorValidacion("Ya existe un usuario con ese email.");
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
