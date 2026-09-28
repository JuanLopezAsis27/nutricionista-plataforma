import type { ImportarAlimentos } from "@/aplicacion/casos-de-uso/nutricion/ImportarAlimentos";
import type { ObtenerEstadoAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ObtenerEstadoAlimentosPropios";
import type { VaciarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/VaciarAlimentosPropios";
import type { CrearAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/CrearAlimentoPropio";
import type { ActualizarAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/ActualizarAlimentoPropio";
import type { EliminarAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/EliminarAlimentoPropio";
import type { ListarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ListarAlimentosPropios";
import type {
  CambiarImagenAlimento,
  ImagenSubida,
} from "@/aplicacion/casos-de-uso/nutricion/CambiarImagenAlimento";
import type { QuitarImagenAlimento } from "@/aplicacion/casos-de-uso/nutricion/QuitarImagenAlimento";
import type {
  ObtenerImagenAlimento,
  ImagenAlimento,
} from "@/aplicacion/casos-de-uso/nutricion/ObtenerImagenAlimento";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type { ContarUsosDeAlimento } from "@/aplicacion/casos-de-uso/nutricion/ContarUsosDeAlimento";
import type { BuscarCoincidenciaEnCatalogo } from "@/aplicacion/casos-de-uso/nutricion/BuscarCoincidenciaEnCatalogo";
import type { UsosDeAlimento } from "@/dominio/repositorios/IUsosDeAlimentoRepositorio";
import type {
  EstadoAlimentosPropiosDto,
  ImportarAlimentosDto,
  CrearAlimentoPropioDto,
  ActualizarAlimentoPropioDto,
  ListarAlimentosPropiosDto,
  AlimentoPropioSalidaDto,
  AlimentosPropiosPaginados,
} from "../dtos/alimentoPropio.dto";

/**
 * Servicio de aplicación de los alimentos propios del nutricionista. Orquesta la
 * importación masiva (Excel, reemplaza la lista), la gestión manual (alta,
 * edición y baja de un alimento a la vez), el estado (para la UI) y el vaciado.
 */
export class ServicioAlimentosPropios {
  constructor(
    private readonly importarUC: ImportarAlimentos,
    private readonly estadoUC: ObtenerEstadoAlimentosPropios,
    private readonly vaciarUC: VaciarAlimentosPropios,
    private readonly crearUC: CrearAlimentoPropio,
    private readonly actualizarUC: ActualizarAlimentoPropio,
    private readonly eliminarUC: EliminarAlimentoPropio,
    private readonly listarUC: ListarAlimentosPropios,
    private readonly cambiarImagenUC: CambiarImagenAlimento,
    private readonly quitarImagenUC: QuitarImagenAlimento,
    private readonly obtenerImagenUC: ObtenerImagenAlimento,
    private readonly usosUC: ContarUsosDeAlimento,
    /**
     * Solo en la lista del consultorio: si lo que carga ya está en el
     * catálogo de la plataforma. En el catálogo mismo no aplica (null).
     */
    private readonly coincidenciaUC: BuscarCoincidenciaEnCatalogo | null = null,
  ) {}

  /** Dónde se usa el alimento: para avisar antes de editarlo o borrarlo. */
  usos(id: string): Promise<UsosDeAlimento> {
    return this.usosUC.ejecutar(id);
  }

  /** El alimento de la plataforma que coincide con este nombre y marca, o null. */
  async coincidenciaEnCatalogo(
    nombre: string,
    marca: string | null,
  ): Promise<{ etiqueta: string } | null> {
    if (!this.coincidenciaUC) return null;
    const alimento = await this.coincidenciaUC.ejecutar(nombre, marca);
    return alimento ? { etiqueta: alimento.etiqueta } : null;
  }

  /** Cuántos quedaron y cuántas filas se descartaron por repetidas. */
  importar(
    filas: ImportarAlimentosDto,
  ): Promise<{ importados: number; repetidos: number; enPlataforma: number }> {
    return this.importarUC.ejecutar(
      filas.map((f) => ({
        nombre: f.nombre,
        marca: f.marca ?? null,
        caloriasPor100: f.caloriasPor100 ?? null,
        proteinasPor100: f.proteinasPor100 ?? null,
        carbohidratosPor100: f.carbohidratosPor100 ?? null,
        grasasPor100: f.grasasPor100 ?? null,
        categoria: f.categoria ?? null,
      })),
    );
  }

  estado(): Promise<EstadoAlimentosPropiosDto> {
    return this.estadoUC.ejecutar();
  }

  vaciar(): Promise<void> {
    return this.vaciarUC.ejecutar();
  }

  async listar(
    datos: ListarAlimentosPropiosDto,
  ): Promise<AlimentosPropiosPaginados> {
    const resultado = await this.listarUC.ejecutar(datos);
    return {
      alimentos: resultado.alimentos.map(ServicioAlimentosPropios.aSalida),
      total: resultado.total,
      paginas: resultado.paginas,
    };
  }

  async crear(datos: CrearAlimentoPropioDto): Promise<AlimentoPropioSalidaDto> {
    const alimento = await this.crearUC.ejecutar({
      nombre: datos.nombre,
      marca: datos.marca ?? null,
      caloriasPor100: datos.caloriasPor100 ?? null,
      proteinasPor100: datos.proteinasPor100 ?? null,
      carbohidratosPor100: datos.carbohidratosPor100 ?? null,
      grasasPor100: datos.grasasPor100 ?? null,
      categoria: datos.categoria ?? null,
    });
    return ServicioAlimentosPropios.aSalida(alimento);
  }

  async actualizar(
    datos: ActualizarAlimentoPropioDto,
  ): Promise<AlimentoPropioSalidaDto> {
    const { id, ...cambios } = datos;
    const alimento = await this.actualizarUC.ejecutar(id, cambios);
    return ServicioAlimentosPropios.aSalida(alimento);
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  async cambiarImagen(
    id: string,
    imagen: ImagenSubida,
  ): Promise<AlimentoPropioSalidaDto> {
    return ServicioAlimentosPropios.aSalida(
      await this.cambiarImagenUC.ejecutar(id, imagen),
    );
  }

  async quitarImagen(id: string): Promise<AlimentoPropioSalidaDto> {
    return ServicioAlimentosPropios.aSalida(
      await this.quitarImagenUC.ejecutar(id),
    );
  }

  obtenerImagen(id: string): Promise<ImagenAlimento> {
    return this.obtenerImagenUC.ejecutar(id);
  }

  private static aSalida(alimento: AlimentoPropio): AlimentoPropioSalidaDto {
    // La clave del bucket no sale: la pantalla pide la imagen por la ruta del
    // alimento, con la versión para no mostrar una vieja de la caché.
    const { imagenClave: _clave, ...resto } = alimento.aPrimitivos();
    return { ...resto, imagenVersion: alimento.imagenVersion };
  }
}
