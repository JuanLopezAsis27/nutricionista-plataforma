import { NextResponse } from "next/server";

import { unstable_update } from "@/lib/autenticacion/auth";
import { olvidarSesion, usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { recordarConsultorio } from "@/lib/autenticacion/consultorioActivo";
import { servicioAutenticacion } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { cambiarConsultorioDto } from "@/aplicacion/dtos/autenticacion.dto";
import { aRespuestaError } from "@/servidor/errores-http";

export const runtime = "nodejs";

/**
 * POST /api/autenticacion/consultorio — el paciente elige en qué consultorio
 * trabajar (migración 78, ver docs/CUENTAS-PACIENTE.md).
 *
 * Es un route handler y no una mutación de tRPC porque tiene que tocar dos
 * cookies: la del consultorio elegido (que se recuerda en el dispositivo) y la
 * de la sesión, que se reemite con `unstable_update` para que el JWT lleve la
 * ficha y el inquilino nuevos. Todo el resto de la app sigue leyendo
 * `pacienteId`/`nutricionistaId` de la sesión, como siempre.
 *
 * Tres filtros, del más barato al que decide:
 *   1. hay sesión y es de un PACIENTE;
 *   2. `CambiarConsultorioActivo` confirma que la ficha es de esa
 *      cuenta (si no, 403 y no se toca nada);
 *   3. el callback `jwt` de `auth.ts` vuelve a resolver la identidad desde la
 *      base al reemitir, así que ni siquiera este handler "decide" el token.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (usuario.rol !== "PACIENTE") {
      return NextResponse.json(
        { error: "Solo un paciente elige consultorio." },
        { status: 403 },
      );
    }

    const { pacienteId } = cambiarConsultorioDto.parse(await request.json());

    // Alcance global: la cuenta no es de ningún consultorio y la sesión puede
    // no tener ninguno elegido todavía. Solo lee.
    await ejecutarGlobal(() =>
      servicioAutenticacion().cambiarConsultorio(usuario.id, pacienteId),
    );

    await recordarConsultorio(pacienteId);
    // Una ficha recién vinculada puede no estar todavía en el caché de
    // `sesionSigueVigente`: sin esto, elegir un consultorio que se sumó hace
    // menos de un minuto cortaría la sesión en la request siguiente.
    olvidarSesion(usuario.id);
    await unstable_update({ user: { pacienteId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return aRespuestaError(error);
  }
}
