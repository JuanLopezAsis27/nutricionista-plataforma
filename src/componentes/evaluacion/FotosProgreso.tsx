"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Trash2 } from "lucide-react";
import type { ArchivoSalidaDto } from "@/aplicacion/dtos/archivo.dto";
import { trpc } from "@/lib/trpc";
import { avisarError } from "@/lib/errores";
import { formatearFecha, hoyLocalISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
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
 * Fotos: antes y después.
 *
 * Dos partes que se leen juntas:
 *
 * - **La línea de tiempo**: TODAS las fotos del paciente, en orden. Antes se
 *   veían dos y solo dos —las de los dos selectores—, así que no había manera
 *   de mirar el recorrido completo, que es lo que se muestra en la consulta.
 * - **La comparación**: dos de esas fotos, lado a lado y en grande. Arranca
 *   comparando la primera contra la última, que es lo que casi siempre se
 *   quiere ver, y cada foto de la línea de tiempo se puede mandar a cualquiera
 *   de los dos lugares.
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
  const [antesId, setAntesId] = useState<string | null>(null);
  const [despuesId, setDespuesId] = useState<string | null>(null);
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

  const antes = fotos.find((f) => f.id === antesId) ?? fotos[0] ?? null;
  const despues = fotos.find((f) => f.id === despuesId) ?? fotos.at(-1) ?? null;

  const resumen = archivos.isLoading
    ? "cargando…"
    : fotos.length === 0
      ? "sin fotos"
      : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`;

  return (
    <SeccionDesplegable titulo="Fotos: antes y después" resumen={resumen}>
      <div className="space-y-5">
        {/* --- Comparación: solo tiene sentido con dos fotos distintas --- */}
        {fotos.length >= 2 && antes && despues && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <PanelComparacion etiqueta="Antes" foto={antes} />
            <ArrowRight className="mx-auto hidden h-4 w-4 shrink-0 self-center text-muted-foreground sm:block" />
            <PanelComparacion etiqueta="Después" foto={despues} />
          </div>
        )}

        {/* --- La línea de tiempo con TODAS las fotos --- */}
        {fotos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Línea de tiempo — {fotos.length}{" "}
              {fotos.length === 1 ? "foto" : "fotos"}
              {fotos.length >= 2 && (
                <span className="font-normal">
                  {" "}
                  · elegí cuál va de cada lado de la comparación
                </span>
              )}
            </p>
            <ol className="flex gap-3 overflow-x-auto pb-2">
              {fotos.map((foto) => (
                <li key={foto.id} className="w-32 shrink-0 space-y-1">
                  <div
                    className={cn(
                      "overflow-hidden rounded-md border-2",
                      foto.id === antes?.id || foto.id === despues?.id
                        ? "border-primary"
                        : "border-transparent",
                    )}
                  >
                    <FotoConVisor
                      archivoId={foto.id}
                      alt={`Foto del ${formatearFecha(foto.fecha)}`}
                      className="aspect-square w-full"
                    />
                  </div>
                  <p className="text-center text-xs font-medium">
                    {formatearFecha(foto.fecha)}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    {fotos.length >= 2 && (
                      <>
                        <BotonLado
                          rotulo="Antes"
                          activo={foto.id === antes?.id}
                          onClick={() => setAntesId(foto.id)}
                        />
                        <BotonLado
                          rotulo="Después"
                          activo={foto.id === despues?.id}
                          onClick={() => setDespuesId(foto.id)}
                        />
                      </>
                    )}
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

        {archivos.isLoading ? null : fotos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Todavía no hay fotos. Con dos o más se puede comparar el antes y el
            después.
          </p>
        ) : fotos.length === 1 ? (
          <p className="text-center text-sm text-muted-foreground">
            Con una segunda foto se puede comparar el antes y el después.
          </p>
        ) : null}
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

function BotonLado({
  rotulo,
  activo,
  onClick,
}: {
  rotulo: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={activo ? "default" : "outline"}
      size="sm"
      className="h-6 px-2 text-[11px]"
      aria-pressed={activo}
      onClick={onClick}
    >
      {rotulo}
    </Button>
  );
}

function PanelComparacion({
  etiqueta,
  foto,
}: {
  etiqueta: string;
  foto: FotoDeProgreso;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {etiqueta} — {formatearFecha(foto.fecha)}
      </p>
      <FotoConVisor
        archivoId={foto.id}
        alt={`${etiqueta}: foto del ${formatearFecha(foto.fecha)}`}
        className="aspect-square w-full border"
      />
    </div>
  );
}
