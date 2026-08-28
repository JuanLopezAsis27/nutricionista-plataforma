"use client";

import { Fragment } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
} from "@/dominio/servicios/grasaPorPliegues";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

interface Fila {
  etiqueta: string;
  valor: (m: MedicionComposicionDto) => number | null;
  /** Derivada = la calcula el dominio, no se carga a mano. */
  derivada?: boolean;
}

interface Grupo {
  titulo: string;
  filas: Fila[];
}

/**
 * La planilla completa: una fila por medida, una columna por consulta.
 * Es también la vista de tabla que exige la paleta en tema claro — los
 * números están siempre disponibles, no solo el color de los gráficos.
 */
const GRUPOS: Grupo[] = [
  {
    titulo: "Básicos",
    filas: [
      { etiqueta: "Peso (kg)", valor: (m) => m.medidas.pesoKg },
      {
        etiqueta: "Kg bajados",
        valor: (m) => m.medidas.kgBajadosVsAnterior,
        derivada: true,
      },
      {
        etiqueta: "Kg bajados acum.",
        valor: (m) => m.medidas.kgBajadosAcumulados,
        derivada: true,
      },
      { etiqueta: "Talla (cm)", valor: (m) => m.medidas.tallaCm },
      {
        etiqueta: "Talla sentado (cm)",
        valor: (m) => m.medidas.tallaSentadoCm,
      },
    ],
  },
  {
    titulo: "Diámetros óseos (cm)",
    filas: [
      { etiqueta: "Biacromial", valor: (m) => m.medidas.diamBiacromial },
      {
        etiqueta: "Tórax transverso",
        valor: (m) => m.medidas.diamToraxTransverso,
      },
      {
        etiqueta: "Tórax anteroposterior",
        valor: (m) => m.medidas.diamToraxAnteroposterior,
      },
      {
        etiqueta: "Bi-iliocrestídeo",
        valor: (m) => m.medidas.diamBiiliocrestideo,
      },
      { etiqueta: "Humeral", valor: (m) => m.medidas.diamHumeral },
      { etiqueta: "Femoral", valor: (m) => m.medidas.diamFemoral },
    ],
  },
  {
    titulo: "Perímetros (cm)",
    filas: [
      { etiqueta: "Cabeza", valor: (m) => m.medidas.circCabeza },
      { etiqueta: "Brazo relajado", valor: (m) => m.medidas.circBrazo },
      {
        etiqueta: "Brazo flexionado",
        valor: (m) => m.medidas.circBrazoContraido,
      },
      { etiqueta: "Antebrazo", valor: (m) => m.medidas.circAntebrazo },
      { etiqueta: "Tórax mesoesternal", valor: (m) => m.medidas.circTorax },
      { etiqueta: "Cintura mínima", valor: (m) => m.medidas.circCinturaMinima },
      { etiqueta: "Cintura máxima", valor: (m) => m.medidas.circCinturaMaxima },
      { etiqueta: "Cadera", valor: (m) => m.medidas.circCadera },
      { etiqueta: "Muslo máximo", valor: (m) => m.medidas.circMusloMaximo },
      { etiqueta: "Muslo medial", valor: (m) => m.medidas.circMusloMedial },
      { etiqueta: "Pantorrilla", valor: (m) => m.medidas.circPantorrilla },
    ],
  },
  {
    titulo: "Pliegues cutáneos (mm)",
    filas: [
      { etiqueta: "Tricipital", valor: (m) => m.medidas.pliegueTricipital },
      { etiqueta: "Subescapular", valor: (m) => m.medidas.pliegueSubescapular },
      { etiqueta: "Supraespinal", valor: (m) => m.medidas.pliegueSupraespinal },
      { etiqueta: "Abdominal", valor: (m) => m.medidas.pliegueAbdominal },
      { etiqueta: "Muslo", valor: (m) => m.medidas.pliegueMuslo },
      { etiqueta: "Pantorrilla", valor: (m) => m.medidas.plieguePantorrilla },
      { etiqueta: "Bicipital", valor: (m) => m.medidas.pliegueBicipital },
      {
        etiqueta: "Cresta ilíaca",
        valor: (m) => m.medidas.pliegueCrestaIliaca,
      },
      {
        etiqueta: "Σ 6 pliegues",
        valor: (m) => m.resultado.indices.sumatoria6Pliegues,
        derivada: true,
      },
    ],
  },
  {
    titulo: "Resultados calculados",
    filas: [
      {
        etiqueta: "Masa adiposa (kg)",
        valor: (m) => m.resultado.fraccionamiento?.adiposa.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa muscular (kg)",
        valor: (m) => m.resultado.fraccionamiento?.muscular.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa residual (kg)",
        valor: (m) => m.resultado.fraccionamiento?.residual.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa ósea (kg)",
        valor: (m) => m.resultado.fraccionamiento?.osea.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "Masa de la piel (kg)",
        valor: (m) => m.resultado.fraccionamiento?.piel.kg ?? null,
        derivada: true,
      },
      {
        etiqueta: "IMC",
        valor: (m) => m.resultado.indices.imc,
        derivada: true,
      },
      {
        etiqueta: "Índice cintura/cadera",
        valor: (m) => m.resultado.indices.indiceCinturaCadera,
        derivada: true,
      },
      {
        etiqueta: "Endomorfia",
        valor: (m) => m.resultado.somatotipo?.endomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Mesomorfia",
        valor: (m) => m.resultado.somatotipo?.mesomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Ectomorfia",
        valor: (m) => m.resultado.somatotipo?.ectomorfia ?? null,
        derivada: true,
      },
      {
        etiqueta: "Metabolismo basal (kcal)",
        valor: (m) => m.resultado.energia?.metabolismoBasalKcal ?? null,
        derivada: true,
      },
      {
        etiqueta: "Gasto energético total (kcal)",
        valor: (m) => m.resultado.energia?.gastoEnergeticoTotalKcal ?? null,
        derivada: true,
      },
      { etiqueta: "Kg grasa (manual)", valor: (m) => m.medidas.kgGrasa },
    ],
  },
  {
    titulo: "Grasa por pliegues (2 componentes)",
    // Una fila por ecuación: los valores de métodos distintos NO se comparan
    // entre sí, se leen en paralelo sobre las mismas medidas.
    filas: METODOS_GRASA.map((metodo) => ({
      etiqueta: `${DEFINICIONES_METODO[metodo].etiqueta} (%)`,
      valor: (m: MedicionComposicionDto) =>
        m.resultado.grasaPorPliegues.resultados.find((r) => r.metodo === metodo)
          ?.porcentajeGrasa ?? null,
      derivada: true,
    })),
  },
];

