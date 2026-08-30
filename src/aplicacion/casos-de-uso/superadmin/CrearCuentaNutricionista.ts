import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IProvisionadorNutricionista } from "@/dominio/servicios/IProvisionadorNutricionista";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Datos para dar de alta una cuenta de nutricionista (inquilino). */
export interface DatosNuevaCuentaNutricionista {
  email: string;
  password: string;
}

/**
 * Caso de uso (SUPERADMIN): crear una cuenta de nutricionista. El nutricionista
 * es su propio inquilino (nutricionistaId = su id). Tras crearlo, aprovisiona
 * sus datos por defecto (config, plantillas, axiomas) dentro de su alcance.
 */
export class CrearCuentaNutricionista {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly provisionador: IProvisionadorNutricionista,
    private readonly nutricionistas: INutricionistaRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevaCuentaNutricionista): Promise<Usuario> {
    const email = datos.email.trim().toLowerCase();
    if (await this.usuarios.obtenerPorEmail(email)) {
      throw new ErrorValidacion("Ya existe un usuario con ese email.");
    }

    const id = crypto.randomUUID();
    // El inquilino primero: `usuarios.nutricionistaId` es FK a `nutricionistas`,
    // y todo lo que se aprovisione después cuelga de esa fila.
    await this.nutricionistas.crear(id);
    const usuario = Usuario.crear(
      {
        email,
        passwordHash: await this.hasheador.hashear(datos.password),
        rol: "NUTRICIONISTA",
        pacienteId: null,
        nutricionistaId: id, // es su propio inquilino
      },
      id,
    );
    const creado = await this.usuarios.crear(usuario);
    await this.provisionador.aprovisionar(id);
    return creado;
  }
}
