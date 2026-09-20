"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useGrabaciones } from "@/lib/hooks/useGrabaciones";
import { useSubirArchivo } from "@/lib/hooks/useSubirArchivo";
import { avisarError } from "@/lib/errores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import { GrabacionesConsulta } from "./GrabacionesConsulta";
import { PildoraGrabacion } from "./PildoraGrabacion";
import { useGrabadorAudio } from "./useGrabadorAudio";

/** Lo mínimo que hace falta para grabar: el turno y a quién se está atendiendo. */
export interface TurnoParaGrabar {
  id: string;
  pacienteNombre: string | null;
}

interface ContextoGrabacionConsulta {
  /** Cierra el panel. Si hay una grabación en curso, sigue grabando. */
  cerrarPanel: () => void;
  abrirPanel: (turno: TurnoParaGrabar) => void;
  /** El turno cuya grabación está en curso, o null si no se está grabando. */
  turnoGrabando: TurnoParaGrabar | null;
  grabador: ReturnType<typeof useGrabadorAudio>;
  /** Empieza a grabar el turno que el panel tiene abierto (y reintenta). */
  comenzar: () => Promise<void>;
  terminarYGuardar: () => Promise<void>;
  descartar: () => void;
  /** Se está subiendo el audio o registrando la grabación. */
  guardando: boolean;
}

const Contexto = createContext<ContextoGrabacionConsulta | null>(null);

/**
 * Abrir el panel, y nada más: es lo único que necesitan las PANTALLAS.
 *
 * Va en su propio contexto porque el otro cambia cuatro veces por segundo
 * —el cronómetro— y el valor de un contexto re-renderiza a todos sus
 * consumidores. Con uno solo, grabar repintaba la grilla de la agenda cada
 * 250 ms desde una pantalla que del grabador solo usa el botón.
 *
 * Es un valor estable para siempre: `abrirPanel` no depende de ningún estado.
 */
const ContextoAbrir = createContext<((turno: TurnoParaGrabar) => void) | null>(
  null,
);

/**
 * La grabación de la consulta, montada una sola vez para todo el panel.
 *
 * **Por qué vive acá y no en la pantalla del turno.** Grabar dura toda la
 * consulta, y durante la consulta el profesional usa la app: abre la ficha del
 * paciente, mira la antropometría anterior, carga una evolución. Con el
 * grabador dentro del diálogo, cerrarlo desmontaba el componente y `MediaRecorder`
 * se iba con él — es decir, había que elegir entre grabar o usar el sistema.
 * En el layout del dashboard, en cambio, el proveedor sobrevive a la navegación
 * del App Router (el layout no se vuelve a montar al cambiar de página) y la
 * grabación continúa.
 *
 * De ahí salen las tres piezas y el reparto:
 *
 *  - el PROVEEDOR es dueño del `MediaRecorder` y del turno que se está grabando;
 *  - el DIÁLOGO es una vista de eso, que se abre y se cierra sin consecuencias;
 *  - la PÍLDORA es lo que queda cuando el diálogo se cierra grabando, para que
 *    nadie se olvide el micrófono abierto y para poder cortar sin volver al turno.
 *
 * **Una grabación a la vez, y atada a su turno.** `turnoGrabando` se fija al
 * empezar y no lo mueve abrir el panel de otro turno: el audio tiene que ir a la
 * consulta donde se grabó, y un grabador global que siguiera al panel guardaría
 * la consulta de alguien en la ficha de otro. Abrir el panel de un segundo turno
 * mientras se graba muestra el aviso, no el botón.
 */
