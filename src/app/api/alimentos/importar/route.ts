import { NextResponse } from "next/server";
import { auth } from "@/lib/autenticacion/auth";
import { servicioAlimentosPropios } from "@/infraestructura/contenedor/contenedor";
import { parsearPlanillaAlimentos } from "@/infraestructura/nutricion/parsearPlanillaAlimentos";
import { importarAlimentosDto } from "@/aplicacion/dtos/alimentoPropio.dto";
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
    const sesion = await auth();
    if (!sesion?.user) {
      return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
    }
    if (sesion.user.rol !== "NUTRICIONISTA") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const formulario = await request.formData();
      const archivo = formulario.get("archivo");
      if (!(archivo instanceof File)) {
        return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
      }
      if (archivo.size > MAX_BYTES) {
        return NextResponse.json({ error: "El archivo supera los 8 MB." }, { status: 400 });
      }

      const contenido = Buffer.from(await archivo.arrayBuffer());
      const filas = await parsearPlanillaAlimentos(contenido, archivo.name);

      const validado = importarAlimentosDto.safeParse(filas);
      if (!validado.success) {
        return NextResponse.json(
          { error: "La planilla tiene valores inválidos.", detalles: validado.error.flatten() },
          { status: 400 },
        );
      }

      const { importados } = await servicioAlimentosPropios.importar(validado.data);
      return NextResponse.json({ importados }, { status: 201 });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo importar la planilla.";
      return NextResponse.json({ error: mensaje }, { status: 400 });
    }
  });
}
