import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioAlimentosPropios } from "@/infraestructura/contenedor/contenedor";
import { parsearPlanillaAlimentos } from "@/infraestructura/nutricion/parsearPlanillaAlimentos";
import { importarAlimentosDto } from "@/aplicacion/dtos/alimentoPropio.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

// La subida del Excel va por route handler (multipart), nunca por tRPC.
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/alimentos/importar — importa la lista de alimentos del nutricionista
 * desde un Excel (.xlsx) o CSV. Reemplaza la lista anterior. Solo NUTRICIONISTA.
 */
export function POST(request: Request): Promise<NextResponse> {
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
      const formulario = await request.formData();
      const archivo = formulario.get("archivo");
      if (!(archivo instanceof File)) {
        return NextResponse.json(
          { error: "Falta el archivo." },
          { status: 400 },
        );
      }
      if (archivo.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "El archivo supera los 8 MB." },
          { status: 400 },
        );
      }

      const contenido = Buffer.from(await archivo.arrayBuffer());
      const filas = await parsearPlanillaAlimentos(contenido, archivo.name);

      const validado = importarAlimentosDto.safeParse(filas);
      if (!validado.success) {
        return NextResponse.json(
          {
            error: "La planilla tiene valores inválidos.",
            detalles: validado.error.flatten(),
          },
          { status: 400 },
        );
      }

      const { importados } = await servicioAlimentosPropios().importar(
        validado.data,
      );
      return NextResponse.json({ importados }, { status: 201 });
    } catch (error) {
      // Antes se devolvía `error.message` tal cual. Eso está bien para el
      // mensaje que escribimos nosotros ("falta la columna Nombre"), pero
      // también reenviaba al cliente lo que tirara el lector de Excel ante un
      // archivo corrupto: rutas internas, nombres de módulo y detalles del
      // parser. `aRespuestaError` deja pasar los errores de dominio —que son
      // los redactados para el usuario— y reemplaza el resto por un mensaje
      // genérico, registrando el original en el servidor.
      return aRespuestaError(error);
    }
  });
}
