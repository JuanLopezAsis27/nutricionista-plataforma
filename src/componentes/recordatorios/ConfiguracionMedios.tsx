"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  CalendarDays,
  CircleAlert,
  Send,
  Plug,
} from "lucide-react";
import type { ConfiguracionRecordatoriosSalidaDto } from "@/aplicacion/dtos/recordatorios.dto";
import { useRecordatorios } from "@/lib/hooks/useRecordatorios";
import { MAX_AVISOS_POR_MEDIO } from "@/dominio/entidades/ConfiguracionRecordatorios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Badge } from "@/componentes/ui/badge";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/componentes/ui/select";

/** Anticipaciones que se ofrecen; la lista tapa los casos reales de consultorio. */
const DIAS_OFRECIDOS = [0, 1, 2, 3, 5, 7, 14];
/** Avisos del evento de calendario, en minutos antes del turno. */
const AVISOS_CALENDARIO = [
  { minutos: 2880, etiqueta: "2 días antes" },
  { minutos: 1440, etiqueta: "1 día antes" },
  { minutos: 180, etiqueta: "3 horas antes" },
  { minutos: 60, etiqueta: "1 hora antes" },
  { minutos: 30, etiqueta: "30 minutos antes" },
];
/** Márgenes ofrecidos para volver a avisarle a un paciente el mismo turno. */
const MARGENES = [
  { horas: 6, etiqueta: "6 horas" },
  { horas: 12, etiqueta: "12 horas" },
  { horas: 24, etiqueta: "1 día" },
  { horas: 48, etiqueta: "2 días" },
  { horas: 72, etiqueta: "3 días" },
  { horas: 168, etiqueta: "1 semana" },
];
const HORAS = Array.from(
  { length: 24 },
  (_, i) => `${String(i).padStart(2, "0")}:00`,
);

type Estado = ConfiguracionRecordatoriosSalidaDto;

/**
 * Los tres medios de recordatorio con sus dos interruptores cada uno.
 *
 * La distinción entre "activo" y "automático" no es cosmética y la pantalla la
 * dice: activo es que el medio se usa, automático es que además sale solo. Un
 * medio activo pero no automático es el profesional que quiere elegir a mano a
 * quién le manda, que es el caso más común al empezar.
 */
