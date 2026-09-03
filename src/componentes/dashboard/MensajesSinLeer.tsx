"use client";

import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { useMensajeria } from "@/lib/hooks/useMensajeria";
import { formatearFechaHora } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";

/** Cuántas conversaciones se listan antes de mandar a la bandeja completa. */
const MAXIMO = 5;

/**
 * Los pacientes que escribieron y todavía no tienen respuesta.
 *
 * Ordenadas por el último mensaje: lo que hace falta responder primero es lo
 * más reciente, no lo que más mensajes acumuló. Un paciente esperando
 * respuesta es la clase de cosa que se pierde entre pestañas, así que va al
 * inicio y no en el módulo de mensajes.
 */
export function MensajesSinLeer() {
  const { conversaciones } = useMensajeria();
  const consulta = conversaciones();

  const pendientes = (consulta.data ?? [])
    .filter((conversacion) => conversacion.noLeidos > 0)
    .sort(
      (a, b) =>
        (b.ultimoMensajeEn?.getTime() ?? 0) -
        (a.ultimoMensajeEn?.getTime() ?? 0),
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
            <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </span>
          Mensajes sin leer
          {pendientes.length > 0 && (
            <Badge variant="secondary">{pendientes.length}</Badge>
          )}
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/mensajes">
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {consulta.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : consulta.isError ? (
          <p className="text-sm text-destructive">
            No se pudieron cargar las conversaciones.
          </p>
        ) : pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay mensajes sin responder.
          </p>
        ) : (
          <ul className="divide-y">
            {pendientes.slice(0, MAXIMO).map((conversacion) => (
              <li key={conversacion.id} className="py-2.5 first:pt-0">
                <Link
                  href="/dashboard/mensajes"
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {inicialesDe(conversacion.pacienteNombre)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {conversacion.pacienteNombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conversacion.ultimoMensajeTexto ?? "Sin texto"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {conversacion.ultimoMensajeEn && (
                      <span className="text-xs text-muted-foreground">
                        {formatearFechaHora(conversacion.ultimoMensajeEn)}
                      </span>
                    )}
                    <Badge className="bg-rose-500 text-white hover:bg-rose-500">
                      {conversacion.noLeidos}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pendientes.length > MAXIMO && (
          <p className="pt-2 text-xs text-muted-foreground">
            y {pendientes.length - MAXIMO} conversación
            {pendientes.length - MAXIMO === 1 ? "" : "es"} más.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Las iniciales del paciente, para el círculo de la lista. */
function inicialesDe(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}
