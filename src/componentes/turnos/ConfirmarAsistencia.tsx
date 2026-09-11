"use client";

import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import { LogoConsultorio } from "@/componentes/marca/LogoConsultorio";
import { trpc } from "@/lib/trpc";

export function ConfirmarAsistencia({ token }: { token: string }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        {token ? <Confirmacion token={token} /> : <EnlaceInvalido />}
      </Card>
    </div>
  );
}

/**
 * Confirma recién al apretar el botón, no al abrir la página: los filtros de
 * correo visitan los enlaces antes que el paciente.
 */
function Confirmacion({ token }: { token: string }) {
  const confirmar = trpc.turnos.confirmarAsistencia.useMutation();

  if (confirmar.data) {
    const { fecha, hora, yaEstabaConfirmado } = confirmar.data;
    return (
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">
            {yaEstabaConfirmado
              ? "Tu turno ya estaba confirmado"
              : "¡Turno confirmado!"}
          </p>
          <p className="text-sm text-muted-foreground">
            Te esperamos el {fecha} a las {hora}.
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <CalendarCheck className="h-6 w-6 text-primary" />
          Confirmar asistencia
        </CardTitle>
        <CardDescription>
          Avisale a tu nutricionista que vas a ir al turno.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          disabled={confirmar.isPending}
          onClick={() => confirmar.mutate({ token })}
        >
          {confirmar.isPending ? "Confirmando…" : "Confirmar mi asistencia"}
        </Button>
        {confirmar.error && (
          <p className="text-center text-sm text-destructive">
            {confirmar.error.message}
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
        Usá el botón del email de recordatorio que te llegó.
      </p>
    </CardContent>
  );
}
