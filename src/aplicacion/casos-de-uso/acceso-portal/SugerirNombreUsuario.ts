import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import { baseNombreUsuario } from "@/dominio/servicios/nombreUsuario";

/** Cuántas variantes numeradas se prueban antes de rendirse. */
const INTENTOS = 50;

/**
 * Caso de uso: proponer un nombre de usuario libre a partir del nombre de la
 * persona («maria.perez», «maria.perez2», …). Es una sugerencia para el
 * formulario: el profesional la puede cambiar, y el alta vuelve a verificar
 * que esté libre.
 */
export class SugerirNombreUsuario {
  constructor(private readonly usuarios: IUsuarioRepositorio) {}

  async ejecutar(nombre: string, apellido: string): Promise<string | null> {
    const base = baseNombreUsuario(nombre, apellido);
    for (let n = 1; n <= INTENTOS; n += 1) {
      const candidato = n === 1 ? base : `${base}${n}`;
      if (!(await this.usuarios.nombreUsuarioYaRegistrado(candidato))) {
        return candidato;
      }
    }
    return null;
  }
}
