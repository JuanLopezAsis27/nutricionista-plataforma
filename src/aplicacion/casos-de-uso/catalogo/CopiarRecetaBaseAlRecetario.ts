import type { IRecetaBaseRepositorio } from "@/dominio/repositorios/IRecetaBaseRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import { Receta } from "@/dominio/entidades/Receta";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";

/**
 * Caso de uso: un consultorio toma una receta de la plataforma y la suma a SU
 * recetario.
 *
 * Es una COPIA y no una referencia, a propósito: desde ahí la receta es del
 * consultorio —la edita, le pone fotos, la guarda en una carpeta, la comparte
 * con un paciente, la vincula a un plan— con todo lo que ya sabe hacer una
 * receta y sin un segundo tipo de receta que cada pantalla tenga que
 * distinguir. El precio es que los cambios posteriores del catálogo no le
 * llegan, y eso también es lo correcto: una receta ya entregada no puede
 * cambiar desde afuera.
 *
 * Es IDEMPOTENTE: si el consultorio ya la había copiado, devuelve esa copia
 * (`recetas.recetaBaseId` es único por consultorio). Así elegirla dos veces
 * desde el plan no llena el recetario de duplicados.
 */
export class CopiarRecetaBaseAlRecetario {
  constructor(
    private readonly catalogo: IRecetaBaseRepositorio,
    private readonly recetario: IRecetaRepositorio,
  ) {}

  async ejecutar(recetaBaseId: string): Promise<Receta> {
    const existente = await this.recetario.obtenerPorRecetaBase(recetaBaseId);
    if (existente) return existente;

    const base = await this.catalogo.obtenerPorId(recetaBaseId);
    if (!base) throw new ErrorRecetaNoEncontrada(recetaBaseId);

    const p = base.aPrimitivos();
    const copia = Receta.crear(
      {
        nombre: p.nombre,
        descripcion: p.descripcion,
        porciones: p.porciones,
        preparacion: p.preparacion,
        ingredientes: p.ingredientes,
        etiquetas: p.etiquetas,
        enlaces: p.enlaces,
        // Solo cuentan si la receta no tiene ingredientes con datos: ahí la
        // entidad los vuelve a calcular y llegan al mismo número.
        calorias: p.calorias,
        proteinasG: p.proteinasG,
        carbohidratosG: p.carbohidratosG,
        grasasG: p.grasasG,
        recetaBaseId,
      },
      crypto.randomUUID(),
    );
    return this.recetario.crear(copia, []);
  }
}
