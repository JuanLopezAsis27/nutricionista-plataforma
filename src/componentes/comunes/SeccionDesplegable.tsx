"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utilidades";

interface Props {
  titulo: string;
  /**
   * Qué hay adentro, dicho en una línea («3 alertas», «última consulta el
   * 12/07»). Se muestra SIEMPRE, también plegado: una sección cerrada que no
   * dice qué tiene obliga a abrirla para averiguarlo, que es justo el clic que
   * esto viene a ahorrar.
   */
  resumen?: ReactNode;
  /** Botones del encabezado (agregar, etc.). Van FUERA del disparador. */
  acciones?: ReactNode;
  /** Arranca abierta. Por defecto no: la ficha se abre para mirar, no para leer todo. */
  inicialAbierta?: boolean;
  children: ReactNode;
}

/**
 * Sección de la ficha del paciente que se pliega y se despliega.
 *
 * La pestaña de Evaluación apila alertas, historia clínica y evoluciones, y
 * cada una crece con el tiempo: un paciente con dos años de seguimiento
 * empujaba las demás secciones fuera de la pantalla. Plegadas, la pestaña
 * vuelve a leerse de un vistazo y se abre solo lo que se va a mirar.
 *
 * Dos detalles que la hacen usable y no solo compacta:
 *
 * - **El contenido no se desmonta**, se oculta. Un formulario a medio escribir
 *   que se pliega sin querer no puede perder lo tipeado.
 * - **Las acciones del encabezado quedan afuera del disparador**: un botón
 *   dentro de otro botón no es HTML válido y el navegador decide solo cuál de
 *   los dos gana el clic.
 */
export function SeccionDesplegable({
  titulo,
  resumen,
  acciones,
  inicialAbierta = false,
  children,
}: Props) {
  const [abierta, setAbierta] = useState(inicialAbierta);
  const idContenido = useId();

  return (
    <section className="rounded-md border">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setAbierta((previa) => !previa)}
          aria-expanded={abierta}
          aria-controls={idContenido}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !abierta && "-rotate-90",
            )}
          />
          <span className="font-semibold">{titulo}</span>
          {resumen && (
            <span className="truncate text-xs text-muted-foreground">
              {resumen}
            </span>
          )}
        </button>
        {acciones && <div className="flex shrink-0 gap-2">{acciones}</div>}
      </div>

      <div id={idContenido} hidden={!abierta} className="border-t p-3">
        {children}
      </div>
    </section>
  );
}
