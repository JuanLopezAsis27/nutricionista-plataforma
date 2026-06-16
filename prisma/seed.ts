/**
 * Semilla de datos inicial.
 *
 * Crea el primer usuario NUTRICIONISTA con su contraseña hasheada con bcrypt,
 * para poder iniciar sesión y comenzar a usar el sistema. Es idempotente: si
 * el usuario ya existe, no hace nada.
 *
 * Ejecutar con: npm run db:seed
 *
 * Credenciales (configurables por entorno):
 *   SEED_EMAIL    (default: nutricionista@demo.com)
 *   SEED_PASSWORD (default: cambiar123)
 */
import bcrypt from "bcryptjs";
import { PrismaClienteSingleton } from "../src/infraestructura/repositorios/PrismaClienteSingleton";
import { Usuario } from "../src/dominio/entidades/Usuario";

const prisma = PrismaClienteSingleton.obtenerInstancia();

async function principal(): Promise<void> {
  const email = (process.env.SEED_EMAIL ?? "nutricionista@demo.com").trim().toLowerCase();
  const password = process.env.SEED_PASSWORD ?? "cambiar123";

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`✔ El usuario «${email}» ya existe. No se crea de nuevo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Construye la entidad del dominio (valida invariantes: email, rol, etc.).
  const usuario = Usuario.crear(
    { email, passwordHash, rol: "NUTRICIONISTA", pacienteId: null },
    crypto.randomUUID(),
  );
  const datos = usuario.aPrimitivos();

  await prisma.usuario.create({
    data: {
      id: datos.id,
      email: datos.email,
      passwordHash: datos.passwordHash,
      rol: datos.rol,
      pacienteId: datos.pacienteId,
      creadoEn: datos.creadoEn,
    },
  });

  console.log(`✔ Usuario NUTRICIONISTA creado: ${email}`);
  console.log(`  Contraseña: ${password}  (cambiala después del primer ingreso)`);
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
