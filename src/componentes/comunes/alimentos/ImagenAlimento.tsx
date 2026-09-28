"use client";

import { Apple } from "lucide-react";
import { cn } from "@/lib/utilidades";

/**
 * La URL de la imagen de un alimento, o null si no tiene.
 *
 * La imagen se pide a la ruta de SU lista —la del consultorio o la del
 * catálogo de la plataforma—, que es la que sabe quién puede verla. La
 * versión va en la URL para que una imagen nueva no salga de la caché con la
 * cara de la vieja (la ruta responde con caché inmutable).
 */
export function urlImagenAlimento(alimento: {
  id: string | null;
  fuente: string;
  imagenVersion: string | null;
}): string | null {
  if (!alimento.id || !alimento.imagenVersion) return null;
  const base =
    alimento.fuente === "BASE"
      ? "/api/catalogo/alimentos"
      : alimento.fuente === "PROPIO"
        ? "/api/alimentos"
        : null;
  if (!base) return null;
  return `${base}/${alimento.id}/imagen?v=${encodeURIComponent(alimento.imagenVersion)}`;
}

/** La miniatura de un alimento, con un ícono cuando no tiene imagen. */
export function ImagenAlimento({
  url,
  nombre,
  className,
}: {
  url: string | null;
  nombre: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted",
        className ?? "h-12 w-12",
      )}
    >
      {url ? (
        // Una miniatura servida por la app: `next/image` no suma nada acá y
        // exigiría configurar la ruta como origen de imágenes.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={nombre}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <Apple className="h-1/2 w-1/2 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  );
}
