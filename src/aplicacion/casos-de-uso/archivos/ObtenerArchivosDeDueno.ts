import type {
  IArchivoRepositorio,
  DuenoArchivo,
} from "@/dominio/repositorios/IArchivoRepositorio";
import type { Archivo } from "@/dominio/entidades/Archivo";

/** Caso de uso: listar los archivos de un dueño (paciente, laboratorio…). */
export class ObtenerArchivosDeDueno {
  constructor(private readonly archivos: IArchivoRepositorio) {}

  async ejecutar(dueno: DuenoArchivo): Promise<Archivo[]> {
    return this.archivos.listarPorDueno(dueno);
  }
}
