/**
 * Verificación funcional de la migración 27 (integridad del modelo de datos).
 *
 * Corre contra una base descartable —NUNCA contra la de desarrollo— y
 * comprueba, sobre Postgres de verdad, lo que la auditoría decía que no estaba
 * garantizado: aislamiento entre consultorios, no solapamiento de turnos,
 * unicidades por inquilino y resolución de WhatsApp por índice.
 *
 * Uso:
 *   docker exec nutricionista_postgres psql -U nutricionista -d postgres \
 *     -c "DROP DATABASE IF EXISTS verificacion;" -c "CREATE DATABASE verificacion;"
 *   DATABASE_URL=...verificacion npx prisma migrate deploy
 *   DATABASE_URL=...verificacion npx tsx scripts/verificar-migracion-27.ts
 */
import { PrismaClienteSingleton } from "@/infraestructura/repositorios/PrismaClienteSingleton";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "@/infraestructura/multitenancy/contextoTenant";

const prisma = PrismaClienteSingleton.obtenerInstancia();

let ok = 0;
let fallos = 0;

async function comprobar(
  titulo: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
    console.log(`  ✔ ${titulo}`);
    ok += 1;
  } catch (error) {
    console.log(
      `  ✘ ${titulo}\n      ${(error as Error).message.split("\n")[0]}`,
    );
    fallos += 1;
  }
}

/** Falla si `fn` NO lanza (o si lanza algo que no menciona `contiene`). */
async function debeFallar(
  fn: () => Promise<unknown>,
  contiene: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const mensaje = (error as Error).message;
    if (!mensaje.includes(contiene)) {
      throw new Error(`falló, pero por otra razón: ${mensaje.split("\n")[0]}`);
    }
    return;
  }
  throw new Error(
    `se esperaba un error que mencionara «${contiene}», pero pasó`,
  );
}

async function crearInquilino(nombre: string): Promise<string> {
  const id = crypto.randomUUID();
  await ejecutarGlobal(async () => {
    await prisma.nutricionista.create({ data: { id } });
    await prisma.usuario.create({
      data: {
        id,
        nutricionistaId: id,
        email: `${nombre}@demo.com`,
        passwordHash: "hash",
        rol: "NUTRICIONISTA",
      },
    });
  });
  return id;
}

