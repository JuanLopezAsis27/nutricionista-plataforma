import {
  PROVEEDORES_CLAVE_IA,
  type IConfiguracionIAGlobalRepositorio,
  type ProveedorClaveIA,
} from "@/dominio/repositorios/IConfiguracionIAGlobalRepositorio";
import type {
  IRegistroUsoIARepositorio,
  RegistroUsoIA,
  ResumenUsoIA,
} from "@/dominio/repositorios/IRegistroUsoIARepositorio";
import type {
  IConsultorSaldoIA,
  SaldoIA,
} from "@/dominio/servicios/IConsultorSaldoIA";
import type {
  EstadoIAPlataformaDto,
  GuardarIAPlataformaDto,
  RegistrosUsoIADto,
} from "../dtos/iaPlataforma.dto";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * La IA de la PLATAFORMA, vista por el SUPERADMIN: las claves de Anthropic,
 * OpenRouter y OpenAI que usan todos los consultorios, qué proveedor y modelo
 * usa cada capacidad, cuánto saldo le queda a cada clave y en qué se gastó.
 *
 * Los consultorios ya no cargan claves (migración 71): lo único suyo son los
 * prompts, que siguen en `ServicioPromptsIA`.
 */
export class ServicioIAPlataforma {
  constructor(
    private readonly configuracion: IConfiguracionIAGlobalRepositorio,
    private readonly registro: IRegistroUsoIARepositorio,
    private readonly saldo: IConsultorSaldoIA,
  ) {}

  async obtenerEstado(): Promise<EstadoIAPlataformaDto> {
    const c = await this.configuracion.obtener();
    return {
      claves: PROVEEDORES_CLAVE_IA.map((proveedor) => ({
        proveedor,
        configurada: Boolean(c.claves[proveedor]),
      })),
      proveedorIA: c.proveedorIA,
      modeloIA: c.modeloIA,
      proveedorTranscripcion: c.proveedorTranscripcion,
      modeloTranscripcion: c.modeloTranscripcion,
      iaActiva: Boolean(c.claves[c.proveedorIA]),
      transcripcionActiva: Boolean(c.claves[c.proveedorTranscripcion]),
    };
  }

  guardar(datos: GuardarIAPlataformaDto): Promise<void> {
    // Una clave vacía es "no la cambies": el formulario no la tiene para
    // re-enviarla. Borrar es `eliminarClave`, una intención aparte.
    const claves: Partial<Record<ProveedorClaveIA, string>> = {};
    for (const proveedor of PROVEEDORES_CLAVE_IA) {
      const valor = datos.claves?.[proveedor]?.trim();
      if (valor) claves[proveedor] = valor;
    }
    return this.configuracion.guardar({
      claves,
      proveedorIA: datos.proveedorIA,
      modeloIA: datos.modeloIA,
      proveedorTranscripcion: datos.proveedorTranscripcion,
      modeloTranscripcion: datos.modeloTranscripcion,
    });
  }

  eliminarClave(proveedor: ProveedorClaveIA): Promise<void> {
    return this.configuracion.guardar({ claves: { [proveedor]: null } });
  }

  /** Cada clave, contra su proveedor. En paralelo: son tres llamadas lentas. */
  async consultarSaldos(): Promise<SaldoIA[]> {
    const c = await this.configuracion.obtener();
    return Promise.all(
      PROVEEDORES_CLAVE_IA.map((proveedor) =>
        this.saldo.consultar(proveedor, c.claves[proveedor]),
      ),
    );
  }

  resumirUso(dias: number, ahora: Date = new Date()): Promise<ResumenUsoIA> {
    return this.registro.resumir(new Date(ahora.getTime() - dias * MS_POR_DIA));
  }

  listarRegistros(
    filtro: RegistrosUsoIADto,
  ): Promise<{ registros: RegistroUsoIA[]; total: number }> {
    return this.registro.listar(filtro);
  }
}
