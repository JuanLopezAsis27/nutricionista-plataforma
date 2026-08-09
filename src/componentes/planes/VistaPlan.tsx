import { Clock, BookOpen } from "lucide-react";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";

/**
 * Vista de solo lectura de un plan nutricional, organizada por franjas.
 * Reutilizada en el detalle del plan, la ficha del paciente y el portal.
 */
export function VistaPlan({ plan }: { plan: PlanSalidaDto }) {
  const metas = [
    plan.caloriasMeta != null && { valor: `${plan.caloriasMeta} kcal`, etiqueta: "Calorías" },
    plan.proteinasMetaG != null && { valor: `${plan.proteinasMetaG} g`, etiqueta: "Proteínas" },
    plan.carbohidratosMetaG != null && {
      valor: `${plan.carbohidratosMetaG} g`,
      etiqueta: "Carbohidratos",
    },
    plan.grasasMetaG != null && { valor: `${plan.grasasMetaG} g`, etiqueta: "Grasas" },
  ].filter((meta): meta is { valor: string; etiqueta: string } => Boolean(meta));

  const nutricionales = plan.recomendaciones.filter((r) => r.tipo === "NUTRICIONAL");
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
          <p className="mt-1 text-sm text-muted-foreground">{plan.descripcion}</p>
        )}
      </div>

      {metas.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {metas.map((meta) => (
            <div key={meta.etiqueta} className="rounded-lg border bg-card px-4 py-2">
              <p className="font-semibold">{meta.valor}</p>
              <p className="text-xs uppercase text-muted-foreground">{meta.etiqueta}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {plan.comidas.map((comida) => (
          <Card key={comida.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                {comida.nombre}
                {(comida.horaDesde || comida.horaHasta) && (
                  <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {[comida.horaDesde, comida.horaHasta].filter(Boolean).join(" a ")} hs
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {comida.opciones.map((opcion) => (
                <div key={opcion.id} className="rounded-md border p-3">
                  {comida.opciones.length > 1 && (
                    <p className="mb-1 text-xs font-semibold text-primary">
                      Opción {opcion.numero}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{opcion.contenido}</p>
                  {opcion.recetaNombre && (
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" /> Receta: {opcion.recetaNombre}
                      {opcion.recetaMacros && macrosReceta(opcion.recetaMacros) && (
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
        ))}
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
                <CardTitle className="text-base">Recomendaciones nutricionales</CardTitle>
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
                <CardTitle className="text-base">Recomendaciones de salud</CardTitle>
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

      {plan.contactosUtiles && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contactos útiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{plan.contactosUtiles}</p>
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
