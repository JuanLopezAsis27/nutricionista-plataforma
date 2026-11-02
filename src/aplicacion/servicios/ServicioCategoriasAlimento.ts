import type { ListarCategoriasAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/ListarCategoriasAlimento";
import type { CrearCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/CrearCategoriaAlimento";
import type { RenombrarCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/RenombrarCategoriaAlimento";
import type { EliminarCategoriaAlimento } from "@/aplicacion/casos-de-uso/categorias-alimento/EliminarCategoriaAlimento";
import type {
  MoverCategoriaAlimento,
  DireccionCategoria,
} from "@/aplicacion/casos-de-uso/categorias-alimento/MoverCategoriaAlimento";
import type { CategoriaAlimento } from "@/dominio/entidades/CategoriaAlimento";
import type { CategoriaAlimentoSalidaDto } from "../dtos/categoriaAlimento.dto";

/**
 * Servicio de aplicación de las categorías de alimento (migración 93). Hay
 * dos instancias, como con los alimentos: la del CONSULTORIO (lista las
 * predeterminadas y las propias, y gestiona solo las propias) y la de la
 * PLATAFORMA (las predeterminadas, que administra el SUPERADMIN, con orden).
 */
export class ServicioCategoriasAlimento {
  constructor(
    private readonly listarUC: ListarCategoriasAlimento,
    private readonly crearUC: CrearCategoriaAlimento,
    private readonly renombrarUC: RenombrarCategoriaAlimento,
    private readonly eliminarUC: EliminarCategoriaAlimento,
    /** Solo en la plataforma: las propias van por nombre. */
    private readonly moverUC: MoverCategoriaAlimento | null = null,
  ) {}

  listar(): Promise<CategoriaAlimentoSalidaDto[]> {
    return this.listarUC.ejecutar();
  }

  async crear(nombre: string): Promise<CategoriaAlimentoSalidaDto> {
    return aSalida(await this.crearUC.ejecutar(nombre));
  }

  async renombrar(
    id: string,
    nombre: string,
  ): Promise<CategoriaAlimentoSalidaDto> {
    return aSalida(await this.renombrarUC.ejecutar(id, nombre));
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  async mover(id: string, direccion: DireccionCategoria): Promise<void> {
    await this.moverUC?.ejecutar(id, direccion);
  }
}

function aSalida(categoria: CategoriaAlimento): CategoriaAlimentoSalidaDto {
  return categoria.referencia;
}
