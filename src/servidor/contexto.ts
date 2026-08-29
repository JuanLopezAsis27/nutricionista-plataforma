import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import {
  servicioPaciente,
  servicioTurno,
  servicioArchivo,
  servicioEvaluacion,
  servicioDiario,
  servicioReceta,
  servicioPlan,
  servicioNutricion,
  servicioAlimentosPropios,
  servicioObjetivo,
  servicioBiblioteca,
  servicioSeguimiento,
  servicioSecretaria,
  servicioEstadisticas,
  servicioMensajeria,
  servicioNotificaciones,
  servicioConfiguracion,
  servicioAxiomas,
  servicioTracking,
  servicioMetricas,
  servicioCredenciales,
  servicioSuperAdmin,
  servicioIntegraciones,
  servicioIA,
  servicioAutenticacion,
  servicioDeportivo,
  servicioWhatsapp,
  servicioRecordatorios,
  busEventos,
} from "@/infraestructura/contenedor/contenedor";
import type { RolUsuario } from "@/dominio/entidades/Usuario";

/** Usuario autenticado expuesto en el contexto (forma mínima y tipada). */
export interface UsuarioContexto {
  id: string;
  email: string;
  rol: RolUsuario;
  pacienteId: string | null;
  /** Inquilino: nutri = su id; paciente = id de su nutri; superadmin = null. */
  nutricionistaId: string | null;
}

/**
 * IP de origen de la request.
 *
 * Mismo criterio que en el login (ver lib/autenticacion/auth.ts): `X-Real-IP`
 * primero, porque lo escribe nuestro nginx con `$remote_addr` y pisa lo que
 * venga de afuera. El primer elemento de `X-Forwarded-For` lo elige el cliente,
 * así que como fallback se usa el ÚLTIMO, que es el que agregó el proxy.
 */
function ipDeSolicitud(peticion: Request | undefined): string {
  const real = peticion?.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const reenviada = peticion?.headers.get("x-forwarded-for");
  if (reenviada) {
    const partes = reenviada
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1]!;
  }
  return "desconocida";
}

/**
 * Crea el contexto de cada petición tRPC.
 *
 * Expone:
 *   - usuario / rol → leídos de Auth.js y revalidados contra la base
 *   - ip            → origen de la request, para los límites de tasa
 *   - los servicios de aplicación tomados del contenedor de DI
 *
 * La presentación accede a la lógica SIEMPRE a través de estos servicios,
 * nunca del dominio ni de Prisma directamente.
 *
 * Recibe la `Request` para poder leer la IP: los procedimientos públicos
 * (recuperación de contraseña) necesitan limitar por origen, y sin la petición
 * el contexto no tenía forma de saber quién llama.
 */
export async function crearContexto(peticion?: Request) {
  // `usuarioDeSesion` en vez de `auth()` a secas: además de leer el token,
  // revalida contra la base que la cuenta siga activa y con el mismo rol (ver
  // lib/autenticacion/sesion.ts). Con estrategia JWT esa es la única forma de
  // que dar de baja a alguien tenga efecto antes de que venza su token.
  //
  // El objeto `sesion` crudo de Auth.js ya no se expone: no lo leía ningún
  // router y exponerlo obligaba a resolver la sesión dos veces por request.
  const usuario: UsuarioContexto | null = await usuarioDeSesion();

  // El alcance de inquilino se fija en el entry point HTTP (conAlcanceDeSesion),
  // que envuelve toda la request en un AsyncLocalStorage.run — así el alcance
  // llega de forma confiable a los resolvers (enterWith acá no propagaba).

  return {
    usuario,
    rol: usuario?.rol ?? null,
    ip: ipDeSolicitud(peticion),
    // El bus se expone para la subscription de tiempo real (routers/tiempoReal).
    busEventos: busEventos(),
    servicios: {
      paciente: servicioPaciente(),
      turno: servicioTurno(),
      archivo: servicioArchivo(),
      evaluacion: servicioEvaluacion(),
      diario: servicioDiario(),
      receta: servicioReceta(),
      plan: servicioPlan(),
      nutricion: servicioNutricion(),
      alimentosPropios: servicioAlimentosPropios(),
      objetivo: servicioObjetivo(),
      biblioteca: servicioBiblioteca(),
      seguimiento: servicioSeguimiento(),
      secretaria: servicioSecretaria(),
      estadisticas: servicioEstadisticas(),
      mensajeria: servicioMensajeria(),
      notificaciones: servicioNotificaciones(),
      configuracion: servicioConfiguracion(),
      axiomas: servicioAxiomas(),
      tracking: servicioTracking(),
      metricas: servicioMetricas(),
      credenciales: servicioCredenciales(),
      superadmin: servicioSuperAdmin(),
      integraciones: servicioIntegraciones(),
      ia: servicioIA(),
      autenticacion: servicioAutenticacion(),
      deportivo: servicioDeportivo(),
      whatsapp: servicioWhatsapp(),
      recordatorios: servicioRecordatorios(),
    },
  };
}

export type Contexto = Awaited<ReturnType<typeof crearContexto>>;
