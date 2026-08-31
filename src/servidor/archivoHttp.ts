import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";

/**
 * Servido de archivos del bucket, compartido por las dos rutas de lectura.
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
 * ## Qué cambia entre las dos rutas
 *
 * Solo el `Content-Disposition`: `inline` muestra, `attachment` ofrece guardar.
 * La AUTORIZACIÓN es la misma a propósito —son dos formas de leer el mismo
 * archivo, y si una fuera más permisiva sería la puerta de atrás de la otra—.
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
 * Responde con el contenido del archivo, ya autorizado.
 *
 * El nutricionista accede a todo; el paciente a lo que subió él mismo y a lo
 * que le fue compartido (la regla vive en el caso de uso
 * `PuedeVerArchivoPaciente`).
 */
export function responderArchivo(
  idPromesa: Promise<{ id: string }>,
  disposicion: DisposicionArchivo,
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

      const { archivo, contenido } =
        await servicioArchivo().obtenerContenido(id);

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

/** Nombre apto para la cabecera: sin comillas, saltos ni caracteres raros. */
export function nombreSeguro(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ._-]/g, "")
    .trim();
  return base || "archivo";
}
