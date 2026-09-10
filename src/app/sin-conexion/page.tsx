import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { LogoConsultorio } from "@/componentes/marca/LogoConsultorio";

export const metadata: Metadata = {
  title: "Sin conexión",
};

/**
 * Pantalla que muestra el service worker cuando una navegación no llega al
 * servidor (ver `public/sw.js`). Reemplaza al error del navegador, que dentro
 * de una ventana `standalone` —sin barra de direcciones ni botón de recargar—
 * deja a la persona sin salida.
 *
 * Es deliberadamente un componente de servidor SIN nada interactivo: se sirve
 * desde el caché, así que sus scripts no están disponibles y cualquier `onClick`
 * sería un botón muerto. Por eso "Reintentar" es un enlace común, que funciona
 * sin JavaScript.
 */
export default function PaginaSinConexion() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-6 text-center">
      <LogoConsultorio variante="completo" />

      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold">Sin conexión</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          No se pudo contactar al servidor. Revisá tu conexión a internet y
          volvé a intentar; los datos siguen guardados y no se perdió nada.
        </p>
        {/* `Link` sin JavaScript se comporta como un <a> común y recarga la
            página entera, que es justo lo que hace falta acá. */}
        <Link
          href="/"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Reintentar
        </Link>
      </div>
    </main>
  );
}
