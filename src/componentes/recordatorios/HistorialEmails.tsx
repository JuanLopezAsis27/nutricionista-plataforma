"use client";

import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import { formatearFechaLarga } from "@/lib/formato";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";

/**
 * Los últimos emails que salieron del consultorio.
 *
 * Vive en Seguimiento y no en una pantalla aparte porque responde la misma
 * pregunta que la bandeja de WhatsApp de arriba —"¿esto llegó?"— y el
 * profesional no la piensa por canal: la piensa por paciente.
 */
export function HistorialEmails() {
  const { emailsRecientes } = useSecretaria();
  const consulta = emailsRecientes({ limite: 15 });
  const envios = consulta.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5 text-muted-foreground" /> Emails enviados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : envios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no se envió ningún email.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {envios.map((envio) => (
              <li
                key={envio.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    {envio.asunto}{" "}
                    <span className="text-muted-foreground">
                      → {envio.para}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatearFechaLarga(envio.creadoEn)} ·{" "}
                    <span className="font-mono">{envio.plantillaClave}</span>
                  </p>
                </div>
                {envio.error ? (
                  <XCircle
                    className="h-4 w-4 shrink-0 text-destructive"
                    aria-label="Con error"
                  />
                ) : (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-label="Enviado"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