export function ProveedorGrabacionConsulta({
  children,
}: {
  children: React.ReactNode;
}) {
  const grabador = useGrabadorAudio();
  const { subir, subiendo } = useSubirArchivo();
  const { registrar } = useGrabaciones();

  /** Qué turno muestra el diálogo. null = cerrado (o minimizado). */
  const [turnoPanel, setTurnoPanel] = useState<TurnoParaGrabar | null>(null);
  const [turnoGrabando, setTurnoGrabando] = useState<TurnoParaGrabar | null>(
    null,
  );

  const guardando = subiendo || registrar.isPending;

  const abrirPanel = useCallback((turno: TurnoParaGrabar) => {
    setTurnoPanel(turno);
  }, []);

  const cerrarPanel = useCallback(() => setTurnoPanel(null), []);

  const comenzar = useCallback(async () => {
    if (!turnoPanel || turnoGrabando) return;
    // El turno se fija DESPUÉS de que el micrófono abrió. `comenzar` no lanza
    // —deja el estado en ERROR con el motivo—, así que marcarlo antes dejaría
    // un turno "grabando" que nunca grabó nada, con su píldora fantasma
    // encima. Por eso el reintento del panel también pasa por acá.
    if (await grabador.comenzar()) setTurnoGrabando(turnoPanel);
  }, [grabador, turnoPanel, turnoGrabando]);

  const terminarYGuardar = useCallback(async () => {
    const turno = turnoGrabando;
    const audio = await grabador.detener();
    setTurnoGrabando(null);
    if (!audio || !turno) return;

    // El fallo se avisa acá y no se deja propagar: con el panel minimizado
    // quien grabó puede estar en otra pantalla, y una promesa rechazada en
    // silencio le haría creer que la consulta quedó guardada.
    try {
      const archivo = await subir(audio.archivo, { contexto: "grabacion" });
      registrar.mutate({
        turnoId: turno.id,
        archivoId: archivo.id,
        duracionSegundos: audio.duracionSegundos,
      });
    } catch (error) {
      avisarError(error, "No se pudo guardar la grabación de la consulta.");
    }
  }, [grabador, registrar, subir, turnoGrabando]);

  const descartar = useCallback(() => {
    grabador.descartar();
    setTurnoGrabando(null);
  }, [grabador]);

  // Recargar o cerrar la pestaña mata al `MediaRecorder` y lo grabado se
  // pierde entero: todavía está en memoria, no hay nada subido. Antes el
  // diálogo abierto lo hacía evidente; ahora se puede estar grabando desde
  // otra pantalla, así que el navegador tiene que preguntar.
  useEffect(() => {
    if (!grabador.grabando) return;
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [grabador.grabando]);

  return (
    <Contexto.Provider
      value={{
        cerrarPanel,
        abrirPanel,
        turnoGrabando,
        grabador,
        comenzar,
        terminarYGuardar,
        descartar,
        guardando,
      }}
    >
      <ContextoAbrir.Provider value={abrirPanel}>
        {children}
      </ContextoAbrir.Provider>

      <Dialog
        open={turnoPanel !== null}
        // Cerrar con la X, con Escape o clickeando afuera MINIMIZA: el
        // proveedor conserva el grabador. Es el gesto natural para "seguí
        // grabando que voy a mirar otra cosa", y no hace falta enseñarlo.
        onOpenChange={(abierto) => !abierto && cerrarPanel()}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Grabación de la consulta
              {turnoPanel?.pacienteNombre
                ? ` · ${turnoPanel.pacienteNombre}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          {/* La clave monta un panel nuevo por turno: sin esto, abrirlo para
              otro turno reusaría el que quedó montado, con sus transcripciones
              plegadas a medio camino. El grabador NO se remonta con él: vive
              en el proveedor, que es lo que permite minimizar. */}
          {turnoPanel && (
            <GrabacionesConsulta key={turnoPanel.id} turnoId={turnoPanel.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Solo cuando el panel está cerrado: con el diálogo abierto, los
          controles ya están a la vista y la píldora sería el mismo botón
          dos veces. */}
      {turnoGrabando && turnoPanel === null && (
        <PildoraGrabacion turno={turnoGrabando} />
      )}
    </Contexto.Provider>
  );
}

/**
 * El grabador completo. Lo usan el panel y la píldora, que SÍ tienen que
 * repintarse con el cronómetro. Una pantalla quiere `useAbrirGrabacion`.
 */
export function useGrabacionConsulta(): ContextoGrabacionConsulta {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error(
      "useGrabacionConsulta necesita estar dentro de <ProveedorGrabacionConsulta>.",
    );
  }
  return contexto;
}

/** Abrir el panel de grabación de un turno, desde cualquier pantalla. */
export function useAbrirGrabacion(): (turno: TurnoParaGrabar) => void {
  const abrir = useContext(ContextoAbrir);
  if (!abrir) {
    throw new Error(
      "useAbrirGrabacion necesita estar dentro de <ProveedorGrabacionConsulta>.",
    );
  }
  return abrir;
}
