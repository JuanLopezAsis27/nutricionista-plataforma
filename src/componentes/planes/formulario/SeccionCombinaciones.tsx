"use client";

import { useMemo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Trophy, AlertTriangle, Loader2 } from "lucide-react";
import type {
  CombinacionDto,
  EvaluarCombinacionesDto,
} from "@/aplicacion/dtos/plan.dto";
import type { TipoMeta } from "@/dominio/servicios/comparacionMacros";
import { usePlanes } from "@/lib/hooks/usePlanes";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utilidades";
import { COLOR_ESTADO_META } from "@/componentes/comunes/paletaFranjas";
import { SIN_RECETA, aNumero, type DatosFormulario } from "./esquema";

const MACROS = [
  { clave: "calorias", etiqueta: "Calorías", unidad: "kcal" },
  { clave: "proteinasG", etiqueta: "Proteínas", unidad: "g" },
  { clave: "carbohidratosG", etiqueta: "Carbohidratos", unidad: "g" },
  { clave: "grasasG", etiqueta: "Grasas", unidad: "g" },
] as const;

const SIMBOLO_TIPO: Record<TipoMeta, string> = {
  APROXIMADO: "≈",
  MINIMO: "≥",
  MAXIMO: "≤",
};

/**
 * Las combinaciones del día que mejor cumplen las metas, mientras se edita.
 *
 * Un día concreto es UNA opción por franja; con varias opciones por franja
 * hay muchos días posibles y cada uno suma distinto. Este panel muestra los
 * tres que mejor se ajustan a las metas diarias —el primero destacado— para
 * que el profesional vea si el plan cierra y cuánto se aleja la peor de las
 * buenas.
 *
 * La cuenta la hace el SERVIDOR (`planes.evaluarCombinaciones`): lee las
 * recetas del recetario —sus macros por porción— y ordena con la misma regla
 * que el dominio. La pantalla solo manda el borrador, con un retraso para no
 * pedirlo en cada tecla, y conserva el resultado anterior mientras llega el
 * nuevo para que el panel no parpadee.
 */
