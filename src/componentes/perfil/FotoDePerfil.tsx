"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import { AvatarPerfil } from "@/componentes/comunes/AvatarPerfil";
import { ModalConfirmacion } from "@/componentes/comunes/ModalConfirmacion";
import { useSubirArchivo } from "@/lib/hooks/useSubirArchivo";
import { usePerfil } from "@/lib/hooks/usePerfil";

/** Lo que el input acepta; coincide con la lista blanca del contexto `perfil`. */
const IMAGENES_ACEPTADAS = "image/jpeg,image/png,image/webp,image/heic";

/**
 * La foto de perfil: verla, cambiarla y quitarla.
 *
 * No usa `SubidorArchivo` —la zona de arrastrar y soltar del resto de la app—
 * a propósito: acá lo que hay que ver es la foto ACTUAL en grande, y una caja
 * punteada vacía al lado del avatar cuenta dos veces la misma cosa. El avatar
 * ES el control: se toca y se abre el selector de archivos.
 *
 * La subida y el guardado son dos pasos y se ven como uno solo. El archivo va
 * primero a `/api/archivos` (multipart, que tRPC no transporta) y recién con su
 * id vuelta la mutación que apunta la cuenta a esa imagen. Si el segundo paso
 * falla, queda un archivo huérfano en el bucket que el barrido semanal del
 * worker recoge; lo que no puede pasar es lo inverso —la cuenta apuntando a
 * algo que no se subió—, y por eso el orden es ese.
 */
export function FotoDePerfil({
  nombre,
  fotoArchivoId,
}: {
  nombre: string;
  fotoArchivoId: string | null;
}) {
  const entradaRef = useRef<HTMLInputElement>(null);
  const { subir, subiendo } = useSubirArchivo();
  const { cambiarFoto } = usePerfil();
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const ocupado = subiendo || cambiarFoto.isPending;

  async function elegir(archivo: File) {
    try {
      const subido = await subir(archivo, { contexto: "perfil" });
      await cambiarFoto.mutateAsync({ archivoId: subido.id });
      toast.success("Listo, actualizamos tu foto.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cambiar la foto.",
      );
    }
  }

  async function quitar() {
    setConfirmandoQuitar(false);
    try {
      await cambiarFoto.mutateAsync({ archivoId: null });
      toast.success("Quitamos tu foto de perfil.");
    } catch {
      // El hook ya avisa con un toast; acá solo se evita el rechazo sin manejar.
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <AvatarPerfil
          nombre={nombre}
          fotoArchivoId={fotoArchivoId}
          className="h-24 w-24 text-xl"
        />
        {ocupado && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={ocupado}
            onClick={() => entradaRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {fotoArchivoId ? "Cambiar foto" : "Subir foto"}
          </Button>
          {fotoArchivoId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={ocupado}
              onClick={() => setConfirmandoQuitar(true)}
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          JPG, PNG, WebP o HEIC, hasta 2 MB. La ve la persona con la que
          conversás en Mensajes.
        </p>
      </div>

      <input
        ref={entradaRef}
        type="file"
        accept={IMAGENES_ACEPTADAS}
        className="hidden"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          if (archivo) void elegir(archivo);
          // Se limpia para que volver a elegir EL MISMO archivo dispare el
          // change: sin esto, reintentar tras un error no hacía nada.
          evento.target.value = "";
        }}
      />

      <ModalConfirmacion
        abierto={confirmandoQuitar}
        titulo="¿Quitar tu foto de perfil?"
        descripcion="Volvés a aparecer con tus iniciales. Podés subir otra cuando quieras."
        textoConfirmar="Quitar foto"
        onConfirmar={() => void quitar()}
        onCancelar={() => setConfirmandoQuitar(false)}
      />
    </div>
  );
}
