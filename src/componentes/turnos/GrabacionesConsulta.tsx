"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Circle,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import type { GrabacionSalidaDto } from "@/aplicacion/dtos/grabacion.dto";
import { useGrabaciones } from "@/lib/hooks/useGrabaciones";
import { useSubirArchivo } from "@/lib/hooks/useSubirArchivo";
import { formatearFechaHora } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import {
  useGrabadorAudio,
  formatearDuracion,
  type MotivoSinGrabador,
} from "./useGrabadorAudio";

/**
 * Grabar la consulta, verla transcrita y leer el resumen que arma la IA.
 *
 * La pantalla está ordenada por lo que se hace, no por lo que se guarda:
 * primero el botón de grabar (que es lo que se usa DURANTE la consulta),
 * después el resumen (lo que se lee después) y al final las grabaciones con su
 * transcripción, plegadas.
 *
 * La transcripción va **plegada pero presente**: es la fuente del resumen, y un
 * resumen generado por un modelo sobre un audio transcrito por otro tiene que
 * poder contrastarse. Esconderla del todo convertiría al resumen en la única
 * versión de lo que pasó en la consulta.
 */
export function GrabacionesConsulta({ turnoId }: { turnoId: string }) {
  const { deTurno, registrar, eliminar, reintentar, regenerarResumen } =
    useGrabaciones();
  const { subir, subiendo } = useSubirArchivo();
  const grabador = useGrabadorAudio();

  const consulta = deTurno(turnoId);
  const [porEliminar, setPorEliminar] = useState<GrabacionSalidaDto | null>(
    null,
  );

  async function terminarYGuardar() {
    const audio = await grabador.detener();
    if (!audio) return;
    const archivo = await subir(audio.archivo, { contexto: "grabacion" });
    registrar.mutate({
      turnoId,
      archivoId: archivo.id,
      duracionSegundos: audio.duracionSegundos,
    });
  }

  if (consulta.isLoading) return <Skeleton className="h-40 w-full" />;

  const datos = consulta.data;
  const grabaciones = datos?.grabaciones ?? [];
  const hayTranscripcion = grabaciones.some((g) => g.estado === "LISTA");

  return (
    <div className="space-y-4">
      <Controles
        grabador={grabador}
        guardando={subiendo || registrar.isPending}
        onTerminar={terminarYGuardar}
      />

      {datos?.transcripcionActiva === false && grabaciones.length > 0 && (
        <Aviso>
          No hay un proveedor de voz a texto configurado, así que las
          grabaciones no se transcriben. El audio queda guardado: cargá la clave
          en <strong>Integraciones</strong> y reintentá desde cada grabación.
        </Aviso>
      )}

      <Resumen
        resumen={datos?.resumen ?? null}
        desactualizado={datos?.resumenDesactualizado ?? false}
        hayTranscripcion={hayTranscripcion}
        generando={regenerarResumen.isPending}
        onRegenerar={() => regenerarResumen.mutate({ turnoId })}
      />

      {grabaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay grabaciones de esta consulta. Podés grabar varias: al
          terminar cada una se transcribe sola y el resumen se rehace con todas.
        </p>
      ) : (
        <ul className="space-y-2">
          {grabaciones.map((grabacion) => (
            <FilaGrabacion
              key={grabacion.id}
              grabacion={grabacion}
              reintentando={reintentar.isPending}
              onReintentar={() => reintentar.mutate({ id: grabacion.id })}
              onEliminar={() => setPorEliminar(grabacion)}
            />
          ))}
        </ul>
      )}

      <ModalConfirmacion
        abierto={porEliminar !== null}
        titulo="Eliminar la grabación"
        descripcion={`Se borran el audio y su transcripción, para siempre. El resumen de la consulta NO se rehace solo: si querés que deje de incluirla, regeneralo después.`}
        cargando={eliminar.isPending}
        onCancelar={() => setPorEliminar(null)}
        onConfirmar={() => {
          if (!porEliminar) return;
          eliminar.mutate(
            { id: porEliminar.id },
            { onSuccess: () => setPorEliminar(null) },
          );
        }}
      />
    </div>
  );
}

/**
 * Qué decirle a la persona en cada fallo.
 *
 * Cada texto nombra la acción que lo resuelve. Mientras todos decían «no diste
 * permiso», el más común —entrar por una URL que no es HTTPS— mandaba a
 * revisar un permiso que ya estaba concedido.
 */
const MENSAJES_FALLO: Record<MotivoSinGrabador, string> = {
  SIN_CONTEXTO_SEGURO:
    "El navegador solo deja usar el micrófono en sitios seguros. Entrá por https:// o por http://localhost; desde una IP de la red local (192.168.…) o un túnel sin HTTPS no se puede grabar, por más permiso que le des.",
  NO_SOPORTADO:
    "Este navegador no puede grabar audio. Probá con Chrome, Firefox o Safari actualizados.",
  SIN_PERMISO:
    "El navegador bloqueó el micrófono. Habilitalo para este sitio (el candado de la barra de direcciones) y reintentá.",
  SIN_MICROFONO: "No se encontró ningún micrófono. Conectá uno y reintentá.",
  MICROFONO_OCUPADO:
    "Otro programa está usando el micrófono. Cerrá la videollamada o la grabadora que lo tenga tomado y reintentá.",
  DESCONOCIDO: "No se pudo abrir el micrófono.",
};

