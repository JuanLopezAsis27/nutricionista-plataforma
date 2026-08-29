import type {
  IAnalisisComidaIA,
  ResultadoAnalisisComida,
} from "@/dominio/servicios/IAnalisisComidaIA";
import type { ClienteML } from "./clienteML";

/**
 * Adaptador HTTP del análisis de comida: manda la clave del archivo (la imagen
 * en el bucket) y la descripción al microservicio de ML de visión, que devuelve
 * porción y macros estimados. Si falla o no está configurado, cae al stub.
 */
export class AnalisisComidaIAHTTP implements IAnalisisComidaIA {
  constructor(
    private readonly cliente: ClienteML,
    private readonly fallback: IAnalisisComidaIA,
  ) {}

  async analizar(entrada: {
    archivoClave?: string;
    descripcion?: string;
  }): Promise<ResultadoAnalisisComida> {
    try {
      return await this.cliente.postar<ResultadoAnalisisComida>(
        "/analizar-comida",
        {
          archivoClave: entrada.archivoClave ?? null,
          descripcion: entrada.descripcion ?? null,
        },
      );
    } catch (error) {
      console.error("[ml] analizar-comida falló, se usa el stub:", error);
      return this.fallback.analizar(entrada);
    }
  }
}
