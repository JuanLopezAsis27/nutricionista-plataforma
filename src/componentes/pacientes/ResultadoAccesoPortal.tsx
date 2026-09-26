"use client";

import { toast } from "sonner";
import { Copy, KeyRound, Printer, TicketCheck } from "lucide-react";
import type {
  InvitacionEmitidaSalidaDto,
  ResultadoAccesoSalidaDto,
} from "@/aplicacion/dtos/acceso-portal.dto";
import { formatearFecha } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";

/**
 * Lo que queda para entregarle a la persona después de darle acceso al portal
 * (migración 80): sus credenciales o el código de invitación.
 *
 * Se muestra UNA vez: la contraseña se guarda hasheada y el código también, así
 * que no se pueden volver a ver. Por eso va en pantalla con copiar e imprimir,
 * y no en un toast que se va solo.
 */
export function ResultadoAccesoPortal({
  nombrePaciente,
  resultado,
  contrasena,
  onListo,
}: {
  nombrePaciente: string;
  resultado: ResultadoAccesoSalidaDto;
  /** La que se cargó (o generó); solo para `CUENTA_NUEVA`. */
  contrasena: string | null;
  onListo: () => void;
}) {
  return (
    <div className="space-y-4">
      {resultado.tipo === "CUENTA_NUEVA" && contrasena !== null && (
        <Credenciales
          nombrePaciente={nombrePaciente}
          identificador={resultado.identificador}
          contrasena={contrasena}
        />
      )}
      {resultado.tipo === "INVITACION" && (
        <>
          <p className="text-sm">
            <strong>{nombrePaciente}</strong> ya tiene una cuenta con otro
            profesional, así que no se le creó otra. Para sumar este
            consultorio, tiene que cargar este código desde su cuenta, en «Mis
            consultorios».
          </p>
          {resultado.invitacion ? (
            <CodigoInvitacion
              nombrePaciente={nombrePaciente}
              invitacion={resultado.invitacion}
            />
          ) : (
            <p className="text-sm text-destructive">
              No se pudo generar el código. Generalo desde su ficha, en «Acceso
              al portal».
            </p>
          )}
        </>
      )}
      <div className="flex justify-end">
        <Button type="button" onClick={onListo}>
          Listo
        </Button>
      </div>
    </div>
  );
}

/** Usuario y contraseña, para copiar o imprimir y darlos en mano. */
export function Credenciales({
  nombrePaciente,
  identificador,
  contrasena,
}: {
  nombrePaciente: string;
  identificador: string;
  contrasena: string;
}) {
  const texto = `Usuario: ${identificador}\nContraseña: ${contrasena}`;
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-primary" />
        Datos de acceso de {nombrePaciente}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Usuario</dt>
        <dd className="break-all font-mono">{identificador}</dd>
        <dt className="text-muted-foreground">Contraseña</dt>
        <dd className="break-all font-mono">{contrasena}</dd>
      </dl>
      <p className="text-xs text-muted-foreground">
        Anotalos ahora: la contraseña no se puede volver a ver. Si la pierde, se
        la restablecés desde su ficha.
      </p>
      <Acciones
        texto={texto}
        titulo={`Acceso al portal — ${nombrePaciente}`}
        cuerpo={`<p>Usuario: <strong>${escapar(identificador)}</strong></p><p>Contraseña: <strong>${escapar(contrasena)}</strong></p><p>Entrá desde ${escapar(window.location.origin)}/login</p>`}
      />
    </div>
  );
}

/** El código de invitación recién emitido. */
export function CodigoInvitacion({
  nombrePaciente,
  invitacion,
}: {
  nombrePaciente: string;
  invitacion: InvitacionEmitidaSalidaDto;
}) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <TicketCheck className="h-4 w-4 text-primary" />
        Código de invitación
      </p>
      <p className="text-center font-mono text-2xl font-bold tracking-widest">
        {invitacion.codigo}
      </p>
      <p className="text-xs text-muted-foreground">
        Vence el {formatearFecha(invitacion.expiraEn)}.{" "}
        {invitacion.enviadaA
          ? `Se lo mandamos a ${invitacion.enviadaA}.`
          : "Dáselo en mano o por WhatsApp."}{" "}
        No se puede volver a ver: si se pierde, generá otro.
      </p>
      {invitacion.falloEnvio && (
        <p className="text-xs text-destructive">
          No se pudo mandar por email: {invitacion.falloEnvio}
        </p>
      )}
      <Acciones
        texto={invitacion.codigo}
        titulo={`Invitación al portal — ${nombrePaciente}`}
        cuerpo={`<p>Entrá a tu cuenta, abrí «Mis consultorios» y cargá este código:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${escapar(invitacion.codigo)}</p>`}
      />
    </div>
  );
}

function Acciones({
  texto,
  titulo,
  cuerpo,
}: {
  texto: string;
  titulo: string;
  cuerpo: string;
}) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado.");
    } catch {
      toast.error("No se pudo copiar: seleccionalo y copialo a mano.");
    }
  }

  /** Una hoja aparte con solo esto: imprimir la pantalla entera sacaría todo. */
  function imprimir() {
    const ventana = window.open("", "_blank", "width=480,height=600");
    if (!ventana) {
      toast.error("El navegador bloqueó la ventana de impresión.");
      return;
    }
    ventana.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapar(titulo)}</title></head>` +
        `<body style="font-family:system-ui,sans-serif;padding:24px"><h2>${escapar(titulo)}</h2>${cuerpo}</body></html>`,
    );
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copiar}>
        <Copy className="h-4 w-4" />
        Copiar
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={imprimir}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
