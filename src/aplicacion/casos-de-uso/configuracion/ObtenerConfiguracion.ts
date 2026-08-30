import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";

/**
 * Caso de uso: obtener la configuración del consultorio. Si todavía no se
 * guardó ninguna, devuelve la configuración por defecto (lectura pura, sin
 * escribir: la persiste `GuardarConfiguracion` cuando el profesional edita).
 */
export class ObtenerConfiguracion {
  constructor(private readonly repo: IConfiguracionRepositorio) {}

  async ejecutar(): Promise<ConfiguracionConsultorio> {
    return (await this.repo.obtener()) ?? ConfiguracionConsultorio.porDefecto();
  }
}