async function main(): Promise<void> {
  if (!/verificacion/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("Este script solo corre contra la base «verificacion».");
  }

  const nutriA = await crearInquilino("consultorio-a");
  const nutriB = await crearInquilino("consultorio-b");

  console.log("\nC-3 · El email del paciente es único POR INQUILINO");
  let pacienteA = "";
  let pacienteB = "";
  await comprobar(
    "la misma persona puede ser paciente de dos consultorios",
    async () => {
      pacienteA = crypto.randomUUID();
      pacienteB = crypto.randomUUID();
      await ejecutarEnNutricionista(nutriA, () =>
        prisma.paciente.create({
          data: {
            id: pacienteA,
            nutricionistaId: nutriA,
            nombre: "Ana",
            apellido: "García",
            email: "ana@mail.com",
            telefonoE164: "5491155554444",
          },
        }),
      );
      await ejecutarEnNutricionista(nutriB, () =>
        prisma.paciente.create({
          data: {
            id: pacienteB,
            nutricionistaId: nutriB,
            nombre: "Ana",
            apellido: "García",
            email: "ana@mail.com",
            telefonoE164: "5491155554444",
          },
        }),
      );
    },
  );
  await comprobar("pero no dos veces dentro del MISMO consultorio", () =>
    debeFallar(
      () =>
        ejecutarEnNutricionista(nutriA, () =>
          prisma.paciente.create({
            data: {
              id: crypto.randomUUID(),
              nutricionistaId: nutriA,
              nombre: "Otra",
              apellido: "Persona",
              email: "ana@mail.com",
            },
          }),
        ),
      "Unique constraint",
    ),
  );

  console.log("\nC-4 · El inquilino es una FK real");
  await comprobar("no se puede escribir con un inquilino inexistente", () =>
    debeFallar(
      () =>
        ejecutarEnNutricionista("inquilino-fantasma", () =>
          prisma.paciente.create({
            data: {
              id: crypto.randomUUID(),
              nutricionistaId: "inquilino-fantasma",
              nombre: "X",
              apellido: "Y",
              email: "x@y.com",
            },
          }),
        ),
      "Foreign key constraint",
    ),
  );

  console.log(
    "\nC-1 / A-1 · Las tablas hijas quedaron dentro del filtro de inquilino",
  );
  await comprobar("un archivo de A no se ve desde B", async () => {
    const archivoId = crypto.randomUUID();
    await ejecutarEnNutricionista(nutriA, () =>
      prisma.archivo.create({
        data: {
          id: archivoId,
          nutricionistaId: nutriA,
          clave: "labs/x.pdf",
          nombreOriginal: "x.pdf",
          mimeType: "application/pdf",
          tamanoBytes: 10,
          pacienteId: pacienteA,
        },
      }),
    );
    const desdeA = await ejecutarEnNutricionista(nutriA, () =>
      prisma.archivo.findUnique({ where: { id: archivoId } }),
    );
    const desdeB = await ejecutarEnNutricionista(nutriB, () =>
      prisma.archivo.findUnique({ where: { id: archivoId } }),
    );
    if (!desdeA) throw new Error("el dueño no ve su propio archivo");
    if (desdeB)
      throw new Error("FUGA: el otro consultorio ve el archivo por id");
  });

  await comprobar(
    "los no leídos de A no cuentan los mensajes de B",
    async () => {
      for (const [nutri, paciente] of [
        [nutriA, pacienteA],
        [nutriB, pacienteB],
      ] as const) {
        await ejecutarEnNutricionista(nutri, async () => {
          const conv = crypto.randomUUID();
          await prisma.conversacion.create({
            data: { id: conv, nutricionistaId: nutri, pacienteId: paciente },
          });
          await prisma.mensaje.create({
            data: {
              id: crypto.randomUUID(),
              nutricionistaId: nutri,
              conversacionId: conv,
              autorId: paciente,
              cuerpo: "hola",
            },
          });
        });
      }
      const noLeidosA = await ejecutarEnNutricionista(nutriA, () =>
        prisma.mensaje.count({ where: { leidoEn: null } }),
      );
      if (noLeidosA !== 1) {
        throw new Error(
          `FUGA: A cuenta ${noLeidosA} mensajes no leídos, debería contar 1`,
        );
      }
    },
  );

  console.log("\nM-1 · Arco exclusivo de archivos");
  await comprobar("un archivo no puede tener dos dueños", () =>
    debeFallar(
      () =>
        ejecutarEnNutricionista(nutriA, () =>
          prisma.archivo.create({
            data: {
              id: crypto.randomUUID(),
              nutricionistaId: nutriA,
              clave: "dos/duenos.pdf",
              nombreOriginal: "d.pdf",
              mimeType: "application/pdf",
              tamanoBytes: 1,
              pacienteId: pacienteA,
              recetaId: crypto.randomUUID(),
            },
          }),
        ),
      "archivos_un_solo_dueno",
    ),
  );

  console.log("\nC-5 · No solapamiento de turnos");
  const fecha = new Date(Date.UTC(2026, 8, 15));
  const turno = (
    hora: string,
    estado: "PENDIENTE" | "CANCELADO" = "PENDIENTE",
  ) =>
    ejecutarEnNutricionista(nutriA, () =>
      prisma.turno.create({
        data: {
          id: crypto.randomUUID(),
          nutricionistaId: nutriA,
          pacienteId: pacienteA,
          fecha,
          hora,
          duracionMinutos: 30,
          estado,
        },
      }),
    );
  await comprobar("se agenda el primer turno", async () => {
    await turno("09:00");
  });
  await comprobar("se rechaza uno que pisa al anterior", () =>
    debeFallar(() => turno("09:15"), "turnos_sin_solapamiento"),
  );
  await comprobar("se acepta uno pegado, sin superposición", async () => {
    await turno("09:30");
  });
  await comprobar("un CANCELADO libera el horario", async () => {
    await turno("09:00", "CANCELADO");
  });
  await comprobar(
    "el mismo horario en OTRO consultorio no molesta",
    async () => {
      await ejecutarEnNutricionista(nutriB, () =>
        prisma.turno.create({
          data: {
            id: crypto.randomUUID(),
            nutricionistaId: nutriB,
            pacienteId: pacienteB,
            fecha,
            hora: "09:00",
            duracionMinutos: 30,
            estado: "PENDIENTE",
          },
        }),
      );
    },
  );

  console.log("\nM-7 · Un solo plan activo por paciente");
  await comprobar("la segunda asignación activa se rechaza", async () => {
    const planId = crypto.randomUUID();
    await ejecutarEnNutricionista(nutriA, async () => {
      await prisma.planNutricional.create({
        data: { id: planId, nutricionistaId: nutriA, nombre: "Plan 1" },
      });
      await prisma.asignacionPlan.create({
        data: {
          id: crypto.randomUUID(),
          nutricionistaId: nutriA,
          planId,
          nombrePlan: "Plan 1",
          pacienteId: pacienteA,
          fechaInicio: fecha,
          activa: true,
        },
      });
    });
    await debeFallar(
      () =>
        ejecutarEnNutricionista(nutriA, () =>
          prisma.asignacionPlan.create({
            data: {
              id: crypto.randomUUID(),
              nutricionistaId: nutriA,
              planId,
              nombrePlan: "Plan 1",
              pacienteId: pacienteA,
              fechaInicio: fecha,
              activa: true,
            },
          }),
        ),
      // Prisma traduce el índice único parcial a P2002 con el campo, no con
      // el nombre del índice.
      "Unique constraint failed on the fields: (`pacienteId`)",
    );
  });

  console.log("\nA-3 · WhatsApp resuelve por índice, no barriendo la tabla");
  await comprobar(
    "encuentra al paciente por su E.164 dentro del inquilino",
    async () => {
      const encontrado = await ejecutarEnNutricionista(nutriA, () =>
        prisma.paciente.findFirst({ where: { telefonoE164: "5491155554444" } }),
      );
      if (encontrado?.id !== pacienteA)
        throw new Error("no resolvió al paciente correcto");
    },
  );
  await comprobar("el plan de ejecución usa el índice único", async () => {
    const plan = await ejecutarEnNutricionista(nutriA, () =>
      prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN SELECT * FROM pacientes WHERE "nutricionistaId" = '${nutriA}' AND "telefonoE164" = '5491155554444'`,
      ),
    );
    const texto = plan.map((f) => f["QUERY PLAN"]).join(" ");
    if (!/Index/i.test(texto)) throw new Error(`no usa índice: ${texto}`);
  });

  console.log("\nA-4 · El archivado se escribe de verdad");
  await comprobar("un paciente archivado sale de los listados", async () => {
    await ejecutarEnNutricionista(nutriA, () =>
      prisma.paciente.update({
        where: { id: pacienteA },
        data: { archivadoEn: new Date(), motivoArchivado: "se mudó" },
      }),
    );
    const vigentes = await ejecutarEnNutricionista(nutriA, () =>
      prisma.paciente.count({ where: { archivadoEn: null } }),
    );
    if (vigentes !== 0)
      throw new Error(`quedaron ${vigentes} vigentes, debería ser 0`);
  });

  console.log("\nA-6 · Credenciales por fila (migración 28)");
  const { PrismaRepositorioCredenciales } =
    await import("@/infraestructura/repositorios/PrismaRepositorioCredenciales");
  const { CifradorTokens } =
    await import("@/infraestructura/seguridad/CifradorTokens");
  const credenciales = new PrismaRepositorioCredenciales(
    prisma,
    new CifradorTokens("0".repeat(64)),
  );

  await comprobar(
    "guarda y devuelve las credenciales sin perder nada",
    async () => {
      await ejecutarEnNutricionista(nutriA, () =>
        credenciales.guardar({
          proveedorIA: "OPENROUTER",
          anthropicApiKey: "sk-secreta",
          anthropicModelo: "modelo-x",
          fatsecretClientId: "fs-id",
          whatsappToken: "wa-token",
          whatsappPhoneNumberId: "111222333",
          whatsappAppSecret: "app-secret",
          criterios: {
            excluirMarcas: true,
            requiereMacros: false,
            maxCaloriasPor100: 500,
            excluirTexto: ["light"],
          },
        }),
      );
      const l = await ejecutarEnNutricionista(nutriA, () =>
        credenciales.obtener(),
      );
      if (l?.anthropicApiKey !== "sk-secreta")
        throw new Error("se perdió la clave de IA");
      if (l.proveedorIA !== "OPENROUTER")
        throw new Error("se perdió el proveedor");
      if (l.anthropicModelo !== "modelo-x")
        throw new Error("se perdió el modelo");
      if (l.fatsecretClientId !== "fs-id")
        throw new Error("se perdió FatSecret");
      if (l.whatsappPhoneNumberId !== "111222333")
        throw new Error("se perdió el número");
      if (l.criterios.maxCaloriasPor100 !== 500)
        throw new Error("se perdieron los criterios");
      if (l.criterios.excluirTexto[0] !== "light")
        throw new Error("se perdió el filtro de texto");
    },
  );

  await comprobar(
    "los secretos quedan cifrados en la base, el número no",
    async () => {
      const filas = await ejecutarGlobal(() =>
        prisma.credencialProveedor.findMany({
          where: { nutricionistaId: nutriA },
        }),
      );
      const token = filas.find((f) => f.clave === "TOKEN");
      const numero = filas.find((f) => f.clave === "PHONE_NUMBER_ID");
      if (!token || token.valor === "wa-token")
        throw new Error("el token quedó en claro");
      if (numero?.valor !== "111222333")
        throw new Error("el phone_number_id debe ir en claro");
    },
  );

  await comprobar(
    "el ruteo del webhook resuelve al inquilino por índice",
    async () => {
      const { DirectorioWhatsapp } =
        await import("@/infraestructura/whatsapp/DirectorioWhatsapp");
      const directorio = new DirectorioWhatsapp(
        prisma,
        new CifradorTokens("0".repeat(64)),
      );
      const inquilino = await directorio.porPhoneNumberId("111222333");
      if (inquilino?.nutricionistaId !== nutriA)
        throw new Error("no resolvió al inquilino dueño");
      if (inquilino.appSecret !== "app-secret")
        throw new Error("no descifró el app secret");

      const plan = await ejecutarGlobal(() =>
        prisma.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
          "EXPLAIN SELECT * FROM credenciales_proveedor WHERE proveedor = 'WHATSAPP' AND clave = 'PHONE_NUMBER_ID' AND valor = '111222333'",
        ),
      );
      const texto = plan.map((f) => f["QUERY PLAN"]).join(" ");
      if (!/Index/i.test(texto)) throw new Error(`no usa índice: ${texto}`);
    },
  );

  await comprobar(
    "borrar un secreto no se lleva puestos los demás",
    async () => {
      await ejecutarEnNutricionista(nutriA, () =>
        credenciales.guardar({ whatsappToken: "" }),
      );
      const l = await ejecutarEnNutricionista(nutriA, () =>
        credenciales.obtener(),
      );
      if (l?.whatsappToken !== null) throw new Error("el token no se borró");
      if (l.fatsecretClientId !== "fs-id") throw new Error("se borró de más");
    },
  );

  await comprobar("agregar un proveedor nuevo no toca el esquema", async () => {
    // Es el punto del refactor: antes esto era un ALTER TABLE.
    await ejecutarEnNutricionista(nutriB, () =>
      prisma.credencialProveedor.create({
        data: {
          nutricionistaId: nutriB,
          proveedor: "FATSECRET",
          clave: "CLAVE_INVENTADA",
          valor: "x",
        },
      }),
    );
  });

  console.log(`\n${ok} comprobaciones OK, ${fallos} fallidas.`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
