import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { armarRespaldo } from "@/servidor/respaldoZip";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";
// Un respaldo grande tarda: que ninguna plataforma lo corte por defecto.
export const maxDuration = 3600;

/**
 * GET /api/respaldo — el respaldo completo del consultorio en un ZIP: una
 * carpeta por paciente (evaluación, mediciones, diario, planes y todos sus
 * archivos) y una «Sin paciente» para el resto. Ver `docs/RESPALDO.md`.
 *
 * Solo NUTRICIONISTA, y solo de SU consultorio: lo acota el alcance de la
 * sesión, como a todo lo demás.
 */
export function GET(): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }
    if (usuario.rol !== "NUTRICIONISTA") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const zip = await armarRespaldo();
      const hoy = new Date().toISOString().slice(0, 10);
      return new NextResponse(Readable.toWeb(zip) as ReadableStream, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="respaldo-${hoy}.zip"`,
          "Cache-Control": "no-store",
          // Que nginx lo pase a medida que sale en vez de juntarlo entero.
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}
