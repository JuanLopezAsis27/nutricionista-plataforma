import type { IProvisionadorNutricionista } from "@/dominio/servicios/IProvisionadorNutricionista";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import {
  PlantillaWhatsapp,
  CUERPO_RECORDATORIO_POR_DEFECTO,
  NOMBRE_PLANTILLA_POR_DEFECTO,
  VARIABLES_RECORDATORIO,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";

/** Plantillas de sistema que arranca cada nutricionista nuevo. */
const PLANTILLAS_SISTEMA = [
  {
    clave: "RECORDATORIO_TURNO",
    nombre: "Recordatorio de turno",
    asunto: "Recordatorio de tu turno del {{fecha}}",
    descripcion: "Se envía automáticamente el día previo a cada turno.",
    cuerpoHtml: `<div style="font-family:sans-serif;color:#222;line-height:1.5">
  <p>Hola <strong>{{paciente}}</strong>,</p>
  <p>Te recordamos tu turno para el <strong>{{fecha}}</strong> a las <strong>{{hora}}</strong>.</p>
  <p>Si no podés asistir, avisanos con anticipación para reprogramarlo.</p>
  <p>Saludos,<br/>{{profesional}}</p>
</div>`,
  },
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
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly axiomas: IAxiomaRepositorio,
    private readonly plantillasWhatsapp: IPlantillaWhatsappRepositorio,
    private readonly configRecordatorios: IConfiguracionRecordatoriosRepositorio,
  ) {}

  async aprovisionar(nutricionistaId: string): Promise<void> {
    await ejecutarEnNutricionista(nutricionistaId, async () => {
      await this.configuracion.guardar(ConfiguracionConsultorio.porDefecto());
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
            predeterminada: true,
            activa: true,
          },
          crypto.randomUUID(),
        ),
      );
    });
  }
}
