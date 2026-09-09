"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/componentes/ui/avatar";
import { inicialesDe } from "@/componentes/mensajeria/chat";
import { cn } from "@/lib/utilidades";

/**
 * La cara de una persona: su foto de perfil, o sus iniciales si no eligió una.
 *
 * Existe para que la caída a iniciales sea UNA sola decisión. La bandeja, el
 * encabezado del hilo, las burbujas y la barra superior muestran lo mismo, y
 * mientras cada una resolvía su propio círculo con iniciales, agregar la foto
 * habría significado tocar cuatro lugares y olvidarse de alguno.
 *
 * La imagen se pide a `/api/archivos/<id>/ver` y NO a una URL firmada del
 * bucket: en producción el bucket vive en la red interna de Docker y la CSP
 * (`img-src 'self'`) bloquea cualquier otro origen. Ver `servidor/archivoHttp`.
 *
 * Si la petición falla —permiso revocado, archivo borrado— Radix cae solo al
 * fallback: no hay estado de error que manejar acá, y una foto que no carga
 * nunca deja un hueco.
 */
export function AvatarPerfil({
  nombre,
  fotoArchivoId,
  className,
}: {
  /** Para las iniciales y el texto alternativo. */
  nombre: string;
  fotoArchivoId: string | null | undefined;
  className?: string;
}) {
  return (
    <Avatar className={cn("shrink-0", className)}>
      {fotoArchivoId && (
        <AvatarImage
          src={`/api/archivos/${fotoArchivoId}/ver`}
          alt={`Foto de ${nombre}`}
          className="object-cover"
        />
      )}
      <AvatarFallback className="text-xs font-semibold">
        {inicialesDe(nombre) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
