import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utilidades";

/**
 * Advertencia fija de todas las pantallas con IA.
 *
 * Va SIEMPRE, esté la IA activa o no, y por eso es distinta del banner de
 * «modo demostración»: aquel dice que todavía no hay clave cargada y desaparece
 * cuando la hay; este dice algo que no deja de ser cierto nunca —la función se
 * sigue desarrollando y un modelo de lenguaje puede equivocarse aunque esté
 * perfectamente configurado—. Son dos avisos con dos vidas distintas.
 *
 * El texto cambia según quién mira: al paciente se le dice a quién preguntarle
 * (su nutricionista); al profesional, que revise antes de usarlo con alguien.
 */
export function AvisoIA({
  audiencia,
  className,
}: {
  audiencia: "paciente" | "profesional";
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <p className="text-muted-foreground">
        <strong className="text-foreground">
          Función en desarrollo, revisá lo que te responde.
        </strong>{" "}
        {audiencia === "paciente" ? (
          <>
            La IA se sigue mejorando y no siempre acierta: puede equivocarse o
            entender mal tu pregunta. Tomá sus respuestas como orientación y
            confirmá con tu nutricionista antes de cambiar algo de tu plan.
          </>
        ) : (
          <>
            La IA se sigue mejorando y no garantiza respuestas exactas: puede
            equivocarse o interpretar mal los datos. Verificá contra la ficha
            del paciente antes de tomar una decisión clínica.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * La misma advertencia comprimida, para meterla adentro de un chat sin comerse
 * el alto que necesita el hilo.
 */
export function AvisoIABreve({
  audiencia,
  className,
}: {
  audiencia: "paciente" | "profesional";
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-1.5 rounded-md bg-muted/60 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground",
        className,
      )}
    >
      <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-amber-600 dark:text-amber-500" />
      <span>
        Función en desarrollo: la IA puede equivocarse.{" "}
        {audiencia === "paciente"
          ? "Confirmá con tu nutricionista antes de cambiar algo de tu plan."
          : "Verificá los datos antes de decidir sobre un paciente."}
      </span>
    </p>
  );
}
