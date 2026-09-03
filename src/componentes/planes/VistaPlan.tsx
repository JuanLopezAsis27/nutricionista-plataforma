import {
  Clock,
  BookOpen,
  Paperclip,
  ExternalLink,
  Repeat2,
} from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { cn } from "@/lib/utilidades";
import { estiloDeFranja } from "@/componentes/comunes/paletaFranjas";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { VisorPdf } from "@/componentes/comunes/VisorPdf";
import { formatearTamano } from "@/lib/formato";

/**
 * Vista de solo lectura de un plan nutricional, organizada por franjas.
 * Reutilizada en el detalle del plan, la ficha del paciente y el portal.
 *
 * Muestra lo que el plan ES, según su modalidad: el visor del archivo si es un
 * plan en PDF, las franjas si se cargó en la app. Los ANEXOS van al final en
 * los dos casos, como material de apoyo: nunca arriba, porque un anexo no es
 * el plan y ponerlo primero es exactamente lo que llevó a separar las dos
 * modalidades.
 *
 * Que el visor viva acá y no en cada pantalla es lo que hace que el paciente lo
 * vea en «Mi plan» sin tocar esa página.
 *
 * Cada franja lleva el color de su POSICIÓN, el mismo criterio y la misma
 * paleta que la grilla semanal (`comunes/paletaFranjas`): para el paciente,
 * «Mi plan» y «Mi semana» son dos vistas de lo que come, y que el almuerzo
 * cambiara de color entre una y otra rompe lo único que el color hace —ubicar
 * la franja sin leer—.
 */
export function VistaPlan({ plan }: { plan: PlanSalidaDto }) {
  const metas = [
    plan.caloriasMeta != null && {
      valor: `${plan.caloriasMeta} kcal`,
      etiqueta: "Calorías",
    },
    plan.proteinasMetaG != null && {
      valor: `${plan.proteinasMetaG} g`,
      etiqueta: "Proteínas",
    },
    plan.carbohidratosMetaG != null && {
      valor: `${plan.carbohidratosMetaG} g`,
      etiqueta: "Carbohidratos",
    },
    plan.grasasMetaG != null && {
      valor: `${plan.grasasMetaG} g`,
      etiqueta: "Grasas",
    },
  ].filter((meta): meta is { valor: string; etiqueta: string } =>
    Boolean(meta),
  );

  const nutricionales = plan.recomendaciones.filter(
    (r) => r.tipo === "NUTRICIONAL",
  );
  const salud = plan.recomendaciones.filter((r) => r.tipo === "SALUD");

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{plan.nombre}</h2>
          {plan.esPlantilla && <Badge variant="secondary">Plantilla</Badge>}
          {plan.archivado && <Badge variant="outline">Archivado</Badge>}
        </div>
        {plan.descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.descripcion}
          </p>
        )}
      </div>

      {metas.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {metas.map((meta) => (
            <div
              key={meta.etiqueta}
              className="rounded-xl border bg-card px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {meta.etiqueta}
              </p>
              <p className="pt-1 text-xl font-bold tabular-nums leading-none">
                {meta.valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {plan.archivoPrincipal && (
        <VisorPdf
          archivoId={plan.archivoPrincipal.id}
          titulo={plan.archivoPrincipal.nombreOriginal}
        />
      )}

      {plan.modalidad === "PDF" && !plan.archivoPrincipal && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Este plan está en PDF, pero el archivo ya no está disponible. Volvé a
          subirlo desde la edición del plan.
        </p>
      )}

      <div className="space-y-3">
        {plan.comidas.map((comida, indice) => {
          const estilo = estiloDeFranja(indice);
          return (
            <Card
              key={comida.id}
              className={cn("overflow-hidden", estilo.celda)}
            >
              <CardHeader className={cn("border-b p-3", estilo.rotulo)}>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", estilo.punto)}
                    />
                    <span className={estilo.texto}>{comida.nombre}</span>
                  </span>
                  {(comida.horaDesde || comida.horaHasta) && (
                    <span className="flex items-center gap-1 text-xs font-normal tabular-nums text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {[comida.horaDesde, comida.horaHasta]
                        .filter(Boolean)
                        .join(" a ")}{" "}
                      hs
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 bg-card p-3 text-sm">
                {/* Las opciones de una franja son intercambiables entre sí: se
                  come UNA. Sin decirlo, tres opciones se leen como tres
                  comidas —el mismo malentendido que evita el plan semanal al
                  sumar solo la principal de cada celda—. */}
                {comida.opciones.length > 1 && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Repeat2 className="h-3.5 w-3.5" />
                    Elegí una de las {comida.opciones.length} opciones.
                  </p>
                )}
                {comida.opciones.map((opcion) => (
                  <div key={opcion.id} className="rounded-lg border p-3">
                    {comida.opciones.length > 1 && (
                      <p className="mb-1 text-xs font-semibold text-primary">
                        Opción {opcion.numero}
                      </p>
                    )}
                    <p className="whitespace-pre-line">{opcion.contenido}</p>
                    {opcion.recetaNombre && (
                      <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" /> Receta:{" "}
                        {opcion.recetaNombre}
                        {opcion.recetaMacros &&
                          macrosReceta(opcion.recetaMacros) && (
                            <span className="text-muted-foreground/80">
                              · {macrosReceta(opcion.recetaMacros)} / porción
                            </span>
                          )}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plan.equivalencias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Equivalencias</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {plan.equivalencias.map((equivalencia) => (
                <li key={equivalencia.id}>
                  <span className="font-medium">{equivalencia.titulo}: </span>
                  {equivalencia.detalle}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {(nutricionales.length > 0 || salud.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {nutricionales.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Recomendaciones nutricionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {nutricionales.map((r) => (
                    <li key={r.id}>{r.texto}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {salud.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Recomendaciones de salud
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {salud.map((r) => (
                    <li key={r.id}>{r.texto}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {plan.adjuntos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Material adjunto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {plan.adjuntos.map((adjunto) => (
                <li key={adjunto.id} className="py-2 first:pt-0 last:pb-0">
                  <a
                    href={`/api/archivos/${adjunto.id}/ver`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium hover:text-primary"
                  >
                    <span className="truncate">{adjunto.nombreOriginal}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatearTamano(adjunto.tamanoBytes)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {plan.contactosUtiles && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contactos útiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">
              {plan.contactosUtiles}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Resume los macros por porción de una receta en una línea (o "" si no hay datos). */
function macrosReceta(m: {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}): string {
  return [
    m.calorias != null && `${m.calorias} kcal`,
    m.proteinasG != null && `${m.proteinasG} g P`,
    m.carbohidratosG != null && `${m.carbohidratosG} g C`,
    m.grasasG != null && `${m.grasasG} g G`,
  ]
    .filter(Boolean)
    .join(" · ");
}
