import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioAlimentosPropios } from "@/infraestructura/contenedor/contenedor";
import { parsearPlanillaAlimentos } from "@/infraestructura/nutricion/parsearPlanillaAlimentos";
import {
  importarAlimentosDto,
  modoImportacionAlimentosDto,
} from "@/aplicacion/dtos/alimentoPropio.dto";
import { aRespuestaError } from "@/servidor/errores-http";
import { mensajeDesdeZod } from "@/servidor/mensajeZod";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

// La subida del Excel va por route handler (multipart), nunca por tRPC.
export const runtime = "nodejs";

// 20 MB: una planilla con una imagen por alimento pesa bastante más que una
// de solo texto. Cada imagen tiene además su propio tope (2 MB) y se guarda
// reducida (ver `ImagenesDeAlimentos`). El nginx de producción admite 26 MB.
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * POST /api/alimentos/importar — importa la lista de alimentos del nutricionista
 * desde un Excel (.xlsx) o CSV. Solo NUTRICIONISTA.
 *
 * Campo `modo`: `REEMPLAZAR` (la lista queda igual a la planilla) o `AGREGAR`
 * (se suman los que no estaban; los que ya estaban no se tocan).
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
          { error: "El archivo supera los 20 MB." },
          { status: 400 },
        );
      }

      // Sin `modo` (un cliente viejo) se reemplaza, que era lo único que había.
      const modo = modoImportacionAlimentosDto.safeParse(
        formulario.get("modo") ?? "REEMPLAZAR",
      );
      if (!modo.success) {
        return NextResponse.json(
          { error: "Modo de importación inválido." },
          { status: 400 },
        );
      }

      const contenido = Buffer.from(await archivo.arrayBuffer());
      const planilla = await parsearPlanillaAlimentos(contenido, archivo.name);

      const validado = importarAlimentosDto.safeParse(planilla.filas);
      if (!validado.success) {
        return NextResponse.json(
          {
            error: `La planilla tiene valores inválidos. ${mensajeDesdeZod(validado.error)}`,
          },
          { status: 400 },
        );
      }

      // Las imágenes no pasan por el DTO (son bytes): van por índice de fila,
      // y el caso de uso las valida y las achica.
      const resultado = await servicioAlimentosPropios().importar(
        validado.data,
        modo.data,
        planilla.imagenes,
      );
      return NextResponse.json(resultado, { status: 201 });
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
