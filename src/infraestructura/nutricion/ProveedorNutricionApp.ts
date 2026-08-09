import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { ITraductorIngredientes } from "@/infraestructura/ia/TraductorIngredientesIA";
import type { ConfigFatSecret } from "./configFatSecret";
import type { ClienteFatSecret } from "./ClienteFatSecret";
import { filtrarAlimentos } from "./filtrarAlimentos";

/**
 * Proveedor de datos nutricionales que despacha por inquilino: si el profesional
 * cargó credenciales de FatSecret (o están en el entorno) usa FatSecret; si no,
 * cae a Open Food Facts (gratis, sin key). Resuelve las credenciales por request.
 *
 * FatSecret está en inglés: con un traductor (Claude) el nutri busca en español
 * y ve los resultados en español. Si FatSecret no trae nada (o falla), cae a
 * Open Food Facts como red de seguridad.
 */
export class ProveedorNutricionApp implements IProveedorDatosNutricionales {
  constructor(
    private readonly credenciales: ICredencialesIntegracionRepositorio,
    private readonly fatsecret: ClienteFatSecret,
    private readonly respaldo: IProveedorDatosNutricionales,
    private readonly envFatSecret: ConfigFatSecret | null,
    private readonly traductor?: ITraductorIngredientes,
  ) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
  ): Promise<AlimentoNutricional[]> {
    const creds = await this.resolverFatSecret();
    if (!creds) {
      return filtrarAlimentos(await this.respaldo.buscar(termino, limite), criterio);
    }

    const consulta = this.traductor ? await this.traductor.aIngles(termino) : termino;
    const resultados = await this.fatsecret.buscar(creds, consulta, limite);

    // Sin resultados (o error de FatSecret) → OFF con el término original (español).
    if (resultados.length === 0) {
      return filtrarAlimentos(await this.respaldo.buscar(termino, limite), criterio);
    }

    const traducidos = this.traductor
      ? await this.traducirNombres(resultados)
      : resultados;

    // Filtramos después de traducir: así `excluirTexto` se evalúa en español.
    return filtrarAlimentos(traducidos, criterio);
  }

  private async traducirNombres(
    resultados: AlimentoNutricional[],
  ): Promise<AlimentoNutricional[]> {
    const nombres = await this.traductor!.aEspanol(resultados.map((r) => r.nombre));
    return resultados.map((r, i) => ({ ...r, nombre: nombres[i] ?? r.nombre }));
  }

  private async resolverFatSecret(): Promise<ConfigFatSecret | null> {
    try {
      const c = await this.credenciales.obtener();
      if (c?.fatsecretClientId && c?.fatsecretClientSecret) {
        return { clientId: c.fatsecretClientId, clientSecret: c.fatsecretClientSecret };
      }
    } catch {
      // Sin alcance de inquilino → probamos el entorno.
    }
    return this.envFatSecret;
  }
}
