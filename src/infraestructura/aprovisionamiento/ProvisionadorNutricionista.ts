import type { IProvisionadorNutricionista } from "@/dominio/servicios/IProvisionadorNutricionista";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { Establecimiento } from "@/dominio/entidades/Establecimiento";
import { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import {
  PlantillaWhatsapp,
  CUERPO_RECORDATORIO_POR_DEFECTO,
  NOMBRE_PLANTILLA_POR_DEFECTO,
  VARIABLES_RECORDATORIO,
} from "@/dominio/entidades/PlantillaWhatsapp";
import {
  PlantillaEmailRecordatorio,
  ASUNTO_RECORDATORIO_POR_DEFECTO,
  CUERPO_RECORDATORIO_EMAIL_POR_DEFECTO,
} from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";

/** Plantillas de sistema que arranca cada nutricionista nuevo. */
const PLANTILLAS_SISTEMA = [
  {
    clave: "BIENVENIDA",
    nombre: "Bienvenida al paciente",
    asunto: "¡Bienvenido/a, {{paciente}}!",
    descripcion: "Mensaje de bienvenida para nuevos pacientes.",
    cuerpoHtml: `<div style="font-family:sans-serif;color:#222;line-height:1.5">
  <p>Hola <strong>{{paciente}}</strong>,</p>
  <p>¡Bienvenido/a! Ya podés acceder a tu portal para ver tu plan, tus turnos y cargar tu diario.</p>
  <p>Cualquier duda, escribinos.</p>
  <p>Saludos,<br/>{{profesional}}</p>
</div>`,
  },
  {
    clave: "BIENVENIDA_CUENTA_EXISTENTE",
    nombre: "Bienvenida (ya tiene cuenta)",
    asunto: "¡Bienvenido/a, {{paciente}}!",
    descripcion:
      "Bienvenida para pacientes que ya tenían cuenta en la plataforma (sin contraseña).",
    cuerpoHtml: `<div style="font-family:sans-serif;color:#222;line-height:1.5">
  <p>Hola <strong>{{paciente}}</strong>,</p>
  <p>{{profesional}} te sumó a su consultorio. Como ya tenés una cuenta, entrás con tu email ({{email}}) y la contraseña que ya usás.</p>
  <p>Si te atendés con más de un profesional, al entrar vas a poder elegir en qué consultorio trabajar.</p>
  <p>Saludos,<br/>{{profesional}}</p>
</div>`,
  },
] as const;

/** Axiomas de ejemplo con los que arranca la base de conocimiento del nutri. */
const AXIOMAS_EJEMPLO = [
  {
    ambito: "SUENO" as const,
    parametro: "horasSueno",
    operador: "MAYOR_IGUAL" as const,
    valor: 7,
    unidad: "h",
    texto:
      "Dormir al menos 7 horas favorece la recuperación y el control del peso.",
    prioridad: 10,
  },
  {
    ambito: "HIDRATACION" as const,
    parametro: "aguaMl",
    operador: "MAYOR_IGUAL" as const,
    valor: 2000,
    unidad: "ml",
    texto:
      "Tomar al menos 2 litros de agua por día mantiene una buena hidratación.",
    prioridad: 8,
  },
  {
    ambito: "ACTIVIDAD" as const,
    parametro: "actividadMinutosDia",
    operador: "MAYOR_IGUAL" as const,
    valor: 30,
    unidad: "min",
    texto:
      "Al menos 30 minutos de actividad física por día mejoran la composición corporal.",
    prioridad: 6,
  },
];

/**
 * Siembra los datos por defecto de un nutricionista recién creado, DENTRO de su
 * alcance de inquilino (la extensión de Prisma les asigna su `nutricionistaId`).
 */
export class ProvisionadorNutricionista implements IProvisionadorNutricionista {
  constructor(
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly establecimientos: IEstablecimientoRepositorio,
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly axiomas: IAxiomaRepositorio,
    private readonly plantillasWhatsapp: IPlantillaWhatsappRepositorio,
    private readonly plantillasEmailRecordatorio: IPlantillaEmailRecordatorioRepositorio,
    private readonly configRecordatorios: IConfiguracionRecordatoriosRepositorio,
  ) {}

  async aprovisionar(nutricionistaId: string): Promise<void> {
    await ejecutarEnNutricionista(nutricionistaId, async () => {
      await this.configuracion.guardar(ConfiguracionConsultorio.porDefecto());

      // La sede principal, que es la contraparte del backfill de la migración
      // 48: los consultorios que ya existían recibieron la suya ahí, y los
      // nuevos la reciben acá. Sin ninguna, agendar un turno no tendría dónde,
      // y desde la 49 además es la que decide días y horarios de atención.
      // Arranca de lunes a viernes, que era el default histórico del
      // consultorio y sigue siendo el caso más común.
      await this.establecimientos.crear(
        Establecimiento.crear({
          nombre: "Consultorio principal",
          diasAtencion: [1, 2, 3, 4, 5],
        }).marcarPrincipal(true),
      );

      for (const datos of PLANTILLAS_SISTEMA) {
        await this.plantillas.crear(
          PlantillaEmail.crear(
            { ...datos, deSistema: true },
            crypto.randomUUID(),
          ),
        );
      }
      for (const datos of AXIOMAS_EJEMPLO) {
        await this.axiomas.crear(
          AxiomaNutricional.crear(datos, crypto.randomUUID()),
        );
      }

      // Recordatorios: la política por defecto y UNA plantilla de WhatsApp
      // marcada como predeterminada. Sin predeterminada el envío automático no
      // manda nada, y eso se descubre el día en que los avisos no salieron.
      // La plantilla arranca sin `claveMeta` porque aprobarla en Meta es un
      // trámite del profesional: sirve igual para el enlace wa.me y para la
      // vista previa, y la pantalla dice qué falta para que salga sola.
      await this.configRecordatorios.guardar(
        ConfiguracionRecordatorios.porDefecto(),
      );
      await this.plantillasWhatsapp.crear(
        PlantillaWhatsapp.crear(
          {
            nombre: NOMBRE_PLANTILLA_POR_DEFECTO,
            cuerpo: CUERPO_RECORDATORIO_POR_DEFECTO,
            claveMeta: null,
            idiomaMeta: "es_AR",
            variablesMeta: [...VARIABLES_RECORDATORIO],
            diasAntes: null,
            predeterminada: true,
            activa: true,
          },
          crypto.randomUUID(),
        ),
      );
      // Mismo criterio del lado del email: una plantilla predeterminada, sin
      // día asignado, así el barrido tiene con qué mandar desde el arranque.
      await this.plantillasEmailRecordatorio.crear(
        PlantillaEmailRecordatorio.crear(
          {
            nombre: NOMBRE_PLANTILLA_POR_DEFECTO,
            asunto: ASUNTO_RECORDATORIO_POR_DEFECTO,
            cuerpoHtml: CUERPO_RECORDATORIO_EMAIL_POR_DEFECTO,
            diasAntes: null,
            predeterminada: true,
            activa: true,
            incluirBotonConfirmacion: true,
          },
          crypto.randomUUID(),
        ),
      );
    });
  }
}
