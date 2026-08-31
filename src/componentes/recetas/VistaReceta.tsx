import { Users, Flame, FileText, ExternalLink } from "lucide-react";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import { Badge } from "@/componentes/ui/badge";

/**
 * Vista de solo lectura de una receta (detalle del recetario y portal).
 * Las fotos y los documentos se sirven vía /api/archivos/[id]/ver, que los
 * devuelve EN LÍNEA desde la app: la ruta hermana los ofrece para bajar.
 */
export function VistaReceta({ receta }: { receta: RecetaSalidaDto }) {
  const macros = [
    receta.calorias != null && `${receta.calorias} kcal`,
    receta.proteinasG != null && `${receta.proteinasG} g prot`,
    receta.carbohidratosG != null && `${receta.carbohidratosG} g carb`,
    receta.grasasG != null && `${receta.grasasG} g grasas`,
  ].filter(Boolean);

  const totales = [
    receta.totales.calorias != null && `${receta.totales.calorias} kcal`,
    receta.totales.proteinasG != null && `${receta.totales.proteinasG} g prot`,
    receta.totales.carbohidratosG != null &&
      `${receta.totales.carbohidratosG} g carb`,
    receta.totales.grasasG != null && `${receta.totales.grasasG} g grasas`,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {receta.porciones != null && (
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {receta.porciones} porción(es)
          </span>
        )}
        {macros.length > 0 && (
          <span className="flex items-center gap-1">
            <Flame className="h-4 w-4" /> {macros.join(" · ")}
            {receta.porciones != null && receta.porciones > 1
              ? " / porción"
              : ""}
          </span>
        )}
      </div>

      {receta.macrosCalculados &&
        totales.length > 0 &&
        receta.porciones != null &&
        receta.porciones > 1 && (
          <p className="text-xs text-muted-foreground">
            Total de la receta: {totales.join(" · ")} (calculado de los
            ingredientes)
          </p>
        )}

      {receta.descripcion && <p className="text-sm">{receta.descripcion}</p>}

      {receta.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {receta.etiquetas.map((etiqueta) => (
            <Badge key={etiqueta} variant="secondary">
              {etiqueta}
            </Badge>
          ))}
        </div>
      )}

      {receta.fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* La principal primero: es la misma que se ve en el recetario, y
              que acá apareciera en otro lugar haría dudar de cuál es. */}
          {[...receta.fotos]
            .sort((a, b) =>
              a.id === receta.fotoPrincipalId
                ? -1
                : b.id === receta.fotoPrincipalId
                  ? 1
                  : 0,
            )
            .map((foto) => (
              <a
                key={foto.id}
                href={`/api/archivos/${foto.id}/ver`}
                target="_blank"
                rel="noreferrer"
                title={foto.nombreOriginal}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ruta dinámica autorizada, no optimizable */}
                <img
                  src={`/api/archivos/${foto.id}/ver`}
                  alt={`Foto de ${receta.nombre}`}
                  className="h-28 w-28 rounded-lg border object-cover"
                />
              </a>
            ))}
        </div>
      )}

      {receta.ingredientes.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Ingredientes</h3>
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {receta.ingredientes.map((ingrediente, indice) => (
              <li key={indice}>
                {ingrediente.nombre}
                {ingrediente.cantidadGramos != null && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {ingrediente.cantidadGramos} g
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {receta.preparacion && (
        <div>
          <h3 className="mb-1 font-semibold">Preparación</h3>
          <p className="whitespace-pre-line text-sm">{receta.preparacion}</p>
        </div>
      )}

      {receta.documentos.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Documentos</h3>
          <ul className="space-y-1">
            {receta.documentos.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/archivos/${doc.id}/ver`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{doc.nombreOriginal}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {receta.enlaces.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Enlaces</h3>
          <ul className="space-y-1">
            {receta.enlaces.map((enlace) => (
              <li key={enlace}>
                <a
                  href={enlace}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 break-all text-sm text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="break-all">{enlace}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
