import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * El encabezado de una pantalla del portal del paciente.
 *
 * Es la misma pieza en todas —degradado, patrón de puntos, ícono, título y una
 * línea que explica para qué sirve la pantalla— y vive acá porque su valor está
 * justamente en que sean idénticas: el paciente entra todos los días y navega
 * por reconocimiento, no leyendo. Con una copia por página, la quinta ya tenía
 * otro margen.
 *
 * `acciones` va a la derecha y baja debajo del título cuando no entra: es
 * donde van el «descargar PDF» o el «volver a hoy», que acompañan a la
 * pantalla pero no compiten con su nombre.
 */
export function EncabezadoPortal({
  icono: Icono,
  titulo,
  descripcion,
  acciones,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-5 sm:p-6">
      <div
        className="patron-puntos pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icono className="h-5 w-5 text-primary" />
            </span>
            {titulo}
          </h1>
          <p className="max-w-md pt-1.5 text-sm text-muted-foreground">
            {descripcion}
          </p>
        </div>
        {acciones && (
          <div className="flex flex-wrap items-center gap-2">{acciones}</div>
        )}
      </div>
    </section>
  );
}
