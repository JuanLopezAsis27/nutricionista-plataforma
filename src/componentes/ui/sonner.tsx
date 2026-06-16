"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Contenedor de notificaciones (toasts). Se monta una vez en el layout raíz.
 * Usar con: import { toast } from "sonner".
 */
function Toaster(props: ToasterProps) {
  return <Sonner className="toaster group" {...props} />;
}

export { Toaster };
