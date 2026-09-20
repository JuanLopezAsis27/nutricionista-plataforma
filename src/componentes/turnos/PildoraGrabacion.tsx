"use client";

import { Circle, Loader2, Maximize2, Pause, Play, Square } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import {
  useGrabacionConsulta,
  type TurnoParaGrabar,
} from "./ProveedorGrabacionConsulta";
import { formatearDuracion } from "./useGrabadorAudio";

/**
 * La grabación minimizada: una barra fija que acompaña al profesional por toda
 * la app mientras el micrófono está abierto.
 *
 * Tiene dos trabajos y el primero es el que la justifica:
 *
 *  - **Que no se olvide el micrófono abierto.** Una grabación que sigue
 *    corriendo sin nada en pantalla es una grabación que se descubre al día
 *    siguiente, de dos horas y con lo que se haya dicho después de que el
 *    paciente se fue. El punto late y el cronómetro corre, como en el panel.
 *  - **Que se pueda cortar sin volver al turno.** Terminar es lo que hay que
 *    hacer cuando la consulta termina, y obligar a navegar hasta la agenda
 *    para apretar un botón es justo la fricción que hace que no se apriete.
 *
 * Los controles son los mismos del panel y llaman a lo mismo: el proveedor es
 * dueño del grabador, así que pausar acá y seguir allá es una sola grabación.
 * No se ofrece descartar —eso es un botón de tirar la consulta a la basura, y
 * acá se aprieta de paso—: para eso se abre el panel.
 */
export function PildoraGrabacion({ turno }: { turno: TurnoParaGrabar }) {
  const { grabador, abrirPanel, terminarYGuardar, guardando } =
    useGrabacionConsulta();
  const pausado = grabador.estado === "PAUSADO";

  return (
    <div
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(28rem,calc(100vw-2rem))] flex-wrap items-center gap-x-3 gap-y-2 rounded-full border border-destructive/40 bg-background/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur"
      // Una región y NO un `role="status"`: eso es una zona viva, y como el
      // cronómetro está adentro y cambia cada segundo, el lector de pantalla
      // pasaría la consulta entera leyendo la hora encima de todo lo demás.
      // Se llega a ella por su nombre, y los controles se anuncian solos.
      role="region"
      aria-label="Grabación de la consulta en curso"
    >
      <Circle
        className={cn(
          "h-3 w-3 shrink-0 fill-destructive text-destructive",
          !pausado && "animate-pulse",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {turno.pacienteNombre ?? "Consulta"}
        </p>
        <p className="text-xs leading-tight text-muted-foreground">
          <span className="tabular-nums">
            {formatearDuracion(grabador.segundos)}
          </span>
          {" · "}
          {pausado ? "En pausa" : "Grabando"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          title={pausado ? "Seguir grabando" : "Pausar"}
          aria-label={pausado ? "Seguir grabando" : "Pausar"}
          onClick={pausado ? grabador.reanudar : grabador.pausar}
        >
          {pausado ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          className="rounded-full"
          disabled={guardando}
          onClick={() => void terminarYGuardar()}
        >
          {guardando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {guardando ? "Guardando…" : "Terminar"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          title="Abrir la grabación de la consulta"
          aria-label="Abrir la grabación de la consulta"
          onClick={() => abrirPanel(turno)}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
