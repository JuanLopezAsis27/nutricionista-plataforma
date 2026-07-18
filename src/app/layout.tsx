import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Proveedores } from "@/componentes/Proveedores";
import { Toaster } from "@/componentes/ui/sonner";

/**
 * Layout raíz de la aplicación. Define el idioma (es), los estilos globales,
 * la tipografía, los proveedores (tRPC, React Query, sesión, tema) y el
 * contenedor de toasts.
 */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--fuente-sans",
});

export const metadata: Metadata = {
  title: "Nutricionista App",
  description: "Gestión de pacientes, turnos y planes nutricionales",
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
      </body>
    </html>
  );
}
