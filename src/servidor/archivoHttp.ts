import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import {
  documentoWordAHtml,
  paginaDocumentoIlegible,
} from "@/infraestructura/documentos/documentoWordAHtml";
import type { ArchivoConContenidoDto } from "@/aplicacion/servicios/ServicioArchivo";
import { esDocumentoWord } from "@/dominio/entidades/Archivo";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

/**
 * Servido de archivos del bucket, compartido por las rutas de lectura.
 *
 * ## Por qué el contenido sale por acá y no por una redirección
 *
 * Las dos rutas —`/api/archivos/[id]` para bajar y `/api/archivos/[id]/ver`
 * para mostrar adentro— nacieron distintas: la primera redirigía (302) a una
 * URL firmada del bucket y la segunda servía los bytes. Esa asimetría rompía
 * los dos escenarios reales de la app:
 *
 *   1. **En producción el bucket no existe para el navegador.** MinIO vive en
 *      la red interna de Docker y `S3_ENDPOINT` es `http://minio:9000`
 *      (docker-compose.prod.yml). La URL firmada apunta a un host que solo
 *      resuelve adentro del stack: el navegador la pide y no llega a ninguna
 *      parte. Ni las fotos, ni los adjuntos, ni los laboratorios.
 *   2. **Aun con el bucket alcanzable, la CSP corta la imagen.** La política de
 *      `next.config.ts` declara `img-src 'self' data: blob:`, y una redirección
 *      cuenta: el navegador vuelve a evaluar el destino, que es otro origen
 *      (otro puerto ya alcanza). En desarrollo, con MinIO en `localhost:9000`,
 *      la etiqueta `<img>` quedaba vacía sin más pista que un aviso en la
 *      consola.
 *
 * Sirviendo siempre desde la app, el archivo es del MISMO origen que la página
 * y no depende de que el bucket esté publicado ni de las cabeceras que ese
 * bucket ponga. La URL firmada sigue existiendo en el dominio
 * (`generarUrlLectura`) para lo que sí necesita una URL alcanzable desde
 * afuera, que es otro problema.
 *
 * La contrapartida es que los bytes pasan por Node en vez de ir directo del
 * bucket al navegador. Es asumible: el techo de subida son 25 MB y lo que se
 * sirve son fotos de recetas y PDFs de plan, no video.
 *
 * ## Qué cambia entre las rutas
 *
 * `/api/archivos/[id]` ofrece guardar (`attachment`) y `/api/archivos/[id]/ver`
 * muestra (`inline`). La tercera, `/api/archivos/[id]/html`, es para el Word:
 * el navegador no lo dibuja, así que se convierte a HTML y se muestra eso. La
 * AUTORIZACIÓN es la misma en las tres a propósito —son formas de leer el
 * mismo archivo, y si una fuera más permisiva sería la puerta de atrás de las
 * otras—.
 */
export type DisposicionArchivo = "inline" | "attachment";

/**
 * Cabeceras de seguridad del contenido subido por usuarios.
 *
 * Servir contenido de terceros EN LÍNEA y desde el mismo origen es cómodo (por
 * eso existe esta ruta) y también es la vía clásica de XSS almacenado. Van
 * explícitas acá aunque `next.config.ts` ya las ponga globalmente: esta
 * respuesta es la que más las necesita y no debe depender de que nadie afloje
 * la configuración general.
 *
 * `nosniff` es la que corta el ataque de raíz: obliga al navegador a respetar
 * el Content-Type declarado en vez de adivinar por el contenido. Junto con la
 * verificación de firma binaria de la subida
 * (`dominio/servicios/firmaArchivo.ts`), el contenido no puede pasar por un
 * tipo que no es.
 *
 * La CSP es el cinturón sobre los tirantes: si aun así algo llegara a
 * interpretarse como documento, no puede ejecutar nada ni salir a la red.
 * Deliberadamente NO se usa la directiva `sandbox`: el visor de PDF integrado
 * del navegador deja de dibujar bajo sandbox, y mostrar el PDF adentro de la
 * app es justamente para lo que existe la ruta `/ver`.
 */
