import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
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
  /** Solo se usa si la cuenta es NUEVA (ver `cuentaExistente`). */
  password: string;
}

/** Cómo terminó el alta. */
export interface ResultadoAltaPaciente {
  paciente: Paciente;
  /**
   * La persona ya tenía cuenta en la plataforma (es paciente de otro
   * consultorio): se la VINCULÓ a esta ficha y conserva su contraseña, que
   * `password` no pisó. La bienvenida tiene que decir eso y no mandar una.
   */
  cuentaExistente: boolean;
}

/**
 * Caso de uso: dar de alta un paciente JUNTO con su acceso al portal.
 *
 * La app es multiusuario: el nutricionista crea la ficha del paciente y, en el
 * mismo acto, le da acceso al portal. Así el paciente puede iniciar sesión y
 * ver sus turnos y su plan.
 *
 * **Una persona, una cuenta, varios consultorios** (migración 78). Si el email
 * ya tiene una cuenta de PACIENTE —la persona se atiende también con otro
 * profesional—, no se crea otra ni se rechaza el alta: se VINCULA esa cuenta a
 * la ficha nueva, y la persona entra con la contraseña que ya tenía. La que
 * cargó el profesional se descarta: fijarla le permitiría a este consultorio
 * entrar como el paciente y leer los datos del otro (ver `cuentaPaciente.ts`).
 *
 * Una cuenta NUEVA nace con contraseña provisional: la eligió el profesional,
 * y el portal le recomienda a la persona cambiarla.
 *
 * Si falla la cuenta o la asignación, se compensa eliminando la ficha recién
 * creada (y la cuenta, si se había creado acá).
 */
export class CrearPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(
    datos: DatosNuevoPacienteConAcceso,
  ): Promise<ResultadoAltaPaciente> {
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

    // Del propio consultorio: la cuenta del nutricionista, o la de un paciente
    // que ya tiene OTRA ficha acá (el email de la ficha y el de la
    // cuenta pueden diferir si la cuenta es compartida).
    if (await this.usuarios.obtenerPorEmail(email)) {
      throw new ErrorValidacion(
        `El email ${email} ya está usado por otra cuenta de este consultorio. Elegí uno distinto para el paciente.`,
      );
    }

    // Global: `usuarios.email` es único en toda la plataforma. Si es la cuenta
    // de un paciente de otro consultorio, se la vincula. Si es de un
    // profesional, no: una cuenta de consultorio no entra al portal.
    // El mensaje dice la restricción y qué hacer, pero NO de quién es la
    // cuenta: eso sería filtrar datos de otro consultorio.
    const cuentaExistente = await this.usuarios.obtenerPorEmailGlobal(email);
    if (cuentaExistente && !cuentaExistente.esPaciente) {
      throw new ErrorValidacion(
        `El email ${email} ya tiene una cuenta en la plataforma que no es de paciente. ` +
          `Usá otro email para este paciente.`,
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

    // 3. La cuenta (nueva o la que ya tenía), asignada a esta ficha.
    //    Compensa si falla.
    let cuentaNueva: Usuario | null = null;
    try {
      if (!cuentaExistente) {
        cuentaNueva = await this.usuarios.crear(
          Usuario.crear(
            {
              email: pacienteCreado.email,
              passwordHash: await this.hasheador.hashear(datos.password),
              rol: "PACIENTE",
              // La eligió el profesional, no la persona.
              passwordProvisional: true,
            },
            crypto.randomUUID(),
          ),
        );
      }
      const cuenta = (cuentaExistente ?? cuentaNueva)!;
      await this.cuentas.vincular(cuenta.id, pacienteCreado.id);
    } catch (error) {
      // Una cuenta recién creada y sin ficha no le sirve a nadie y deja el
      // email tomado para siempre. La que ya existía no se toca: es de otro
      // consultorio también.
      if (cuentaNueva) await this.usuarios.eliminar(cuentaNueva.id);
      await this.repositorio.eliminar(pacienteCreado.id);
      throw error;
    }

    return {
      paciente: pacienteCreado,
      cuentaExistente: cuentaExistente !== null,
    };
  }

  private async prefijoPais(): Promise<string> {
    const config = await this.configuracion.obtener();
    return config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO;
  }
}
