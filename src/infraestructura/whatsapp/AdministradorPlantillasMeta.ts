import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type {
  DefinicionPlantillaMeta,
  EstadoPlantillaRemota,
  IAdministradorPlantillasMeta,
} from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { EstadoPlantillaMeta } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { obtenerConfigWhatsapp } from "./configWhatsapp";
import { estadoDesdeMeta, motivoDesdeMeta } from "./estadosPlantillaMeta";

const VERSION_API = "v21.0";
const TIEMPO_LIMITE_MS = 15000;
const RAIZ = `https://graph.facebook.com/${VERSION_API}`;
/** Tope de páginas al listar: una cuenta con miles de plantillas no es de este dominio. */
const MAX_PAGINAS = 10;

interface CredencialesAdministracion {
  token: string;
  wabaId: string;
}

interface ErrorMeta {
  message?: string;
  error_user_title?: string;
  error_user_msg?: string;
}

interface PlantillaListada {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  rejected_reason?: string;
}

/**
 * Administración de plantillas con la API de Meta (WhatsApp Business
 * Management API), sobre la cuenta de WhatsApp Business del consultorio.
 *
 * Se resuelve por llamada, como el proveedor de envío: las credenciales son
 * del inquilino en curso (cifradas), con las del entorno como respaldo.
 */
export class AdministradorPlantillasMeta implements IAdministradorPlantillasMeta {
  constructor(
    private readonly credenciales: ICredencialesIntegracionRepositorio,
  ) {}

  async disponible(): Promise<boolean> {
    return (await this.resolver()) != null;
  }

  async crear(
    definicion: DefinicionPlantillaMeta,
  ): Promise<{ idMeta: string; estado: EstadoPlantillaMeta }> {
    const c = await this.exigir();
    const respuesta = await this.pedir<{ id?: string; status?: string }>(
      c,
      `${RAIZ}/${c.wabaId}/message_templates`,
      {
        method: "POST",
        body: JSON.stringify({
          name: definicion.nombre,
          language: definicion.idioma,
          category: definicion.categoria,
          components: componentes(definicion),
        }),
      },
    );
    if (!respuesta.id) {
      throw new Error("Meta no devolvió el id de la plantilla creada.");
    }
    return {
      idMeta: respuesta.id,
      estado: estadoDesdeMeta(respuesta.status) ?? "EN_REVISION",
    };
  }

  async editar(
    idMeta: string,
    definicion: DefinicionPlantillaMeta,
  ): Promise<void> {
    const c = await this.exigir();
    await this.pedir(c, `${RAIZ}/${idMeta}`, {
      method: "POST",
      body: JSON.stringify({
        category: definicion.categoria,
        components: componentes(definicion),
      }),
    });
  }

  async eliminar(nombre: string, idMeta: string): Promise<void> {
    const c = await this.exigir();
    const parametros = new URLSearchParams({ name: nombre, hsm_id: idMeta });
    await this.pedir(c, `${RAIZ}/${c.wabaId}/message_templates?${parametros}`, {
      method: "DELETE",
    });
  }

  async listar(): Promise<EstadoPlantillaRemota[]> {
    const c = await this.exigir();
    const resultado: EstadoPlantillaRemota[] = [];
    const parametros = new URLSearchParams({
      fields: "id,name,language,status,rejected_reason",
      limit: "100",
    });
    let url: string | undefined =
      `${RAIZ}/${c.wabaId}/message_templates?${parametros.toString()}`;

    for (let pagina = 0; url && pagina < MAX_PAGINAS; pagina += 1) {
      const respuesta: {
        data?: PlantillaListada[];
        paging?: { next?: string };
      } = await this.pedir(c, url, { method: "GET" });
      for (const p of respuesta.data ?? []) {
        const estado = estadoDesdeMeta(p.status);
        if (!p.id || !p.name || !p.language || !estado) continue;
        resultado.push({
          idMeta: p.id,
          nombre: p.name,
          idioma: p.language,
          estado,
          motivo: motivoDesdeMeta(p.rejected_reason),
        });
      }
      url = respuesta.paging?.next;
    }
    return resultado;
  }

  private async exigir(): Promise<CredencialesAdministracion> {
    const c = await this.resolver();
    if (!c) {
      throw new ErrorValidacion(
        "Para crear plantillas desde la app hay que cargar el ID de la cuenta de WhatsApp Business en Integraciones → WhatsApp.",
      );
    }
    return c;
  }

  private async resolver(): Promise<CredencialesAdministracion | null> {
    try {
      const c = await this.credenciales.obtener();
      if (c?.whatsappToken && c.whatsappWabaId) {
        return { token: c.whatsappToken, wabaId: c.whatsappWabaId };
      }
    } catch {
      // Sin alcance de inquilino o error de lectura → probamos el entorno.
    }
    const env = obtenerConfigWhatsapp();
    return env?.wabaId ? { token: env.token, wabaId: env.wabaId } : null;
  }

  private async pedir<T>(
    c: CredencialesAdministracion,
    url: string,
    init: { method: string; body?: string },
  ): Promise<T> {
    const respuesta = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
    const datos = (await respuesta.json().catch(() => ({}))) as T & {
      error?: ErrorMeta;
    };
    if (!respuesta.ok || datos.error) {
      const e = datos.error;
      const detalle =
        e?.error_user_msg ?? e?.message ?? `HTTP ${respuesta.status}`;
      // Un 4xx es algo que el profesional corrige (nombre repetido, formato,
      // permiso del token): va como error de validación, con lo que dijo Meta.
      // Un 5xx es de Meta y sale como error del sistema.
      if (respuesta.status >= 400 && respuesta.status < 500) {
        throw new ErrorValidacion(`Meta rechazó el pedido: ${detalle}`);
      }
      throw new Error(`Meta respondió con error: ${detalle}`);
    }
    return datos;
  }
}

/** Cuerpo y botones en el formato de componentes de la API de Meta. */
function componentes(d: DefinicionPlantillaMeta): Record<string, unknown>[] {
  const lista: Record<string, unknown>[] = [
    {
      type: "BODY",
      text: d.cuerpo,
      ...(d.ejemplosCuerpo.length > 0
        ? { example: { body_text: [d.ejemplosCuerpo] } }
        : {}),
    },
  ];
  if (d.botones.length > 0) {
    lista.push({
      type: "BUTTONS",
      buttons: d.botones.map((b) =>
        b.tipo === "QUICK_REPLY"
          ? { type: "QUICK_REPLY", text: b.texto }
          : {
              type: "URL",
              text: b.texto,
              url: b.url,
              ...(b.ejemplo ? { example: [b.ejemplo] } : {}),
            },
      ),
    });
  }
  return lista;
}
