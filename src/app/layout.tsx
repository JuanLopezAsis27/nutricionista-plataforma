import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Proveedores } from "@/componentes/Proveedores";
import { BotonInstalarApp } from "@/componentes/pwa/BotonInstalarApp";
import { RegistroServiceWorker } from "@/componentes/pwa/RegistroServiceWorker";
import { Toaster } from "@/componentes/ui/sonner";

/**
 * Layout raíz de la aplicación. Define el idioma (es), los estilos globales,
 * la tipografía, los proveedores (tRPC, React Query, sesión, tema), el
 * contenedor de toasts y las piezas de la PWA (ver `docs/PWA.md`).
 */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fuente-sans",
});

export const metadata: Metadata = {
  title: "Nutricionista App",
  description: "Gestión de pacientes, turnos y planes nutricionales",
  applicationName: "Nutricionista App",
  /**
   * El `<link rel="manifest">` lo inyecta Next solo, porque existe
   * `src/app/manifest.ts`. Lo de acá abajo es lo que ese archivo NO cubre.
   */
  appleWebApp: {
    // iOS no lee el manifiesto: sin esto, el ícono de la pantalla de inicio
    // abre Safari con su barra en lugar de una ventana propia. Next lo traduce
    // a `mobile-web-app-capable` (el nombre estándar) y al título e ícono de
    // estado que sí son propios de Apple.
    capable: true,
    title: "Nutrición",
    statusBarStyle: "default",
  },
};

/**
 * `theme-color` tiñe la barra de estado del teléfono y la barra de título de la
 * ventana instalada en escritorio. Va del color del FONDO de la app, no del
 * coral de la marca: la parte de arriba de todas las pantallas es fondo, y con
 * el coral se veía una franja suelta que no continuaba en ningún lado.
 * (El manifiesto sí declara el coral, para la pantalla de carga en Android.)
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F1F3" },
    { media: "(prefers-color-scheme: dark)", color: "#161618" },
  ],
};

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${figtree.variable} font-sans`}>
        <Proveedores>{children}</Proveedores>
        <Toaster richColors position="top-right" />
        <RegistroServiceWorker />
        <BotonInstalarApp />
      </body>
    </html>
  );
}
