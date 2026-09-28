import type { CrearRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/CrearRecetaBase";
import type { ActualizarRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/ActualizarRecetaBase";
import type { EliminarRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/EliminarRecetaBase";
import type { ObtenerRecetaBase } from "@/aplicacion/casos-de-uso/catalogo/ObtenerRecetaBase";
import type { ListarRecetasBase } from "@/aplicacion/casos-de-uso/catalogo/ListarRecetasBase";
import type { CopiarRecetaBaseAlRecetario } from "@/aplicacion/casos-de-uso/catalogo/CopiarRecetaBaseAlRecetario";
import type { Receta } from "@/dominio/entidades/Receta";
import type {
  CrearRecetaBaseDto,
  ActualizarRecetaBaseDto,
  ListarRecetasBaseDto,
  RecetaBaseSalidaDto,
  RecetasBasePaginadas,
} from "../dtos/recetaBase.dto";

/**
 * Servicio del catálogo de recetas de la plataforma: la gestión, que es del
 * SUPERADMIN, y la lectura y la copia al recetario, que son de cada
 * consultorio. Quién puede qué lo decide el procedimiento del router.
 */
export class ServicioRecetasBase {
  constructor(
    private readonly crearUC: CrearRecetaBase,
    private readonly actualizarUC: ActualizarRecetaBase,
    private readonly eliminarUC: EliminarRecetaBase,
    private readonly obtenerUC: ObtenerRecetaBase,
    private readonly listarUC: ListarRecetasBase,
    private readonly copiarUC: CopiarRecetaBaseAlRecetario,
  ) {}

  async crear(datos: CrearRecetaBaseDto): Promise<RecetaBaseSalidaDto> {
    return aSalida(await this.crearUC.ejecutar(datos));
  }

  async actualizar(
    datos: ActualizarRecetaBaseDto,
  ): Promise<RecetaBaseSalidaDto> {
    const { id, ...campos } = datos;
    return aSalida(await this.actualizarUC.ejecutar(id, campos));
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  async obtener(id: string): Promise<RecetaBaseSalidaDto> {
    return aSalida(await this.obtenerUC.ejecutar(id));
  }

  async listar(datos: ListarRecetasBaseDto): Promise<RecetasBasePaginadas> {
    const { items, total, paginas } = await this.listarUC.ejecutar(datos);
    return { recetas: items.map(aSalida), total, paginas };
  }

  /** Las etiquetas del catálogo, para los filtros. */
  etiquetas(): Promise<string[]> {
    return this.listarUC.etiquetas();
  }

  /** Copia la receta al recetario del consultorio y devuelve el id de la copia. */
  async copiarAlRecetario(recetaBaseId: string): Promise<{ recetaId: string }> {
    const copia = await this.copiarUC.ejecutar(recetaBaseId);
    return { recetaId: copia.id };
  }
}

function aSalida(receta: Receta): RecetaBaseSalidaDto {
  const {
    fotos: _fotos,
    documentos: _documentos,
    fotoPrincipalId: _foto,
    grupoId: _grupo,
    grupoNombre: _grupoNombre,
    recetaBaseId: _origen,
    ...resto
  } = receta.aPrimitivos();
  return {
    ...resto,
    totales: receta.totales(),
    macrosCalculados: receta.macrosCalculados,
  };
}
