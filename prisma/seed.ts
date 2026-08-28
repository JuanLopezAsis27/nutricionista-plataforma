/**
 * Semilla de datos inicial. Idempotente: se puede correr varias veces.
 *
 *  1. Usuario SUPERADMIN (gestiona todas las cuentas; global, sin inquilino).
 *  2. Un NUTRICIONISTA demo (es su propio inquilino: nutricionistaId = su id).
 *  3. Para ese nutricionista: sus plantillas de email, su configuración y
 *     axiomas de ejemplo (sembrados DENTRO de su alcance de inquilino).
 *
 * Ejecutar con: npm run db:seed
 *
 * Credenciales (configurables por entorno):
 *   SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (default: admin@demo.com / cambiar123)
 *   SEED_EMAIL       / SEED_PASSWORD       (default: nutricionista@demo.com / cambiar123)
 */
import bcrypt from "bcryptjs";
import { PrismaClienteSingleton } from "../src/infraestructura/repositorios/PrismaClienteSingleton";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "../src/infraestructura/multitenancy/contextoTenant";
import { inquilinoActual } from "../src/infraestructura/multitenancy/inquilino";
import { Usuario } from "../src/dominio/entidades/Usuario";
import { PlantillaEmail } from "../src/dominio/entidades/PlantillaEmail";
import { AxiomaNutricional } from "../src/dominio/entidades/AxiomaNutricional";

const prisma = PrismaClienteSingleton.obtenerInstancia();

async function sembrarSuperAdmin(): Promise<void> {
  const email = (process.env.SUPERADMIN_EMAIL ?? "admin@demo.com").trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? "cambiar123";

  if (await prisma.usuario.findUnique({ where: { email } })) {
    console.log(`✔ El superadmin «${email}» ya existe.`);
    return;
  }
  const usuario = Usuario.crear(
    {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol: "SUPERADMIN",
      pacienteId: null,
      nutricionistaId: null,
    },
    crypto.randomUUID(),
  );
  const d = usuario.aPrimitivos();
  await prisma.usuario.create({
    data: {
      id: d.id,
      email: d.email,
      passwordHash: d.passwordHash,
      rol: d.rol,
      pacienteId: null,
      nutricionistaId: null,
      activo: true,
      creadoEn: d.creadoEn,
    },
  });
  console.log(`✔ SUPERADMIN creado: ${email}  (contraseña: ${password})`);
}

async function sembrarNutricionista(): Promise<string | null> {
  const email = (process.env.SEED_EMAIL ?? "nutricionista@demo.com").trim().toLowerCase();
  const password = process.env.SEED_PASSWORD ?? "cambiar123";

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`✔ El nutricionista «${email}» ya existe.`);
    return existente.id;
  }
  const id = crypto.randomUUID();
  // El inquilino primero: `usuarios.nutricionistaId` es FK a `nutricionistas`.
  await prisma.nutricionista.create({ data: { id } });
  const usuario = Usuario.crear(
    {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      rol: "NUTRICIONISTA",
      pacienteId: null,
      nutricionistaId: id, // el nutricionista es su propio inquilino
    },
    id,
  );
  const d = usuario.aPrimitivos();
  await prisma.usuario.create({
    data: {
      id: d.id,
      email: d.email,
      passwordHash: d.passwordHash,
      rol: d.rol,
      pacienteId: null,
      nutricionistaId: d.nutricionistaId,
      activo: true,
      creadoEn: d.creadoEn,
    },
  });
  console.log(`✔ NUTRICIONISTA creado: ${email}  (contraseña: ${password})`);
  return id;
}

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
];

async function sembrarPlantillas(): Promise<void> {
  for (const datos of PLANTILLAS_SISTEMA) {
    if (await prisma.plantillaEmail.findFirst({ where: { clave: datos.clave } })) continue;
    const plantilla = PlantillaEmail.crear({ ...datos, deSistema: true }, crypto.randomUUID());
    const d = plantilla.aPrimitivos();
    await prisma.plantillaEmail.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        clave: d.clave,
        nombre: d.nombre,
        asunto: d.asunto,
        cuerpoHtml: d.cuerpoHtml,
        descripcion: d.descripcion,
        deSistema: d.deSistema,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
      },
    });
    console.log(`  ✔ Plantilla de sistema: ${datos.clave}`);
  }
}

async function sembrarConfiguracion(): Promise<void> {
  if (await prisma.configuracionConsultorio.findFirst()) return;
  await prisma.configuracionConsultorio.create({
    data: { nutricionistaId: inquilinoActual(), diasAtencion: [1, 2, 3, 4, 5] },
  });
  console.log("  ✔ Configuración por defecto");
}

const AXIOMAS_EJEMPLO = [
  { ambito: "SUENO" as const, parametro: "horasSueno", operador: "MAYOR_IGUAL" as const, valor: 7, unidad: "h", texto: "Dormir al menos 7 horas favorece la recuperación y el control del peso.", prioridad: 10 },
  { ambito: "HIDRATACION" as const, parametro: "aguaMl", operador: "MAYOR_IGUAL" as const, valor: 2000, unidad: "ml", texto: "Tomar al menos 2 litros de agua por día mantiene una buena hidratación.", prioridad: 8 },
  { ambito: "ACTIVIDAD" as const, parametro: "actividadMinutosDia", operador: "MAYOR_IGUAL" as const, valor: 30, unidad: "min", texto: "Al menos 30 minutos de actividad física por día mejoran la composición corporal.", prioridad: 6 },
];

async function sembrarAxiomas(): Promise<void> {
  if ((await prisma.axiomaNutricional.count()) > 0) return;
  for (const datos of AXIOMAS_EJEMPLO) {
    const axioma = AxiomaNutricional.crear(datos, crypto.randomUUID());
    const d = axioma.aPrimitivos();
    await prisma.axiomaNutricional.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        ambito: d.ambito,
        parametro: d.parametro,
        operador: d.operador,
        valor: d.valor,
        valorMax: d.valorMax,
        unidad: d.unidad,
        texto: d.texto,
        prioridad: d.prioridad,
        activo: d.activo,
        creadoEn: d.creadoEn,
      },
    });
  }
  console.log(`  ✔ ${AXIOMAS_EJEMPLO.length} axiomas de ejemplo`);
}

async function principal(): Promise<void> {
  await ejecutarGlobal(async () => {
    await sembrarSuperAdmin();
    const nutriId = await sembrarNutricionista();
    if (nutriId) {
      // Config/plantillas/axiomas se siembran DENTRO del alcance del inquilino.
      await ejecutarEnNutricionista(nutriId, async () => {
        await sembrarPlantillas();
        await sembrarConfiguracion();
        await sembrarAxiomas();
      });
    }
  });
}

principal()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
