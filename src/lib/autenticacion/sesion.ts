import { auth } from "./auth";
import { repositorioUsuarioCompartido } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import type { RolUsuario } from "@/dominio/entidades/Usuario";

/**
 * Revalidación de la sesión contra la base de datos.
 *
 * ## El problema que resuelve
 *
 * La estrategia de sesión es JWT: el token lo firma el servidor y el navegador
 * lo presenta en cada request. Eso es rápido —no hay que ir a la base para
 * saber quién es— pero tiene una consecuencia que no se ve hasta que hace
 * falta: **no se puede revocar**. El callback `jwt` de Auth.js solo consulta la
 * base en el login; a partir de ahí el token vale por sí mismo hasta que vence.
 *
 * En la práctica eso significaba que desactivar una cuenta
 * (`CambiarEstadoNutricionista`) no echaba a nadie: el SUPERADMIN veía la
 * cuenta en "inactiva" y esa persona seguía leyendo historias clínicas con el
 * token que ya tenía. Con el `maxAge` por defecto de Auth.js, hasta 30 días.
 *
 * ## Cómo se resuelve
 *
 * Se vuelve a preguntar a la base en cada request, pero con un caché de vida
 * muy corta para que eso no cueste una consulta por request. El resultado es
 * un compromiso explícito:
 *
 *   - una baja tarda como mucho `TTL_MS` en hacerse efectiva (hoy 60 s), no 30
 *     días;
 *   - el costo en régimen es de una consulta por usuario por minuto, no una
 *     por request. Con un consultorio activo eso es ruido estadístico al lado
 *     de las consultas que la request ya hace igual.
 *
 * También detecta el **token rancio**: si el rol o el inquilino que viaja en el
 * JWT dejaron de coincidir con lo que dice la base, la sesión se corta. Sin
 * esto, degradar a alguien de NUTRICIONISTA a PACIENTE no le sacaba los
 * permisos viejos hasta que venciera el token.
 *
 * ## Por qué no vive en `auth.config.ts`
 *
 * Porque ese archivo lo importa `proxy.ts`, que corre en el Edge Runtime, donde
 * no hay Prisma. Por eso la revalidación se hace en el runtime Node, en los
 * puntos de entrada que sí tocan datos: el contexto de tRPC y los route
 * handlers de `/api/*`.
 */

/** Cuánto vale una respuesta cacheada antes de volver a preguntar. */
const TTL_MS = 60_000;

/** Techo del caché: si se pasa, se poda. Evita crecer sin límite. */
const MAX_ENTRADAS = 10_000;

interface EntradaCache {
  /** Instante (ms) hasta el cual esta respuesta sigue valiendo. */
  hasta: number;
  vigente: boolean;
  rol: RolUsuario | null;
  nutricionistaId: string | null;
}

const cache = new Map<string, EntradaCache>();

/** Usuario de la sesión, ya revalidado. */
export interface UsuarioSesion {
  id: string;
  email: string;
  rol: RolUsuario;
  pacienteId: string | null;
  nutricionistaId: string | null;
}

/**
 * Olvida lo que se sabía de un usuario, para que la próxima request vuelva a
 * preguntar. La llama el servicio que da de baja o cambia el rol de una cuenta,
 * y con eso el corte es inmediato en vez de esperar al TTL.
 */
export function olvidarSesion(usuarioId: string): void {
  cache.delete(usuarioId);
}

/** Vacía el caché entero (lo usan los tests). */
export function olvidarTodasLasSesiones(): void {
  cache.clear();
}

/**
 * ¿El usuario del token sigue habilitado, con el mismo rol e inquilino?
 *
 * Ante un fallo de la base **no corta la sesión**: devuelve `true` y no
 * cachea. La decisión es deliberada. Cortar sería fail-closed y suena mejor,
 * pero significaría que un hipo de Postgres desloguea a todo el mundo en el
 * medio de una consulta, y no compra seguridad real: si la base no responde, la
 * request no va a poder leer ni un dato de todos modos (la extensión de
 * inquilino falla cerrado, ver PrismaClienteSingleton).
 */
export async function sesionSigueVigente(usuario: {
  id: string;
  rol: RolUsuario;
  nutricionistaId: string | null;
}): Promise<boolean> {
  const ahora = Date.now();
  const cacheada = cache.get(usuario.id);

  if (cacheada && cacheada.hasta > ahora) {
    return (
      cacheada.vigente &&
      cacheada.rol === usuario.rol &&
      cacheada.nutricionistaId === usuario.nutricionistaId
    );
  }

  let registro;
  try {
    // Alcance global: el login todavía no resolvió inquilino y `Usuario` es una
    // tabla de inquilino, así que sin esto la extensión de Prisma falla cerrado.
    registro = await ejecutarGlobal(() =>
      repositorioUsuarioCompartido().obtenerPorId(usuario.id),
    );
  } catch {
    return true; // ver el comentario del encabezado
  }

  const entrada: EntradaCache = {
    hasta: ahora + TTL_MS,
    vigente: Boolean(registro?.activo),
    rol: registro?.rol ?? null,
    nutricionistaId: registro?.nutricionistaId ?? null,
  };

  if (cache.size >= MAX_ENTRADAS) podar(ahora);
  cache.set(usuario.id, entrada);

  return (
    entrada.vigente &&
    entrada.rol === usuario.rol &&
    entrada.nutricionistaId === usuario.nutricionistaId
  );
}

/**
 * La sesión actual, o `null` si no hay o si dejó de ser válida.
 *
 * Es el reemplazo de llamar a `auth()` directamente en cualquier punto de
 * entrada del runtime Node. Devolver `null` en vez de lanzar mantiene la forma
 * que ya esperan los llamadores (`if (!sesion) → 401`), así que sustituirlo no
 * cambia el comportamiento de ningún handler salvo en el caso que se quería
 * arreglar: el usuario dado de baja.
 */
export async function usuarioDeSesion(): Promise<UsuarioSesion | null> {
  const sesion = await auth();
  const usuario = sesion?.user;

  // Forma completa, no mera existencia: un objeto de sesión a medio poblar
  // —que es lo que produce el fail-open descrito en GHSA de @auth/core— no
  // alcanza para dar acceso.
  if (!usuario?.id || !usuario.rol) return null;

  if (!(await sesionSigueVigente(usuario))) return null;

  return {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    pacienteId: usuario.pacienteId,
    nutricionistaId: usuario.nutricionistaId,
  };
}

/** Elimina entradas vencidas para acotar la memoria. */
function podar(ahora: number): void {
  for (const [clave, entrada] of cache) {
    if (entrada.hasta <= ahora) cache.delete(clave);
  }
}
