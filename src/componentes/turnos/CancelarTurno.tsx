"use client";

import { CalendarX, CheckCircle2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import { LogoConsultorio } from "@/componentes/marca/LogoConsultorio";
import { formatearFechaHora } from "@/lib/formato";
import { trpc } from "@/lib/trpc";

export function CancelarTurno({ token }: { token: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        {token ? <Cancelacion token={token} /> : <EnlaceInvalido />}
      </Card>
    </div>
  );
}

/**
 * Cancela recién al apretar el botón, no al abrir la página, por lo mismo que
 * la confirmación: los filtros de correo visitan los enlaces antes que el
 * paciente. Acá importa más todavía, porque cancelar no se deshace.
 */
function Cancelacion({ token }: { token: string }) {
  const cancelar = trpc.turnos.cancelarPorPaciente.useMutation();

  if (cancelar.data) {
    const { fecha, hora, canceladoEn, yaEstabaCancelado } = cancelar.data;
    return (
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">
            {yaEstabaCancelado
              ? "Tu turno ya estaba cancelado"
              : "Turno cancelado"}
          </p>
          <p className="text-sm text-muted-foreground">
            El turno del {fecha} a las {hora} quedó cancelado
            {canceladoEn ? ` el ${formatearFechaHora(canceladoEn)}` : ""}. Ya le
            avisamos a tu nutricionista.
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <CalendarX className="h-6 w-6 text-destructive" />
          Cancelar turno
        </CardTitle>
        <CardDescription>
          Si no vas a poder ir, cancelalo acá y el horario queda libre. Para
          elegir otro día, comunicate con tu nutricionista.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="destructive"
          className="w-full"
          disabled={cancelar.isPending}
          onClick={() => cancelar.mutate({ token })}
        >
          {cancelar.isPending ? "Cancelando…" : "Sí, cancelar mi turno"}
        </Button>
        {cancelar.error && (
          <p className="text-center text-sm text-destructive">
            {cancelar.error.message}
          </p>
        )}
      </CardContent>
    </>
  );
}

function EnlaceInvalido() {
  return (
    <CardContent className="space-y-2 py-8 text-center">
      <p className="font-medium">Enlace inválido</p>
      <p className="text-sm text-muted-foreground">
        Usá el botón del recordatorio que te llegó.
      </p>
    </CardContent>
  );
}