export function TablaMediciones({
  mediciones,
  onEditar,
  onEliminar,
}: {
  mediciones: MedicionComposicionDto[];
  onEditar: (medicion: MedicionComposicionDto) => void;
  onEliminar: (medicion: MedicionComposicionDto) => void;
}) {
  if (mediciones.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Sin mediciones registradas. Cargá la primera consulta para empezar.
      </p>
    );
  }

  // Solo se muestran las medidas que alguna consulta tenga cargadas; las
  // derivadas siempre, para que se vea cuándo faltan datos para calcularlas.
  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    filas: grupo.filas.filter(
      (fila) => fila.derivada || mediciones.some((m) => fila.valor(m) != null),
    ),
  })).filter((grupo) => grupo.filas.length > 0);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted p-2 text-left font-semibold">
              Medida
            </th>
            {mediciones.map((medicion) => (
              <th
                key={medicion.id}
                className="min-w-28 p-2 text-center font-semibold"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{formatearFecha(medicion.fecha)}</span>
                  <span className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Editar medición del ${formatearFecha(medicion.fecha)}`}
                      onClick={() => onEditar(medicion)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      aria-label={`Eliminar medición del ${formatearFecha(medicion.fecha)}`}
                      onClick={() => onEliminar(medicion)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grupos.map((grupo) => (
            <Fragment key={grupo.titulo}>
              <tr className="border-b bg-muted/30">
                <td
                  className="sticky left-0 z-10 bg-muted/60 p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  colSpan={1}
                >
                  {grupo.titulo}
                </td>
                <td colSpan={mediciones.length} />
              </tr>
              {grupo.filas.map((fila) => (
                <tr
                  key={`${grupo.titulo}-${fila.etiqueta}`}
                  className={cn(
                    "border-b last:border-0",
                    fila.derivada && "bg-accent/40",
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 bg-card p-2 font-medium",
                      fila.derivada && "text-accent-foreground",
                    )}
                  >
                    {fila.etiqueta}
                  </td>
                  {mediciones.map((medicion) => (
                    <td
                      key={medicion.id}
                      className="p-2 text-center tabular-nums"
                    >
                      {formatearNumero(fila.valor(medicion))}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
