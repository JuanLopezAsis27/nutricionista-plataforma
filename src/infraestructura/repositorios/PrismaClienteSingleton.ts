import { PrismaClient } from "@prisma/client";
import { alcanceActual } from "@/infraestructura/multitenancy/contextoTenant";

/**
 * Singleton del cliente de Prisma con **aislamiento multi-inquilino**.
 *
 * En desarrollo, Next.js recarga los módulos en caliente y crearía múltiples
 * instancias de PrismaClient (agotando el pool de conexiones). Por eso se
 * cachea la instancia en el objeto global. Este archivo es el ÚNICO lugar,
 * junto a los repositorios, donde se importa Prisma.
 *
 * Multi-tenancy (F9): una extensión de Prisma filtra/asigna automáticamente
 * `nutricionistaId` en todas las tablas de inquilino según el alcance de la
 * request (ver contextoTenant). Es **fail-closed**: si no hay alcance fijado,
 * cualquier consulta a esas tablas lanza error (nunca devuelve datos de más).
 * Aprovecha `extendedWhereUnique` (GA en Prisma 6): permite sumar el filtro de
 * inquilino incluso a findUnique/update/delete junto al id.
 */
const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Tablas con columna `nutricionistaId` (inquilino).
 *
 * Debe coincidir con las back-relations del modelo `Nutricionista` en
 * schema.prisma: si un modelo tiene la columna y no está acá, sus consultas
 * por id NO se filtran por inquilino y se cruzan datos entre consultorios.
 */
export const MODELOS_INQUILINO = new Set<string>([
  "Paciente",
  "Usuario",
  "Suplemento",
  "AlertaSeguimiento",
  "Turno",
  "RegistroDiario",
  "HistoriaClinica",
  "AlertaAlimentaria",
  "Laboratorio",
  "Antropometria",
  "Receta",
  "PlanNutricional",
  "GrupoPlan",
  "GrupoReceta",
  "GrabacionConsulta",
  "ResumenConsulta",
  "MaterialBiblioteca",
  "Objetivo",
  "ObjetivoComposicion",
  "PlantillaAntropometrica",
  "CampoHistoriaClinica",
  "PerfilDeportivo",
  "Competencia",
  "PlantillaEmail",
  "EmailEnviado",
  "CuentaConectada",
  "Conversacion",
  "ConsultaIA",
  "ConversacionIA",
  "MensajeIA",
  "AnalisisComida",
  "ConfiguracionConsultorio",
  "AxiomaNutricional",
  "SincronizacionTurno",
  "MetricaDispositivo",
  "CredencialProveedor",
  "PreferenciasIntegracion",
  "AlimentoPropio",
  "RetroalimentacionInsight",
  "RecordatorioWhatsapp",
  "PlantillaWhatsapp",
  "ConfiguracionRecordatorios",
  "MensajeWhatsapp",

  // Hijas del agregado (migración 27). Antes quedaban fuera del filtro: se
  // llegaba a ellas por id directo sin ningún control de inquilino. Los casos
  // más visibles eran `Archivo` (el endpoint de descarga da acceso total al
  // rol NUTRICIONISTA) y `Mensaje` (contarNoLeidos sumaba sobre toda la tabla).
  "Archivo",
  "Mensaje",
  "ComidaConsumida",
  "ActividadFisica",
  "ComidaPlan",
  "OpcionComida",
  "EquivalenciaPlan",
  "RecomendacionPlan",
  "IngredienteReceta",
  "Estrategia",
  "HistorialObjetivo",
  "AsignacionPlan",
  "AsignacionReceta",
  "AsignacionMaterial",
]);

function crearCliente(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  const extendido = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELOS_INQUILINO.has(model)) {
            return query(args);
          }
          const alcance = alcanceActual();
          if (!alcance) {
            // Fail-closed: nunca consultar una tabla de inquilino sin alcance.
            throw new Error(
              `Acceso a "${model}" sin contexto de inquilino. Falta fijar el alcance (fijarAlcance / ejecutarEnNutricionista / ejecutarGlobal).`,
            );
          }
          if (alcance.tipo === "global") {
            return query(args);
          }

          const tenant = alcance.nutricionistaId;

          /* eslint-disable @typescript-eslint/no-explicit-any,
                            @typescript-eslint/no-unsafe-assignment,
                            @typescript-eslint/no-unsafe-member-access,
                            @typescript-eslint/no-unsafe-call,
                            @typescript-eslint/no-unsafe-argument
             --
             Excepción deliberada y acotada a este bloque.

             `$allOperations` recibe los args de CUALQUIERA de los ~900 tipos de
             operación que genera Prisma; no existe un tipo común que los cubra,
             y la manipulación de `data`/`where`/`create` es dinámica por
             diseño. Tiparlo "bien" exigiría una unión artificial que no
             describe nada real y que habría que mantener a mano contra el
             schema.

             El riesgo está cubierto donde importa: este es el mecanismo de
             aislamiento entre consultorios, es fail-closed (sin alcance
             lanza), y está verificado por PrismaClienteSingleton.test.ts y
             modelosInquilino.test.ts. Reescribirlo para satisfacer al linter
             sería tocar el punto más sensible del sistema sin ganar seguridad.

             El disable termina en el `eslint-enable` de abajo: no cubre nada
             fuera de esta transformación. */
          const a: any = args ?? {};

          if (operation === "create") {
            a.data = { ...a.data, nutricionistaId: tenant };
          } else if (operation === "createMany") {
            a.data = Array.isArray(a.data)
              ? a.data.map((d: Record<string, unknown>) => ({
                  ...d,
                  nutricionistaId: tenant,
                }))
              : { ...a.data, nutricionistaId: tenant };
          } else if (operation === "upsert") {
            a.where = { ...a.where, nutricionistaId: tenant };
            a.create = { ...a.create, nutricionistaId: tenant };
          } else {
            // find*/count/aggregate/groupBy/update/updateMany/delete/deleteMany
            a.where = { ...a.where, nutricionistaId: tenant };
          }
          return query(a);
          /* eslint-enable @typescript-eslint/no-explicit-any,
                           @typescript-eslint/no-unsafe-assignment,
                           @typescript-eslint/no-unsafe-member-access,
                           @typescript-eslint/no-unsafe-call,
                           @typescript-eslint/no-unsafe-argument */
        },
      },
    },
  });

  // La extensión solo agrega hooks de query; el cliente conserva la misma API.
  return extendido as unknown as PrismaClient;
}

export class PrismaClienteSingleton {
  private static instancia: PrismaClient | undefined;

  private constructor() {}

  static obtenerInstancia(): PrismaClient {
    if (!PrismaClienteSingleton.instancia) {
      PrismaClienteSingleton.instancia =
        globalParaPrisma.prisma ?? crearCliente();

      if (process.env.NODE_ENV !== "production") {
        globalParaPrisma.prisma = PrismaClienteSingleton.instancia;
      }
    }
    return PrismaClienteSingleton.instancia;
  }
}