export function ConfiguracionMedios() {
  const { configuracion, guardarConfiguracion, enviarProgramados } =
    useRecordatorios();
  const consulta = configuracion();
  const [borrador, setBorrador] = useState<Estado | null>(null);

  useEffect(() => {
    if (consulta.data) setBorrador(consulta.data);
  }, [consulta.data]);

  if (consulta.isLoading || !borrador) {
    return <Skeleton className="h-96 w-full" />;
  }

  const cambiar = <C extends keyof Estado>(campo: C, valor: Estado[C]) =>
    setBorrador((previo) => (previo ? { ...previo, [campo]: valor } : previo));

  function guardar() {
    if (!borrador) return;
    guardarConfiguracion.mutate({
      whatsappActivo: borrador.whatsappActivo,
      whatsappAutomatico: borrador.whatsappAutomatico,
      whatsappDiasAntes: borrador.whatsappDiasAntes,
      emailActivo: borrador.emailActivo,
      emailAutomatico: borrador.emailAutomatico,
      emailDiasAntes: borrador.emailDiasAntes,
      calendarioActivo: borrador.calendarioActivo,
      calendarioInvitarPaciente: borrador.calendarioInvitarPaciente,
      calendarioMinutosAntes: borrador.calendarioMinutosAntes,
      horaEnvio: borrador.horaEnvio,
      horasEntreAvisos: borrador.horasEntreAvisos,
    });
  }

  return (
    <div className="space-y-4">
      {/* --- WhatsApp --- */}
      <Medio
        icono={<MessageCircle className="h-5 w-5 text-primary" />}
        titulo="WhatsApp"
        activo={borrador.whatsappActivo}
        onActivo={(v) => cambiar("whatsappActivo", v)}
        automatico={borrador.whatsappAutomatico}
        onAutomatico={(v) => cambiar("whatsappAutomatico", v)}
        aviso={
          borrador.whatsappConectado ? null : (
            <>
              La API oficial no está conectada: los recordatorios se preparan
              como enlaces que abrís vos. Para que salgan solos, conectala en{" "}
              <Link
                href="/dashboard/integraciones"
                className="font-medium underline"
              >
                Integraciones → WhatsApp
              </Link>
              .
            </>
          )
        }
      >
        <SelectorDias
          etiqueta="Días de anticipación"
          valores={borrador.whatsappDiasAntes}
          onCambio={(v) => cambiar("whatsappDiasAntes", v)}
          deshabilitado={
            !borrador.whatsappActivo || !borrador.whatsappAutomatico
          }
        />
      </Medio>

      {/* --- Email --- */}
      <Medio
        icono={<Mail className="h-5 w-5 text-primary" />}
        titulo="Email"
        activo={borrador.emailActivo}
        onActivo={(v) => cambiar("emailActivo", v)}
        automatico={borrador.emailAutomatico}
        onAutomatico={(v) => cambiar("emailAutomatico", v)}
        aviso={
          <>
            Usa la plantilla{" "}
            <span className="font-mono">RECORDATORIO_TURNO</span>, que se edita
            en la pestaña Plantillas de esta misma pantalla.
          </>
        }
      >
        <SelectorDias
          etiqueta="Días de anticipación"
          valores={borrador.emailDiasAntes}
          onCambio={(v) => cambiar("emailDiasAntes", v)}
          deshabilitado={!borrador.emailActivo || !borrador.emailAutomatico}
        />
      </Medio>

      {/* --- Calendario --- */}
      <Medio
        icono={<CalendarDays className="h-5 w-5 text-primary" />}
        titulo="Calendario"
        activo={borrador.calendarioActivo}
        onActivo={(v) => cambiar("calendarioActivo", v)}
        aviso={
          borrador.googleConectado ? (
            "Al agendar un turno se crea el evento en tu Google Calendar."
          ) : (
            <>
              Google no está conectado, así que no se crea ningún evento.
              Conectalo en{" "}
              <Link
                href="/dashboard/integraciones"
                className="inline-flex items-center gap-1 font-medium underline"
              >
                <Plug className="h-3.5 w-3.5" /> Integraciones
              </Link>
              .
            </>
          )
        }
      >
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={borrador.calendarioInvitarPaciente}
            disabled={!borrador.calendarioActivo}
            onChange={(e) =>
              cambiar("calendarioInvitarPaciente", e.target.checked)
            }
          />
          <span>
            Invitar al paciente al evento
            <span className="block text-xs text-muted-foreground">
              Le llega la invitación a su mail y el turno le queda en SU
              calendario, con los avisos de abajo sonando en su teléfono. Sin
              esto, el evento existe solo en el tuyo.
            </span>
          </span>
        </label>

        <div className="space-y-1.5">
          <Label>Avisos del evento</Label>
          <div className="flex flex-wrap gap-2">
            {AVISOS_CALENDARIO.map((aviso) => {
              const tildado = borrador.calendarioMinutosAntes.includes(
                aviso.minutos,
              );
              return (
                <Pastilla
                  key={aviso.minutos}
                  activa={tildado}
                  deshabilitada={!borrador.calendarioActivo}
                  onClick={() =>
                    cambiar(
                      "calendarioMinutosAntes",
                      tildado
                        ? borrador.calendarioMinutosAntes.filter(
                            (m) => m !== aviso.minutos,
                          )
                        : [...borrador.calendarioMinutosAntes, aviso.minutos],
                    )
                  }
                >
                  {aviso.etiqueta}
                </Pastilla>
              );
            })}
          </div>
        </div>
      </Medio>

      {/* --- Hora del barrido --- */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label>Hora del envío automático</Label>
            <Select
              value={horaEnPunto(borrador.horaEnvio)}
              onValueChange={(v) => cambiar("horaEnvio", v)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORAS.map((hora) => (
                  <SelectItem key={hora} value={hora}>
                    {hora}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A esta hora salen los recordatorios automáticos del día, por todos
              los medios.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>No repetir el aviso antes de</Label>
            <Select
              value={String(borrador.horasEntreAvisos)}
              onValueChange={(v) => cambiar("horasEntreAvisos", Number(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARGENES.map((m) => (
                  <SelectItem key={m.horas} value={String(m.horas)}>
                    {m.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="max-w-xs text-xs text-muted-foreground">
              Cuánto tiene que pasar para poder volver a avisarle a un paciente
              el mismo turno. Antes de ese plazo se lo omite del envío, salvo
              que tildes «Reenviar».
            </p>
          </div>

          <Button
            variant="outline"
            className="ml-auto"
            disabled={enviarProgramados.isPending}
            onClick={() => enviarProgramados.mutate()}
          >
            <Send className="h-4 w-4" />
            {enviarProgramados.isPending
              ? "Enviando…"
              : "Enviar los de hoy ahora"}
          </Button>
          <Button disabled={guardarConfiguracion.isPending} onClick={guardar}>
            Guardar configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** El `horaEnvio` guardado puede traer minutos; el selector ofrece horas en punto. */
function horaEnPunto(hora: string): string {
  return `${hora.slice(0, 2)}:00`;
}

function Medio({
  icono,
  titulo,
  activo,
  onActivo,
  automatico,
  onAutomatico,
  aviso,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  activo: boolean;
  onActivo: (v: boolean) => void;
  automatico?: boolean;
  onAutomatico?: (v: boolean) => void;
  aviso?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className={activo ? undefined : "opacity-75"}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icono} {titulo}
          {!activo && <Badge variant="outline">Desactivado</Badge>}
        </CardTitle>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={activo}
            onChange={(e) => onActivo(e.target.checked)}
          />
          Activo
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        {aviso && (
          <p className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{aviso}</span>
          </p>
        )}

        {onAutomatico && (
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={automatico}
              disabled={!activo}
              onChange={(e) => onAutomatico(e.target.checked)}
            />
            <span>
              Enviar automáticamente
              <span className="block text-xs text-muted-foreground">
                Sin esto el medio sigue disponible, pero los mandás vos desde la
                pestaña Enviar.
              </span>
            </span>
          </label>
        )}

        {children}
      </CardContent>
    </Card>
  );
}

function SelectorDias({
  etiqueta,
  valores,
  onCambio,
  deshabilitado,
}: {
  etiqueta: string;
  valores: number[];
  onCambio: (v: number[]) => void;
  deshabilitado: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{etiqueta}</Label>
      <div className="flex flex-wrap gap-2">
        {DIAS_OFRECIDOS.map((dias) => {
          const tildado = valores.includes(dias);
          return (
            <Pastilla
              key={dias}
              activa={tildado}
              // El tope existe en el dominio; acá se impide llegar al error.
              deshabilitada={
                deshabilitado ||
                (!tildado && valores.length >= MAX_AVISOS_POR_MEDIO)
              }
              onClick={() =>
                onCambio(
                  tildado
                    ? valores.filter((d) => d !== dias)
                    : [...valores, dias],
                )
              }
            >
              {dias === 0
                ? "El mismo día"
                : dias === 1
                  ? "1 día antes"
                  : `${dias} días antes`}
            </Pastilla>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Cada opción marcada es UN aviso: con «3 días antes» y «1 día antes» el
        paciente recibe dos.
      </p>
    </div>
  );
}

function Pastilla({
  activa,
  deshabilitada,
  onClick,
  children,
}: {
  activa: boolean;
  deshabilitada?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitada}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        activa
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
