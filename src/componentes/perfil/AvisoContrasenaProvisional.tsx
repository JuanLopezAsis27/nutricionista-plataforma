"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { usePerfil } from "@/lib/hooks/usePerfil";

/** Dónde se recuerda que se cerró el aviso: solo por esta pestaña. */
const CLAVE_DESCARTADO = "aviso-contrasena-provisional-descartado";

/**
 * Advertencia del portal: la contraseña la eligió el profesional (migración
 * 78, `Usuario.passwordProvisional`).
 *
 * **Recomienda, no obliga.** Cambiarla es lo sensato —el profesional la
 * conoce—, pero trabar el portal hasta que la persona la cambie es una
 * decisión que se tomó no tomar. La defensa real está en otro lado: un
 * consultorio solo puede fijar la contraseña de una cuenta que es EXCLUSIVA
 * suya (`cuentaPaciente.ts`), así que con ella no se entra a ningún otro.
 *
 * Se puede cerrar, y cerrado queda por esta pestaña (`sessionStorage`): vuelve
 * en la próxima visita mientras la contraseña siga siendo la provisional. Se
 * apaga sola al cambiarla: `perfil.cambiarPassword` invalida la query.
 */
export function AvisoContrasenaProvisional() {
  const { mio } = usePerfil();
  const { data: perfil } = mio();
  // Lectura perezosa: en el servidor no hay `sessionStorage`, pero tampoco
  // hay perfil todavía (la query corre en el navegador), así que el primer
  // render es `null` en los dos lados y no hay desajuste de hidratación.
  const [descartado, setDescartado] = useState(() => {
    try {
      return sessionStorage.getItem(CLAVE_DESCARTADO) === "1";
    } catch {
      return false;
    }
  });

  if (!perfil?.passwordProvisional || descartado) return null;

  function descartar(): void {
    setDescartado(true);
    try {
      sessionStorage.setItem(CLAVE_DESCARTADO, "1");
    } catch {
      // Sin almacenamiento, se cierra igual hasta recargar.
    }
  }

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">
        Tu contraseña la eligió tu nutricionista. Te recomendamos cambiarla por
        una que solo sepas vos, desde{" "}
        <Link href="/mi-perfil" className="font-medium underline">
          Mi perfil
        </Link>
        .
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        aria-label="Cerrar aviso"
        onClick={descartar}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
