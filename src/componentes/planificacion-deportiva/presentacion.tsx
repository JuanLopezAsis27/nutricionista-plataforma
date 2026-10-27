"use client";

import {
  Timer,
  Droplets,
  Flame,
  Wheat,
  AlertTriangle,
  Coffee,
} from "lucide-react";
import {
  CAFEINA_MG_KG_HABITUAL,
  type EstadoObjetivo,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { cn } from "@/lib/utilidades";

/**
 * Piezas de presentación que comparten el formulario (con el resumen en
 * vivo), la vista del profesional y el portal del paciente: los mismos
 * números se leen igual en las tres.
 */

/** 225 → «3:45 h»; 50 → «50 min». */
export function textoDuracion(minutos: number | null | undefined): string {
  if (minutos == null) return "—";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}:${String(m).padStart(2, "0")} h`;
}

/** 5.33 → «5:20 /km». */
export function textoRitmo(minPorKm: number | null | undefined): string | null {
  if (minPorKm == null || !Number.isFinite(minPorKm) || minPorKm <= 0) {
    return null;
  }
  let minutos = Math.floor(minPorKm);
  let segundos = Math.round((minPorKm - minutos) * 60);
  if (segundos === 60) {
    minutos += 1;
    segundos = 0;
  }
  return `${minutos}:${String(segundos).padStart(2, "0")} /km`;
}

/** «12,5» para mostrar un número con coma decimal. */
export function numero(valor: number | null | undefined, sufijo = ""): string {
  if (valor == null) return "—";
  return `${String(Math.round(valor * 10) / 10).replace(".", ",")}${sufijo}`;
}

const ESTILO_ESTADO: Record<EstadoObjetivo, string> = {
  DEBAJO:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CUMPLE:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ENCIMA:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const TEXTO_ESTADO: Record<EstadoObjetivo, string> = {
  DEBAJO: "por debajo del objetivo",
  CUMPLE: "en el objetivo",
  ENCIMA: "por encima del objetivo",
};

/** Lo mínimo que necesita la tarjeta: el resumen del dominio o el espejo del formulario. */
export interface ResumenParaMostrar {
  durante: {
    cantidad: number;
    macros: { calorias: number | null; carbohidratosG: number | null };
    liquidosMl: number | null;
    porHora: {
      calorias: number | null;
      carbohidratosG: number | null;
      liquidosMl: number | null;
    };
  };
  antes: {
    cantidad: number;
    macros: { carbohidratosG: number | null };
    liquidosMl: number | null;
  };
  carbohidratos: EstadoObjetivo | null;
  liquidos: EstadoObjetivo | null;
  intervaloMaximoMin: number | null;
  cafeina: {
    antesMg: number | null;
    duranteMg: number | null;
    totalMg: number | null;
    porHoraMg: number | null;
    mgPorKg: number | null;
  };
}

/**
 * Los números de la carrera: lo que se toma por hora contra los objetivos, el
 * total durante la carrera y lo de antes de largar. Avisa si queda un tramo
 * largo sin ingerir (más de una hora): es lo primero que se mira en una
 * estrategia de carrera.
 */
export function TarjetaResumen({
  resumen,
  objetivos,
  pesoKg = null,
  duracionMin = null,
  compacta = false,
}: {
  resumen: ResumenParaMostrar;
  objetivos: {
    carbohidratosGH: number | null;
    liquidosMlH: number | null;
    sodioMgH: number | null;
  };
  /** El peso con el que se calculó el mg/kg, para decirlo. */
  pesoKg?: number | null;
  /**
   * La duración estimada por la que se dividió, para decirla: un «por hora»
   * sin su divisor a la vista no se puede revisar (una duración leída como
   * 3 minutos daba 17.680 kcal/h y nada decía por qué).
   */
  duracionMin?: number | null;
  compacta?: boolean;
}) {
  const { durante, antes, cafeina } = resumen;
  const cafeinaAlta =
    cafeina.mgPorKg != null && cafeina.mgPorKg > CAFEINA_MG_KG_HABITUAL.maximo;
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "grid gap-2",
          compacta
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        )}
      >
        <Indicador
          icono={Wheat}
          titulo="Carbohidratos"
          valor={numero(durante.porHora.carbohidratosG, " g/h")}
          detalle={
            objetivos.carbohidratosGH != null
              ? `Objetivo ${numero(objetivos.carbohidratosGH, " g/h")}`
              : `${numero(durante.macros.carbohidratosG, " g")} en total`
          }
          estado={resumen.carbohidratos}
        />
        <Indicador
          icono={Droplets}
          titulo="Líquidos"
          valor={numero(durante.porHora.liquidosMl, " ml/h")}
          detalle={
            objetivos.liquidosMlH != null
              ? `Objetivo ${numero(objetivos.liquidosMlH, " ml/h")}`
              : `${numero(durante.liquidosMl, " ml")} en total`
          }
          estado={resumen.liquidos}
        />
        <Indicador
          icono={Flame}
          titulo="Energía"
          valor={numero(durante.porHora.calorias, " kcal/h")}
          detalle={`${numero(durante.macros.calorias, " kcal")} en total`}
          estado={null}
        />
        <Indicador
          icono={Timer}
          titulo="Ingestas en carrera"
          valor={String(durante.cantidad)}
          detalle={
            resumen.intervaloMaximoMin != null
              ? `Mayor tramo sin ingerir: ${textoDuracion(resumen.intervaloMaximoMin)}`
              : "—"
          }
          estado={null}
        />
        <Indicador
          icono={Coffee}
          titulo="Cafeína"
          valor={
            cafeina.mgPorKg != null
              ? numero(cafeina.mgPorKg, " mg/kg")
              : numero(cafeina.totalMg, " mg")
          }
          detalle={
            cafeina.totalMg == null
              ? "Ningún alimento trae cafeína"
              : [
                  cafeina.mgPorKg != null &&
                    `${numero(cafeina.totalMg, " mg")} para ${numero(pesoKg, " kg")}`,
                  cafeina.mgPorKg == null && "Cargá el peso para el mg/kg",
                  cafeina.porHoraMg != null &&
                    `${cafeina.porHoraMg} mg/h en carrera`,
                ]
                  .filter(Boolean)
                  .join(" · ")
          }
          estado={cafeinaAlta ? "ENCIMA" : null}
          textoEstado={
            cafeinaAlta
              ? `por encima de ${CAFEINA_MG_KG_HABITUAL.maximo} mg/kg`
              : undefined
          }
        />
      </div>

      {cafeinaAlta && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          La cafeína supera el rango habitual de las guías (
          {CAFEINA_MG_KG_HABITUAL.minimo} a {CAFEINA_MG_KG_HABITUAL.maximo}{" "}
          mg/kg).
        </p>
      )}

      {resumen.intervaloMaximoMin != null &&
        resumen.intervaloMaximoMin > 60 &&
        durante.cantidad > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Hay un tramo de {textoDuracion(resumen.intervaloMaximoMin)} sin
            ninguna ingesta.
          </p>
        )}

      <p className="text-xs text-muted-foreground">
        {duracionMin != null && duracionMin > 0
          ? `Por hora = lo que se toma entre la largada y la llegada, dividido por la duración estimada (${textoDuracion(duracionMin)}).`
          : "Sin duración estimada no hay valores por hora."}
        {antes.cantidad > 0 &&
          ` Antes de largar: ${antes.cantidad} ${antes.cantidad === 1 ? "ingesta" : "ingestas"} · ${numero(antes.macros.carbohidratosG, " g")} de carbohidratos${antes.liquidosMl != null ? ` · ${numero(antes.liquidosMl, " ml")}` : ""}${cafeina.antesMg != null ? ` · ${numero(cafeina.antesMg, " mg")} de cafeína` : ""}. No cuentan para los valores por hora (la cafeína sí suma al total).`}
        {objetivos.sodioMgH != null &&
          ` Sodio: objetivo de ${numero(objetivos.sodioMgH, " mg/h")} (los alimentos no traen sodio, así que no se suma).`}
      </p>
    </div>
  );
}

function Indicador({
  icono: Icono,
  titulo,
  valor,
  detalle,
  estado,
  textoEstado,
}: {
  icono: typeof Timer;
  titulo: string;
  valor: string;
  detalle: string;
  estado: EstadoObjetivo | null;
  /** Reemplaza el texto del estado («por encima del objetivo»). */
  textoEstado?: string;
}) {
  const leyenda = estado ? (textoEstado ?? TEXTO_ESTADO[estado]) : null;
  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        estado ? ESTILO_ESTADO[estado] : "bg-muted/30",
      )}
      title={leyenda ?? undefined}
    >
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icono className="h-3.5 w-3.5" /> {titulo}
      </p>
      <p className="text-lg font-semibold tabular-nums">{valor}</p>
      <p className="text-[0.7rem] leading-tight opacity-80">
        {detalle}
        {leyenda && ` · ${leyenda}`}
      </p>
    </div>
  );
}
