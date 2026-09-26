"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { trpc } from "@/lib/trpc";
import { avisarError } from "@/lib/errores";
import { formatearFecha, hoyLocalISO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { FotoConVisor } from "@/componentes/comunes/FotoConVisor";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { SeccionDesplegable } from "@/componentes/comunes/SeccionDesplegable";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

/** Una foto de la línea de tiempo, con el día que representa. */
interface FotoDeProgreso {
  id: string;
  nombreOriginal: string;
  fecha: Date;
}

/**
 * Fotos de progreso: la línea de tiempo con TODAS las fotos del paciente, en
 * orden, que es lo que se recorre en la consulta. Cada foto se abre en grande
 * con el visor.
 *
 * Hubo una comparación «antes / después» con dos fotos elegidas lado a lado; se
 * sacó a pedido del profesional, que mira el recorrido entero y no dos puntos.
 *
 * Las fotos se cargan ACÁ y son del paciente. Hasta la migración 63 colgaban de
 * una evolución de control, y eso obligaba a escribir una evolución para poder
 * guardar una foto —y dejaba fuera de la línea de tiempo cualquier fecha sin
 * evolución escrita—. Lo que las ubica en el tiempo es `fechaProgreso`, que se
 * elige al subirlas: una foto de hace seis meses se carga hoy y va en su lugar,
 * no arriba de todo.
 */
export function FotosProgreso({ pacienteId }: { pacienteId: string }) {
  const utils = trpc.useUtils();
  const archivos = trpc.archivos.obtenerDePaciente.useQuery({ pacienteId });

  const refrescar = () =>
    void utils.archivos.obtenerDePaciente.invalidate({ pacienteId });

  const eliminar = trpc.archivos.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Foto eliminada.");
      refrescar();
    },
    onError: (error) => avisarError(error),
  });

  const [fechaNueva, setFechaNueva] = useState(hoyLocalISO());
  const [aEliminar, setAEliminar] = useState<FotoDeProgreso | null>(null);

  const fotos: FotoDeProgreso[] = useMemo(() => {
    return (archivos.data ?? [])
      .filter(esFotoDeProgreso)
      .map((archivo) => ({
        id: archivo.id,
        nombreOriginal: archivo.nombreOriginal,
        // `fechaProgreso` siempre está en lo que sube esta sección; el `??` es
        // por una foto vieja que se hubiera guardado sin fecha.
        fecha: archivo.fechaProgreso ?? archivo.creadoEn,
      }))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  }, [archivos.data]);

  const resumen = archivos.isLoading
    ? "cargando…"
    : fotos.length === 0
      ? "sin fotos"
      : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`;

  return (
    <SeccionDesplegable titulo="Fotos de progreso" resumen={resumen}>
      <div className="space-y-5">
        {/* --- La línea de tiempo con TODAS las fotos --- */}
        {fotos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Línea de tiempo — {fotos.length}{" "}
              {fotos.length === 1 ? "foto" : "fotos"}
            </p>
            <ol className="flex gap-3 overflow-x-auto pb-2">
              {fotos.map((foto) => (
                <li key={foto.id} className="w-32 shrink-0 space-y-1">
                  <div className="overflow-hidden rounded-md border">
                    <FotoConVisor
                      archivoId={foto.id}
                      alt={`Foto del ${formatearFecha(foto.fecha)}`}
                      className="aspect-square w-full"
                    />
                  </div>
                  <p className="text-center text-xs font-medium">
                    {formatearFecha(foto.fecha)}
                  </p>
                  <div className="flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Eliminar la foto del ${formatearFecha(foto.fecha)}`}
                      onClick={() => setAEliminar(foto)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* --- Cargar una foto nueva --- */}
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <Label htmlFor="foto-progreso-fecha" className="text-xs">
                Fecha de la foto
              </Label>
              <Input
                id="foto-progreso-fecha"
                type="date"
                className="w-44"
                value={fechaNueva}
                onChange={(evento) => setFechaNueva(evento.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Es el día que MUESTRA la foto, no el día que la subís: así una
              foto vieja cae en su lugar de la línea de tiempo.
            </p>
          </div>
          <SubidorArchivo
            contexto="progreso"
            pacienteId={pacienteId}
            fechaProgreso={fechaNueva}
            accept="image/*"
            sinVistaPrevia
            onSubido={refrescar}
          />
        </div>

        {!archivos.isLoading && fotos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no hay fotos.
          </p>
        )}
      </div>

      <ModalConfirmacion
        abierto={aEliminar !== null}
        titulo="Eliminar la foto"
        descripcion={
          aEliminar
            ? `Se borra la foto del ${formatearFecha(aEliminar.fecha)}. No se puede deshacer.`
            : ""
        }
        cargando={eliminar.isPending}
        onConfirmar={() => {
          if (aEliminar) eliminar.mutate({ id: aEliminar.id });
          setAEliminar(null);
        }}
        onCancelar={() => setAEliminar(null)}
      />
    </SeccionDesplegable>
  );
}

/**
 * ¿Este archivo del paciente es una foto de progreso?
 *
 * El contexto sale del prefijo de la clave en el bucket, que es lo único que
 * distingue una foto de progreso de un consentimiento o de un estudio: los tres
 * cuelgan del mismo dueño (`pacienteId`).
 */
function esFotoDeProgreso(archivo: ArchivoSalidaDto): boolean {
  return archivo.contexto === "progreso";
}
