import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioAlimentosBase } from "@/infraestructura/contenedor/contenedor";
import { parsearPlanillaAlimentos } from "@/infraestructura/nutricion/parsearPlanillaAlimentos";
import { importarAlimentosDto } from "@/aplicacion/dtos/alimentoPropio.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { mensajeDesdeZod } from "@/servidor/mensajeZod";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

// La subida del Excel va por route handler (multipart), nunca por tRPC.
export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * POST /api/catalogo/alimentos/importar — importa los alimentos
 * PREDETERMINADOS de la plataforma desde un Excel (.xlsx) o CSV. Reemplaza el
 * catálogo anterior. Solo SUPERADMIN.
 *
 * Es el gemelo de /api/alimentos/importar (la lista de un consultorio): misma
 * planilla, mismo parser y mismo caso de uso, cableado con el repositorio del
 * catálogo. Reemplazar no rompe nada: los planes y las recetas COPIAN los
 * macros del alimento al elegirlo, no lo referencian.
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
    if (usuario.rol !== "SUPERADMIN") {
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
            error: `La planilla tiene valores inválidos. ${mensajeDesdeZod(validado.error)}`,
          },
          { status: 400 },
        );
      }

      const resultado = await servicioAlimentosBase().importar(validado.data);
      return NextResponse.json(resultado, { status: 201 });
    } catch (error) {
      // Mismo criterio que la importación del consultorio: pasan los errores
      // de dominio, el resto sale genérico y se registra.
      return aRespuestaError(error);
    }
  });
}
