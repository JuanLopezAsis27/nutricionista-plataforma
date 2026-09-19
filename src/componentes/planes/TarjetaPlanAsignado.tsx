"use client";

import Link from "next/link";
import {
  ChevronRight,
  Clock,
  FileText,
  BookOpen,
  Paperclip,
} from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { esDocumentoWord } from "@/dominio/entidades/Archivo";
import { Badge } from "@/componentes/ui/badge";
import { Card } from "@/componentes/ui/card";

/**
 * Cómo se abre la tarjeta: o cambia algo en la pantalla (`onAbrir`, la ficha
 * del paciente abre el plan en su lugar) o lleva a otra página (`href`, el
 * portal tiene `/mi-plan/[id]`). Es una cosa o la otra, nunca las dos.
 */
type PropsTarjetaPlanAsignado = { plan: PlanSalidaDto } & (
  { onAbrir: () => void; href?: never } | { href: string; onAbrir?: never }
);

/**
 * Un plan asignado, en chico: lo suficiente para elegir entre varios sin
 * abrirlos. La usan la ficha del paciente y el portal: los dos tienen que
 * resumir el plan igual.
 *
 * La tarjeta ENTERA es el control que abre el plan completo, y por eso es un
 * `<button>` o un enlace de verdad, nunca un `div` con `onClick`: así se llega
 * con Tab y se abre con Enter como cualquier otro control. Las acciones del
 * plan —PDF, desasignar— NO van acá adentro: un control dentro de otro no es
 * HTML válido, y además la decisión de sacarle un plan a alguien no debería
 * estar a un clic de distancia de "quiero leerlo". Van en la vista abierta.
 *
 * Qué se muestra depende de la modalidad, con el mismo criterio que la tabla de
 * `/dashboard/planes`: el plan cargado en la app se resume por sus FRANJAS, el
 * subido por sus DOCUMENTOS. Mostrar "0 franjas" en un plan en PDF se leería
 * como que está vacío, cuando la pregunta no aplica.
 */
export function TarjetaPlanAsignado({
  plan,
  onAbrir,
  href,
}: PropsTarjetaPlanAsignado) {
  const esApp = plan.modalidad === "APP";
  const primerDocumento = plan.documentos[0];

  const datos = [
    esApp
      ? {
          icono: Clock,
          texto: `${plan.comidas.length} ${plan.comidas.length === 1 ? "franja" : "franjas"}`,
        }
      : {
          icono: FileText,
          texto: `${plan.documentos.length} ${plan.documentos.length === 1 ? "documento" : "documentos"}`,
        },
    plan.recetasVinculadas.length > 0 && {
      icono: BookOpen,
      texto: `${plan.recetasVinculadas.length} ${plan.recetasVinculadas.length === 1 ? "receta" : "recetas"}`,
    },
    plan.adjuntos.length > 0 && {
      icono: Paperclip,
      texto: `${plan.adjuntos.length} ${plan.adjuntos.length === 1 ? "anexo" : "anexos"}`,
    },
  ].filter((dato): dato is { icono: typeof Clock; texto: string } =>
    Boolean(dato),
  );

  const clases =
    "group flex w-full items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const contenido = (
    <>
      <span className="min-w-0 flex-1 space-y-2">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{plan.nombre}</span>
          {/* Mismo badge que la tabla de planes: en modalidad PDF importa si
                el documento es un Word, porque se abre distinto. */}
          {!esApp && (
            <Badge variant="secondary">
              {primerDocumento && esDocumentoWord(primerDocumento.mimeType)
                ? "Word"
                : "PDF"}
            </Badge>
          )}
          {plan.archivado && <Badge variant="outline">Archivado</Badge>}
        </span>

        {/* `line-clamp-2` ya pone su propio display; agregarle `block` sería
              pelearle por cuál gana. */}
        {plan.descripcion && (
          <span className="line-clamp-2 text-sm text-muted-foreground">
            {plan.descripcion}
          </span>
        )}

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {datos.map(({ icono: Icono, texto }) => (
            <span key={texto} className="inline-flex items-center gap-1">
              <Icono className="h-3.5 w-3.5" />
              {texto}
            </span>
          ))}
          {plan.caloriasMeta != null && (
            <span className="tabular-nums">{plan.caloriasMeta} kcal</span>
          )}
        </span>
      </span>

      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );

  return (
    <Card className="overflow-hidden transition-colors hover:border-primary/40">
      {href !== undefined ? (
        <Link href={href} className={clases}>
          {contenido}
        </Link>
      ) : (
        <button type="button" onClick={onAbrir} className={clases}>
          {contenido}
        </button>
      )}
    </Card>
  );
}
