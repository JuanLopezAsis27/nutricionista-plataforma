import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

export const runtime = "nodejs";

type Parametros = { params: Promise<{ id: string }> };

/**
 * GET /api/archivos/[id]/ver — sirve el archivo EN LÍNEA, desde la app.
 *
 * Hermano de `/api/archivos/[id]`, que redirige a una URL firmada del bucket.
 * Los dos existen porque hacen cosas distintas: aquel es para BAJAR un
 * adjunto, y este para MOSTRARLO adentro (el visor del PDF del plan). Un
 * iframe apuntado a la URL firmada carga otro origen y queda a merced de las
 * cabeceras del bucket y de lo que el navegador —o el WebView de la app
 * Android— acepte embeber; sirviéndolo acá el contenido es del mismo origen
 * que la página.
 *
 * Autorización: idéntica a la del hermano, y a propósito. Son dos formas de
 * leer el mismo archivo: si una fuera más permisiva, sería la puerta de atrás
 * de la otra.
 */
export function GET(
  _solicitud: Request,
  { params }: Parametros,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }

    try {
      const { id } = await params;

      if (usuario.rol !== "NUTRICIONISTA") {
        const permitido = await servicioArchivo().puedeVerPaciente(id, {
          usuarioId: usuario.id,
          pacienteId: usuario.pacienteId,
        });
        if (!permitido) {
          return NextResponse.json(
            { error: "No tenés acceso a este archivo." },
            { status: 403 },
          );
        }
      }

      const { archivo, contenido } =
        await servicioArchivo().obtenerContenido(id);

      return new NextResponse(new Uint8Array(contenido), {
        headers: {
          "Content-Type": archivo.mimeType,
          // `inline` es todo el punto: con `attachment` el navegador ofrece
          // guardar el archivo en vez de mostrarlo, y el visor queda en blanco.
          "Content-Disposition": `inline; filename="${nombreSeguro(archivo.nombreOriginal)}"`,
          // Privado: es contenido clínico de UN paciente y no puede quedar en
          // una caché compartida.
          "Cache-Control": "private, max-age=60",
          // Servir contenido subido por usuarios EN LÍNEA y desde el mismo
          // origen es cómodo (por eso existe esta ruta) y también es la vía
          // clásica de XSS almacenado. Estas dos cabeceras son las que la
          // cierran, y van explícitas acá aunque next.config.ts ya las ponga
          // globalmente: esta respuesta es la que más las necesita y no debe
          // depender de que nadie afloje la configuración general.
          //
          // `nosniff` es la que corta el ataque de raíz: obliga al navegador a
          // respetar el Content-Type declarado en vez de adivinar por el
          // contenido. Junto con la verificación de firma binaria de la subida
          // (dominio/servicios/firmaArchivo.ts), el contenido no puede pasar por
          // un tipo que no es.
          //
          // La CSP es el cinturón sobre los tirantes: si aun así algo llegara a
          // interpretarse como documento, no puede ejecutar nada ni salir a la
          // red. Deliberadamente NO se usa la directiva `sandbox`: el visor de
          // PDF integrado del navegador deja de dibujar bajo sandbox, y mostrar
          // el PDF adentro de la app es justamente para lo que existe esta ruta.
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'",
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

/** Nombre apto para la cabecera: sin comillas, saltos ni caracteres raros. */
function nombreSeguro(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim();
  return base || "archivo";
}
