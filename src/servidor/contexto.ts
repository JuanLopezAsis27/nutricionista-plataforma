import { auth } from "@/lib/autenticacion/auth";
import {
  servicioPaciente,
  servicioTurno,
  servicioArchivo,
  servicioEvaluacion,
  servicioDiario,
  servicioReceta,
  servicioPlan,
  servicioObjetivo,
  servicioBiblioteca,
  servicioSeguimiento,
} from "@/infraestructura/contenedor/contenedor";
import type { RolUsuario } from "@/dominio/entidades/Usuario";

/** Usuario autenticado expuesto en el contexto (forma mínima y tipada). */
export interface UsuarioContexto {
  id: string;
  email: string;
  rol: RolUsuario;
  pacienteId: string | null;
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
      }
    : null;

  return {
    sesion,
    usuario,
    rol: usuario?.rol ?? null,
    servicios: {
      paciente: servicioPaciente,
      turno: servicioTurno,
      archivo: servicioArchivo,
      evaluacion: servicioEvaluacion,
      diario: servicioDiario,
      receta: servicioReceta,
      plan: servicioPlan,
      objetivo: servicioObjetivo,
      biblioteca: servicioBiblioteca,
      seguimiento: servicioSeguimiento,
    },
  };
}

export type Contexto = Awaited<ReturnType<typeof crearContexto>>;
