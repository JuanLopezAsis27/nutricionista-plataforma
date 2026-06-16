import type { Metadata } from "next";
import "./globals.css";
import { Proveedores } from "@/componentes/Proveedores";
import { Toaster } from "@/componentes/ui/sonner";

/**
 * Layout raíz de la aplicación. Define el idioma (es), los estilos globales,
 * los proveedores (tRPC, React Query, sesión) y el contenedor de toasts.
 */
export const metadata: Metadata = {
  title: "Nutricionista App",
  description: "Gestión de pacientes, turnos y dietas",
};

export default function LayoutRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Proveedores>{children}</Proveedores>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
