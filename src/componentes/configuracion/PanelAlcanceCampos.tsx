"use client";

import { Check, X } from "lucide-react";
import {
  estadoDeResultados,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";

/**
 * Qué se puede y qué NO se puede calcular con los campos tildados.
 *
 * Las dos mitades importan. La de arriba dice qué sigue en pie; la de abajo es
 * la que convierte la poda en una decisión: sin ver que sacar la cresta ilíaca
 * se lleva puesto Durnin & Womersley —y que era ESE el campo— destildar es a
 * ciegas, y el resultado recién se nota al cargar la primera medición.
 *
 * Lee la MISMA tabla de requisitos que valida el servidor
 * (`REQUISITOS_RESULTADO`), así que lo que promete es lo que se acepta.
 */
export function PanelAlcanceCampos({
  campos,
}: {
  campos: readonly CampoPlantilla[];
}) {
  const estados = estadoDeResultados(campos);
  const cubiertos = estados.filter((estado) => estado.cubierto);
  const perdidos = estados.filter((estado) => !estado.cubierto);

  return (
    <div className="space-y-2.5 rounded-md border p-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold">
          Con estos {campos.length} campos se calcula:
        </p>
        {cubiertos.length === 0 ? (
          <p className="text-xs text-destructive">
            Ningún resultado: no alcanza para ninguna ecuación ni para el
            fraccionamiento.
          </p>
        ) : (
          <ul className="space-y-1 text-xs">
            {cubiertos.map((estado) => (
              <li key={estado.clave} className="flex items-start gap-1.5">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  aria-hidden
                />
                <span>
                  {estado.etiqueta}
                  {estado.sexo !== "AMBOS" && (
                    <span className="text-muted-foreground">
                      {" "}
                      — solo en{" "}
                      {estado.sexo === "FEMENINO" ? "mujeres" : "varones"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {perdidos.length > 0 && (
        <div className="space-y-1 border-t pt-2.5">
          <p className="text-xs font-semibold text-muted-foreground">
            No se va a poder calcular:
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {perdidos.map((estado) => (
              <li key={estado.clave} className="flex items-start gap-1.5">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  {estado.etiqueta}
                  {/* El motivo es la mitad del dato: nombra las medidas que
                      hay que volver a tildar para recuperarlo. */}
                  {estado.faltan.length > 0 && (
                    <span className="block">
                      Falta {estado.faltan.join(", ").toLowerCase()}.
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
