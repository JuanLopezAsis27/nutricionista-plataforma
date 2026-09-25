import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { formatearFechaHora } from "@/lib/formato";

/**
 * Cuándo y quién canceló un turno: «Cancelado por el paciente el 23/09/2026
 * 14:10». Solo se dibuja si hay fecha; los cancelados antes de la migración 76
 * no la tienen y no hay nada honesto que mostrar.
 *
 * Que lo canceló el PACIENTE es lo que más importa: significa que lo hizo
 * desde el recordatorio y nadie del consultorio lo tocó.
 */
export function InfoCancelacion({
  turno,
  className,
}: {
  turno: Pick<TurnoSalidaDto, "estado" | "canceladoEn" | "canceladoPor">;
  className?: string;
}) {
  if (turno.estado !== "CANCELADO" || !turno.canceladoEn) return null;
  return (
    <span className={className ?? "block text-xs text-muted-foreground"}>
      {turno.canceladoPor === "PACIENTE"
        ? "Cancelado por el paciente"
        : "Cancelado"}{" "}
      el {formatearFechaHora(turno.canceladoEn)}
    </span>
  );
}
