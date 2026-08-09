"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { CalendarClock, Mail, Lock, CheckCircle2, PlugZap } from "lucide-react";
import { useIntegraciones } from "@/lib/hooks/useIntegraciones";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { FormularioCredenciales } from "@/componentes/configuracion/FormularioCredenciales";
import { ImportadorAlimentos } from "@/componentes/configuracion/ImportadorAlimentos";

const MENSAJES_ERROR: Record<string, string> = {
  "no-configurado": "La integración con Google todavía no está configurada.",
  "no-disponible": "La integración con Google no está disponible.",
  estado: "No se pudo validar la conexión (token de seguridad). Probá de nuevo.",
  denegado: "Cancelaste el permiso en Google.",
  fallo: "No se pudo conectar con Google. Probá de nuevo.",
};

/** Pantalla de integraciones externas — conexión de Google (Calendar + Gmail). */
export default function PaginaIntegraciones() {
  const { estado, desconectarGoogle } = useIntegraciones();
  const consulta = estado();
  const google = consulta.data?.google;

  // Feedback del flujo OAuth (?conectado / ?error) sin useSearchParams (evita Suspense).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("conectado")) toast.success("¡Google conectado!");
    const error = params.get("error");
    if (error) toast.error(MENSAJES_ERROR[error] ?? "Ocurrió un error con Google.");
    if (params.get("conectado") || error) {
      window.history.replaceState({}, "", "/dashboard/integraciones");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conectá Google (calendario y correo), la IA (Claude) y la base de ingredientes
          (FatSecret). Tus claves se guardan cifradas.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <PlugZap className="h-5 w-5 text-primary" /> Google
            </span>
            {consulta.isLoading ? null : !google?.configurado ? (
              <Badge variant="outline">No configurado</Badge>
            ) : google.conectado ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
              </Badge>
            ) : (
              <Badge variant="outline">Sin conectar</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {consulta.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : !google?.configurado ? (
            <p className="text-sm text-muted-foreground">
              La app todavía no tiene credenciales de Google configuradas. Pedile al
              administrador que cargue <code>GOOGLE_CLIENT_ID</code> y{" "}
              <code>GOOGLE_CLIENT_SECRET</code> (y <code>TOKENS_SECRET</code>) en el entorno.
            </p>
          ) : google.conectado ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Conectado como <strong>{google.emailCuenta}</strong>. Tus turnos se sincronizan
                con tu Google Calendar y los emails salen de tu Gmail.
              </p>
              <Button
                variant="outline"
                disabled={desconectarGoogle.isPending}
                onClick={() => desconectarGoogle.mutate()}
              >
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Conectá tu cuenta para activar la sincronización de calendario y el envío de
                emails desde tu casilla.
              </p>
              <Button asChild>
                <a href="/api/integraciones/google/conectar">Conectar con Google</a>
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-md border p-3">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Cada turno que agendás, reprogramás o cancelás se refleja en tu calendario.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Gmail</p>
                <p className="text-xs text-muted-foreground">
                  Los recordatorios y la bienvenida se envían desde tu propia casilla.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alimentos propios (Excel): si hay lista, desactiva FatSecret. */}
      <ImportadorAlimentos />

      {/* IA (Claude) + Ingredientes (FatSecret): claves que carga el profesional. */}
      <FormularioCredenciales />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Tus credenciales se guardan cifradas (AES-256-GCM) y nunca en texto plano.
      </p>
    </div>
  );
}
