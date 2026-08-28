import { auth } from "@/lib/autenticacion/auth";
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
 * Crea el contexto de cada petición tRPC.
 *
 * Expone:
 *   - sesion / usuario / rol → leídos de Auth.js (null si no hay sesión)
 *   - los servicios de aplicación tomados del contenedor de DI
 *
 * La presentación accede a la lógica SIEMPRE a través de estos servicios,
 * nunca del dominio ni de Prisma directamente.
 */
export async function crearContexto() {
  const sesion = await auth();
  const usuario: UsuarioContexto | null = sesion?.user
    ? {
        id: sesion.user.id,
        email: sesion.user.email,
        rol: sesion.user.rol,
        pacienteId: sesion.user.pacienteId,
        nutricionistaId: sesion.user.nutricionistaId,
      }
    : null;

  // El alcance de inquilino se fija en el entry point HTTP (conAlcanceDeSesion),
  // que envuelve toda la request en un AsyncLocalStorage.run — así el alcance
  // llega de forma confiable a los resolvers (enterWith acá no propagaba).

  return {
    sesion,
    usuario,
    rol: usuario?.rol ?? null,
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
    },
  };
}

export type Contexto = Awaited<ReturnType<typeof crearContexto>>;
