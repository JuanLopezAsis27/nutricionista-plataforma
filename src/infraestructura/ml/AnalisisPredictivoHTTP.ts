import type {
  IAnalisisPredictivo,
  InsightPaciente,
} from "@/dominio/servicios/IAnalisisPredictivo";
import { alcanceActual } from "@/infraestructura/multitenancy/contextoTenant";
import type { ClienteML } from "./clienteML";

/**
 * Adaptador HTTP del análisis predictivo: llama al microservicio de ML pasando
 * el `nutricionistaId` del inquilino de la request (el servicio lee las tablas
 * de eventos de ESE nutricionista). Si el servicio falla o no está, cae al stub
 * de demostración (degradación elegante).
 */
export class AnalisisPredictivoHTTP implements IAnalisisPredictivo {
  constructor(
    private readonly cliente: ClienteML,
    private readonly fallback: IAnalisisPredictivo,
  ) {}

  async insights(): Promise<InsightPaciente[]> {
    try {
      const alcance = alcanceActual();
      const nutricionistaId =
        alcance?.tipo === "nutricionista" ? alcance.nutricionistaId : null;
      return await this.cliente.postar<InsightPaciente[]>("/insights", {
        nutricionistaId,
      });
    } catch (error) {
      console.error("[ml] insights falló, se usa el stub:", error);
      return this.fallback.insights();
    }
  }
}