const CABECERAS_SEGURIDAD = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; object-src 'none'; script-src 'none'; base-uri 'none'; form-action 'none'",
} as const;

/**
 * Las del Word convertido a HTML: las mismas, más `sandbox`.
 *
 * Acá sí se puede —no hay visor de PDF que se rompa— y es donde más sirve: la
 * respuesta ES un documento HTML armado con lo que alguien subió. Bajo
 * `sandbox` corre en un origen propio, sin scripts ni formularios, aunque la
 * conversión dejara pasar algo.
 */
const CABECERAS_SEGURIDAD_HTML = {
  ...CABECERAS_SEGURIDAD,
  "Content-Security-Policy": `sandbox; ${CABECERAS_SEGURIDAD["Content-Security-Policy"]}`,
} as const;

/** Responde con el contenido del archivo, tal cual y ya autorizado. */
export function responderArchivo(
  idPromesa: Promise<{ id: string }>,
  disposicion: DisposicionArchivo,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    try {
      const lectura = await leerConPermiso(idPromesa);
      if (lectura instanceof NextResponse) return lectura;
      const { archivo, contenido } = lectura;

      return new NextResponse(new Uint8Array(contenido), {
        headers: {
          "Content-Type": archivo.mimeType,
          "Content-Disposition": `${disposicion}; filename="${nombreSeguro(archivo.nombreOriginal)}"`,
          // Privado: es contenido clínico de UN paciente y no puede quedar en
          // una caché compartida.
          "Cache-Control": "private, max-age=60",
          ...CABECERAS_SEGURIDAD,
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

/**
 * Responde con un documento de Word convertido a una página HTML, para leerlo
 * adentro de la app (el plan que se subió en Word).
 */
export function responderDocumentoComoHtml(
  idPromesa: Promise<{ id: string }>,
): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    try {
      const lectura = await leerConPermiso(idPromesa);
      if (lectura instanceof NextResponse) return lectura;
      const { archivo, contenido } = lectura;

      if (!esDocumentoWord(archivo.mimeType)) {
        return NextResponse.json(
          { error: "Este archivo no es un documento de Word." },
          { status: 415 },
        );
      }

      let html: string;
      let estado = 200;
      try {
        html = await documentoWordAHtml(
          contenido,
          archivo.mimeType,
          archivo.nombreOriginal,
        );
      } catch (error) {
        // Un Word dañado o con contraseña. Se avisa ADENTRO del visor, que es
        // donde la persona lo está mirando, en vez de dejarle un JSON de error.
        console.error("[archivos] no se pudo convertir el Word:", error);
        html = paginaDocumentoIlegible(archivo.nombreOriginal);
        estado = 422;
      }

      return new NextResponse(html, {
        status: estado,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=60",
          ...CABECERAS_SEGURIDAD_HTML,
        },
      });
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}

/**
 * El archivo y su contenido, si quien pide puede leerlo; si no, la respuesta
 * de error.
 *
 * El nutricionista accede a todo; el paciente a lo que subió él mismo y a lo
 * que le fue compartido (la regla vive en el caso de uso
 * `PuedeVerArchivoPaciente`).
 */
async function leerConPermiso(
  idPromesa: Promise<{ id: string }>,
): Promise<ArchivoConContenidoDto | NextResponse> {
  const usuario = await usuarioDeSesion();
  if (!usuario) {
    return NextResponse.json(
      { error: "Necesitás iniciar sesión." },
      { status: 401 },
    );
  }

  const { id } = await idPromesa;
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

  return await servicioArchivo().obtenerContenido(id);
}

/** Nombre apto para la cabecera: sin comillas, saltos ni caracteres raros. */
export function nombreSeguro(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim();
  return base || "archivo";
}