/** El botón grande: grabar, pausar y terminar. */
function Controles({
  grabador,
  guardando,
  onTerminar,
}: {
  grabador: ReturnType<typeof useGrabadorAudio>;
  guardando: boolean;
  onTerminar: () => void;
}) {
  if (grabador.estado === "ERROR" && grabador.fallo) {
    return (
      <div className="space-y-2">
        <Aviso>
          {MENSAJES_FALLO[grabador.fallo.motivo]}
          {/* El mensaje crudo del navegador solo cuando no supimos clasificar
              el error: en los casos conocidos no agrega nada y suena a bug. */}
          {grabador.fallo.motivo === "DESCONOCIDO" &&
            grabador.fallo.detalle && (
              <span className="mt-1 block font-mono text-[11px] opacity-80">
                {grabador.fallo.detalle}
              </span>
            )}
        </Aviso>
        {/* Reintentar sin recargar: conceder el permiso y volver a probar es la
            secuencia normal, y recargar en el medio de una consulta no lo hace
            nadie. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => void grabador.comenzar()}
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (!grabador.grabando) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void grabador.comenzar()} disabled={guardando}>
          {guardando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {guardando ? "Guardando…" : "Grabar la consulta"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Avisale al paciente antes de empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      {/* El punto rojo late solo mientras se está grabando de verdad: en pausa
          queda fijo, que es la diferencia que hay que poder ver de un vistazo. */}
      <Circle
        className={cn(
          "h-3 w-3 fill-destructive text-destructive",
          grabador.estado === "GRABANDO" && "animate-pulse",
        )}
        aria-hidden
      />
      <span className="text-sm font-medium tabular-nums">
        {formatearDuracion(grabador.segundos)}
      </span>
      <span className="text-xs text-muted-foreground">
        {grabador.estado === "PAUSADO" ? "En pausa" : "Grabando"}
      </span>

      <div className="ml-auto flex flex-wrap gap-2">
        {grabador.estado === "GRABANDO" ? (
          <Button variant="outline" size="sm" onClick={grabador.pausar}>
            <Pause className="h-4 w-4" />
            Pausar
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={grabador.reanudar}>
            <Play className="h-4 w-4" />
            Seguir
          </Button>
        )}
        <Button size="sm" onClick={onTerminar} disabled={guardando}>
          <Square className="h-4 w-4" />
          Terminar y guardar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={grabador.descartar}
        >
          Descartar
        </Button>
      </div>
    </div>
  );
}

function Resumen({
  resumen,
  desactualizado,
  hayTranscripcion,
  generando,
  onRegenerar,
}: {
  resumen: { texto: string; modelo: string | null; generadoEn: Date } | null;
  desactualizado: boolean;
  hayTranscripcion: boolean;
  generando: boolean;
  onRegenerar: () => void;
}) {
  if (!resumen && !hayTranscripcion) return null;

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Resumen de la consulta
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={generando}
          onClick={onRegenerar}
        >
          {generando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {resumen ? "Regenerar" : "Generar"}
        </Button>
      </div>

      {desactualizado && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Hay grabaciones transcritas después de este resumen. Regeneralo para
          incluirlas.
        </p>
      )}

      {resumen ? (
        <>
          {/* `whitespace-pre-line` y no un render de Markdown: el resumen se
              lee y se copia a la ficha, y meter un motor de Markdown acá
              agregaría una superficie de HTML generado por un modelo. */}
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {resumen.texto}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Generado por IA el {formatearFechaHora(resumen.generadoEn)}
            {resumen.modelo ? ` con ${resumen.modelo}` : ""}. Revisalo antes de
            usarlo: sale de una transcripción automática y puede tener errores.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ya hay transcripciones. Generá el resumen cuando termines de grabar.
        </p>
      )}
    </div>
  );
}

function FilaGrabacion({
  grabacion,
  reintentando,
  onReintentar,
  onEliminar,
}: {
  grabacion: GrabacionSalidaDto;
  reintentando: boolean;
  onReintentar: () => void;
  onEliminar: () => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <li className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Parte {grabacion.orden}</span>
        {grabacion.duracionSegundos != null && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatearDuracion(grabacion.duracionSegundos)}
          </span>
        )}
        <EstadoTranscripcion grabacion={grabacion} />
        <div className="ml-auto flex gap-1">
          {grabacion.estado === "FALLIDA" && (
            <Button
              variant="ghost"
              size="icon"
              title="Reintentar la transcripción"
              disabled={reintentando}
              onClick={onReintentar}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Eliminar la grabación"
            onClick={onEliminar}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* El audio se sirve DESDE la app, nunca por una URL firmada del bucket:
          en producción MinIO vive en la red interna de Docker y no existe para
          el navegador. */}
      {grabacion.archivoId && (
        <audio
          controls
          preload="none"
          className="mt-2 w-full"
          src={`/api/archivos/${grabacion.archivoId}/ver`}
        >
          <track kind="captions" />
        </audio>
      )}

      {grabacion.error && (
        <p className="mt-2 text-xs text-destructive">{grabacion.error}</p>
      )}

      {grabacion.transcripcion && (
        <div className="mt-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setAbierta((valor) => !valor)}
            aria-expanded={abierta}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                abierta && "rotate-180",
              )}
              aria-hidden
            />
            {abierta ? "Ocultar" : "Ver"} la transcripción
          </button>
          {abierta && (
            <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-md bg-muted/50 p-2 text-xs leading-relaxed">
              {grabacion.transcripcion}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function EstadoTranscripcion({ grabacion }: { grabacion: GrabacionSalidaDto }) {
  switch (grabacion.estado) {
    case "LISTA":
      return <span className="text-xs text-muted-foreground">Transcrita</span>;
    case "FALLIDA":
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          No se pudo transcribir
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Transcribiendo…
        </span>
      );
  }
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      <span>{children}</span>
    </p>
  );
}
