"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, ExternalLink, Send } from "lucide-react";
import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { construirEnlaceWhatsapp } from "@/dominio/casos-de-uso/whatsapp/enlace";
import { useWhatsapp } from "@/lib/hooks/useWhatsapp";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/componentes/ui/dialog";

interface PropsBotonRecordatorio {
  turno: TurnoSalidaDto;
  /** Teléfono cargado del paciente; si es null el botón queda deshabilitado. */
  telefonoPaciente?: string | null;
}

/** Fecha corta para el tooltip: "dd/mm hh:mm". */
function formatearMomento(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

/**
 * Recordatorio de turno por WhatsApp: abre el chat del paciente con el mensaje
 * ya escrito.
 *
 * El enlace wa.me no le devuelve nada a la app, así que el envío no se detecta:
 * abrir el chat deja el recordatorio PREPARADO (ámbar) y el profesional declara
 * después si lo mandó (verde) o no.
 */
export function BotonRecordatorioWhatsapp({ turno, telefonoPaciente }: PropsBotonRecordatorio) {
  const { vistaPrevia, preparar, confirmar } = useWhatsapp();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [idPreparado, setIdPreparado] = useState<string | null>(null);

  const previa = vistaPrevia({ turnoId: turno.id }, { enabled: abierto });

  // El texto se copia una vez al abrir; a partir de ahí manda lo que edite el
  // profesional.
  useEffect(() => {
    if (previa.data) {
      setMensaje((actual) => (actual === "" ? previa.data.mensaje : actual));
    }
  }, [previa.data]);

  const registrado = turno.recordatorioWhatsapp;
  // Sin teléfono no hay chat que abrir; la prop es opcional, y donde no se pase
  // el error lo devuelve el servidor.
  const sinTelefono = telefonoPaciente !== undefined && !telefonoPaciente;

  const { claseIcono, titulo } = estadoVisual(registrado, sinTelefono);
  const enlace = previa.data ? construirEnlaceWhatsapp(previa.data.telefono, mensaje) : null;
  // Con la Cloud API conectada el mensaje sale solo y lo confirma el webhook:
  // no hay chat que abrir ni envío que declarar.
  const porApi = previa.data?.modo === "API";
  const idParaConfirmar =
    idPreparado ?? (registrado?.estado === "PREPARADO" ? registrado.id : null);

  function abrir(valor: boolean) {
    setAbierto(valor);
    if (!valor) {
      setMensaje("");
      setIdPreparado(null);
    }
  }

  function alAbrirWhatsapp(evento: React.MouseEvent<HTMLAnchorElement>) {
    // El <a> sigue siendo un enlace real (ctrl+click, "abrir en pestaña nueva"),
    // pero la apertura no puede depender de su navegación por defecto: hay
    // extensiones de navegador que cancelan el click y el enlace queda mudo.
    // Abrir la ventana acá, sincrónico dentro del gesto del usuario, es lo que
    // los bloqueadores de popups sí permiten.
    if (enlace && !evento.ctrlKey && !evento.metaKey && !evento.shiftKey) {
      evento.preventDefault();
      const ventana = window.open(enlace, "_blank");
      if (ventana) {
        ventana.opener = null;
      } else {
        toast.error("El navegador bloqueó la apertura de WhatsApp. Revisá los popups.");
      }
    }

    preparar.mutate(
      { turnoId: turno.id, mensaje },
      { onSuccess: (resultado) => setIdPreparado(resultado.recordatorioId) },
    );
  }

  function enviarPorApi() {
    preparar.mutate(
      { turnoId: turno.id, mensaje },
      {
        onSuccess: () => {
          toast.success("Recordatorio enviado por WhatsApp.");
          abrir(false);
        },
      },
    );
  }

  function resolver(enviado: boolean) {
    if (!idParaConfirmar) return;
    confirmar.mutate(
      { recordatorioId: idParaConfirmar, enviado },
      { onSuccess: () => abrir(false) },
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title={titulo}
        disabled={sinTelefono}
        onClick={() => abrir(true)}
      >
        <MessageCircle className={`h-4 w-4 ${claseIcono}`} />
      </Button>

      <Dialog open={abierto} onOpenChange={abrir}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recordar el turno por WhatsApp</DialogTitle>
            <DialogDescription>
              {porApi
                ? "Se envía desde el número del consultorio; el estado lo confirma WhatsApp."
                : "Se abre el chat con el mensaje escrito; enviarlo lo hacés vos desde WhatsApp."}
            </DialogDescription>
          </DialogHeader>

          {previa.isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Preparando el mensaje…</p>
          ) : previa.isError ? (
            <p className="py-6 text-sm text-destructive">{previa.error.message}</p>
          ) : previa.data ? (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{previa.data.nombrePaciente}</p>
                <p className="text-muted-foreground tabular-nums">+{previa.data.telefono}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`mensaje-wa-${turno.id}`}>Mensaje</Label>
                <Textarea
                  id={`mensaje-wa-${turno.id}`}
                  rows={5}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                />
              </div>

              {porApi ? (
                <Button
                  className="w-full"
                  disabled={mensaje.trim() === "" || preparar.isPending}
                  onClick={enviarPorApi}
                >
                  <Send className="h-4 w-4" />
                  Enviar recordatorio
                </Button>
              ) : (
                <>
                  {/* Un <a> de verdad: la apertura tiene que venir de un gesto directo
                      del usuario o los bloqueadores de popups la cortan. */}
                  <Button asChild className="w-full">
                    <a
                      href={enlace ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={mensaje.trim() === ""}
                      className={
                        mensaje.trim() === "" ? "pointer-events-none opacity-50" : undefined
                      }
                      onClick={alAbrirWhatsapp}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                  </Button>

                  <div className="space-y-2 border-t pt-3">
                    <p className="text-sm text-muted-foreground">
                      Cuando lo hayas mandado, marcalo acá para no volver a recordárselo.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!idParaConfirmar || confirmar.isPending}
                        onClick={() => resolver(false)}
                      >
                        No lo envié
                      </Button>
                      <Button
                        size="sm"
                        disabled={!idParaConfirmar || confirmar.isPending}
                        onClick={() => resolver(true)}
                      >
                        Ya lo envié
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Color y tooltip del icono según lo que se sepa del último recordatorio. */
function estadoVisual(
  registrado: TurnoSalidaDto["recordatorioWhatsapp"],
  sinTelefono: boolean,
): { claseIcono: string; titulo: string } {
  if (sinTelefono) {
    return {
      claseIcono: "text-muted-foreground",
      titulo: "El paciente no tiene teléfono cargado",
    };
  }
  if (registrado?.estado === "CONFIRMADO") {
    return {
      claseIcono: "text-emerald-600",
      titulo: `Recordado el ${formatearMomento(registrado.confirmadoEn ?? registrado.creadoEn)}`,
    };
  }
  if (registrado?.estado === "PREPARADO") {
    return {
      claseIcono: "text-amber-600",
      titulo: `Abierto el ${formatearMomento(registrado.creadoEn)} — sin confirmar`,
    };
  }
  return { claseIcono: "text-muted-foreground", titulo: "Recordar por WhatsApp" };
}
