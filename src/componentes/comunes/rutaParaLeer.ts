import { esDocumentoWord } from "@/dominio/entidades/Archivo";

/**
 * Ruta para LEER un archivo adentro de la app: el PDF (o la imagen) tal cual
 * por `/ver`, y el Word convertido a HTML por `/html`. El navegador no dibuja
 * un .docx ni un .doc: por `/ver` lo descargaría en vez de mostrarlo.
 *
 * Vive aparte de `VisorArchivo`, que es un componente de cliente, para que
 * también la usen los enlaces a los adjuntos de `VistaPlan`.
 */
export function rutaParaLeer(archivo: {
  id: string;
  mimeType: string;
}): string {
  return esDocumentoWord(archivo.mimeType)
    ? `/api/archivos/${archivo.id}/html`
    : `/api/archivos/${archivo.id}/ver`;
}
