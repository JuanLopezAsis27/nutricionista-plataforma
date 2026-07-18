"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Contenedor de notificaciones (toasts). Se monta una vez en el layout raíz.
 * Sigue el tema activo (claro/oscuro/sistema) de next-themes.
 * Usar con: import { toast } from "sonner".
 */
function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      {...props}
    />
  );
}

export { Toaster };