export function SeccionCombinaciones({
  control,
}: {
  control: Control<DatosFormulario>;
}) {
  const { evaluarCombinaciones } = usePlanes();
  const valores = useWatch({ control });

  // El borrador se serializa para que el retraso compare por contenido: el
  // objeto de `useWatch` es nuevo en cada render aunque nada haya cambiado.
  const serializado = useMemo(
    () => JSON.stringify(aBorrador(valores)),
    [valores],
  );
  const retrasado = useDebounce(serializado, 600);
  const borrador = useMemo(
    () => JSON.parse(retrasado) as EvaluarCombinacionesDto,
    [retrasado],
  );

  const consulta = evaluarCombinaciones(borrador, {
    enabled: borrador.comidas.length > 0,
    placeholderData: (anterior) => anterior,
  });
  const resultado = consulta.data;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Combinaciones del día</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {consulta.isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          {resultado &&
            `${resultado.total.toLocaleString("es-AR")} ${
              resultado.total === 1 ? "día posible" : "días posibles"
            } (una opción por franja)`}
        </span>
      </div>

      {!resultado ? (
        <p className="text-sm text-muted-foreground">
          {consulta.isError
            ? "No se pudieron calcular las combinaciones."
            : "Calculando…"}
        </p>
      ) : resultado.metasCargadas === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cargá al menos una meta diaria para ver qué combinaciones de opciones
          la cumplen.
        </p>
      ) : resultado.mejores.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay opciones para combinar.
        </p>
      ) : (
        <>
          {!resultado.exhaustivo && (
            <p className="text-xs text-muted-foreground">
              Son demasiadas para revisarlas todas: estas son las mejores que
              encontró una búsqueda aproximada.
            </p>
          )}
          <ol className="grid gap-3 lg:grid-cols-3">
            {resultado.mejores.map((combinacion, indice) => (
              <TarjetaCombinacion
                key={combinacion.elecciones
                  .map((e) => `${e.franja}:${e.opcion}`)
                  .join("|")}
                combinacion={combinacion}
                puesto={indice + 1}
                metasCargadas={resultado.metasCargadas}
              />
            ))}
          </ol>
        </>
      )}

      {resultado && resultado.avisos.length > 0 && (
        <ul className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          {resultado.avisos.map((aviso, i) => (
            <li key={i} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {aviso.franja}, opción {aviso.opcion}: «{aviso.alimento}» ya es
                ingrediente de la receta «{aviso.receta}». Se suma aparte
                (además de la receta): dejalo solo si es una cantidad extra.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaCombinacion({
  combinacion,
  puesto,
  metasCargadas,
}: {
  combinacion: CombinacionDto;
  puesto: number;
  metasCargadas: number;
}) {
  const mejor = puesto === 1;
  return (
    <li
      className={cn(
        "space-y-2 rounded-md border p-3 text-sm",
        mejor && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          {mejor && <Trophy className="h-4 w-4 text-primary" />}
          {mejor ? "Mejor combinación" : `Alternativa ${puesto - 1}`}
        </span>
        <span className="text-xs text-muted-foreground">
          Cumple {combinacion.metasCumplidas} de {metasCargadas}
        </span>
      </div>

      <ul className="space-y-0.5 text-xs">
        {combinacion.elecciones.map((eleccion) => (
          <li key={eleccion.franja} className="flex justify-between gap-2">
            <span className="truncate text-muted-foreground">
              {eleccion.franja}
            </span>
            <span className="shrink-0 font-medium">
              Opción {eleccion.opcion}
            </span>
          </li>
        ))}
      </ul>

      <ul className="space-y-1 border-t pt-2">
        {MACROS.map((macro) => {
          const comparacion = combinacion.comparacion[macro.clave];
          return (
            <li
              key={macro.clave}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span>{macro.etiqueta}</span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium">
                  {comparacion.valor != null
                    ? `${comparacion.valor} ${macro.unidad}`
                    : "—"}
                </span>
                {comparacion.meta != null && (
                  <span
                    className={cn(
                      "rounded border px-1 text-[0.65rem]",
                      COLOR_ESTADO_META[comparacion.estado],
                    )}
                    title={`Meta ${SIMBOLO_TIPO[comparacion.tipo]} ${comparacion.meta} ${macro.unidad}`}
                  >
                    {SIMBOLO_TIPO[comparacion.tipo]} {comparacion.meta}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

/** Un valor del formulario como número dentro de un rango, o null. */
function enRango(valor: string | undefined, maximo: number): number | null {
  const numero = aNumero(valor ?? "");
  return numero != null && numero >= 0 && numero <= maximo ? numero : null;
}

/**
 * El borrador que entiende `evaluarCombinacionesDto`, armado desde lo que hay
 * en el formulario AHORA. Lo que todavía no es válido (un número a medio
 * escribir, un alimento sin nombre) se deja afuera en vez de mandarlo: el
 * panel evalúa lo que ya se puede sumar, y el formulario marca el resto.
 */
function aBorrador(
  valores: ReturnType<typeof useWatch<DatosFormulario>>,
): EvaluarCombinacionesDto {
  const calorias = enRango(valores.caloriasMeta, 100_000);
  return {
    comidas: (valores.comidas ?? []).slice(0, 15).map((comida) => ({
      nombre: (comida?.nombre ?? "").slice(0, 80),
      opciones: (comida?.opciones ?? []).slice(0, 20).map((opcion) => ({
        recetaId:
          opcion?.recetaId && opcion.recetaId !== SIN_RECETA
            ? opcion.recetaId
            : null,
        porciones: (() => {
          const p = enRango(opcion?.porciones, 20);
          return p != null && p > 0 ? p : null;
        })(),
        items: (opcion?.items ?? [])
          .filter((item) => (item?.nombre ?? "").trim() !== "")
          .slice(0, 30)
          .map((item) => ({
            nombre: (item?.nombre ?? "").trim().slice(0, 200),
            cantidadGramos: enRango(item?.cantidadGramos, 5000),
            caloriasPor100: enRango(item?.caloriasPor100, 2000),
            proteinasPor100: enRango(item?.proteinasPor100, 2000),
            carbohidratosPor100: enRango(item?.carbohidratosPor100, 2000),
            grasasPor100: enRango(item?.grasasPor100, 2000),
          })),
      })),
    })),
    caloriasMeta: calorias != null ? Math.round(calorias) : null,
    proteinasMetaG: enRango(valores.proteinasMetaG, 10_000),
    carbohidratosMetaG: enRango(valores.carbohidratosMetaG, 10_000),
    grasasMetaG: enRango(valores.grasasMetaG, 10_000),
    tiposMeta: valores.tiposMeta,
  };
}
