"use client";

import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { HiloMensajes } from "@/componentes/mensajeria/HiloMensajes";
import { AvatarPerfil } from "@/componentes/comunes/AvatarPerfil";
import { Card } from "@/componentes/ui/card";

/** Portal del paciente: chat directo con su nutricionista. */
export default function PaginaMisMensajes() {
  const { miHilo, enviar, marcarMisLeidos } = useMensajeria();
  const consulta = miHilo();
  const mensajes = consulta.data?.mensajes ?? [];
  const contraparte = consulta.data?.contraparte;
  const cantidad = mensajes.length;

  // Marca como leídos al abrir y cada vez que llegan mensajes nuevos.
  const marcar = marcarMisLeidos.mutate;
  useEffect(() => {
    if (consulta.data) marcar();
  }, [cantidad, consulta.data, marcar]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="h-6 w-6 text-primary" /> Mensajes
        </h1>
        <p className="text-sm text-muted-foreground">
          Escribile directamente a tu nutricionista. Te responde por acá.
        </p>
      </div>

      <Card className="flex h-[70vh] flex-col p-3">
        {/* El encabezado con la cara del profesional: en el portal el chat no
            tiene bandeja al lado —hay una sola conversación posible— así que
            sin esto nada en la pantalla decía con quién se está hablando. */}
        {contraparte && (
          <header className="mb-2 flex items-center gap-2 border-b pb-2">
            <AvatarPerfil
              nombre={contraparte.nombre}
              fotoArchivoId={contraparte.fotoArchivoId}
              className="h-9 w-9"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{contraparte.nombre}</p>
              <p className="text-xs text-muted-foreground">Tu nutricionista</p>
            </div>
          </header>
        )}
        <HiloMensajes
          mensajes={mensajes}
          cargando={consulta.isLoading}
          enviando={enviar.isPending}
          onEnviar={(cuerpo) => enviar.mutateAsync({ cuerpo })}
        />
      </Card>
    </div>
  );
}
