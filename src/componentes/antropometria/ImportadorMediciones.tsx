"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
} from "lucide-react";
import type { MedicionSugeridaDto } from "@/aplicacion/dtos/evaluacion.dto";
import {
  CAMPOS_PLANTILLA,
  ETIQUETAS_CAMPO_PLANTILLA,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { formatearFecha } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";

/** Medidas editables de una fila, además del peso: las de la plantilla + kgGrasa. */
const CAMPOS_MEDIDA = [...CAMPOS_PLANTILLA, "kgGrasa"] as const;
type CampoMedida = (typeof CAMPOS_MEDIDA)[number];

const ETIQUETAS_MEDIDA: Record<CampoMedida, string> = {
  ...ETIQUETAS_CAMPO_PLANTILLA,
  kgGrasa: "Kg de grasa",
};

const ACEPTA_PLANILLA =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx," +
  "application/pdf,image/jpeg,image/png,image/webp";

/**
 * Una fila de la revisión: lo que la IA leyó, ya en texto para poder editarlo
 * en los inputs, más si se importa o no.
 */
interface FilaRevision {
  importar: boolean;
  fecha: string;
  pesoKg: string;
  medidas: Partial<Record<CampoMedida, string>>;
  /** Se abrió el detalle de las medidas de esta consulta. */
  abierta: boolean;
}

/**
 * Importación de mediciones desde la planilla de evolución del profesional.
 *
 * El caso real: el seguimiento venía en un Excel con una columna por consulta
 * y años de historia. Cargarlo a mano son 20 medidas × 10 fechas, así que la
 * IA lee la planilla entera y se importan TODAS las consultas de una vez.
 *
 * Dos reglas que hacen a que esto sea seguro:
 *
 * - **Nada se guarda hasta que el profesional confirma.** La IA precarga la
 *   tabla y cada fila se revisa, se corrige o se descarta. Es la misma
 *   política que la lectura de una ficha de alta: lo que sale de un modelo no
 *   entra solo al historial de una persona.
 * - **La importación no es todo-o-nada.** Una fecha que ya tenía medición o
 *   una medida fuera de rango se informan al final; el resto entra igual.
 */
export function ImportadorMediciones({
  pacienteId,
  onTerminado,
}: {
  pacienteId: string;
  onTerminado: () => void;
}) {
  const { interpretarMedicionesDesdeArchivo, importarMediciones } =
    useEvaluacion();

  const [nombreEnPlanilla, setNombreEnPlanilla] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaRevision[] | null>(null);

  function alSubirPlanilla(archivo: { id: string }) {
    interpretarMedicionesDesdeArchivo.mutate(
      { pacienteId, archivoId: archivo.id },
      {
        onSuccess: (leida) => {
          setNombreEnPlanilla(leida.nombreEnPlanilla);
          setFilas(leida.mediciones.map(aFila));
          if (leida.mediciones.length === 0) {
            toast.warning(
              "No se reconoció ninguna medición en la planilla. Revisá que tenga el peso de cada consulta.",
            );
          }
        },
      },
    );
  }

  function cambiarFila(indice: number, cambios: Partial<FilaRevision>) {
    setFilas((actuales) =>
      (actuales ?? []).map((fila, i) =>
        i === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  function cambiarMedida(indice: number, campo: CampoMedida, valor: string) {
    setFilas((actuales) =>
      (actuales ?? []).map((fila, i) =>
        i === indice
          ? { ...fila, medidas: { ...fila.medidas, [campo]: valor } }
          : fila,
      ),
    );
  }

  function alImportar() {
    if (!filas) return;
    const elegidas = filas.filter((fila) => fila.importar);

    const lote = elegidas.flatMap((fila) => {
      const pesoKg = aNumeroONull(fila.pesoKg);
      if (!fila.fecha || pesoKg === null) return [];
      return [
        {
          // La fecha se arma en UTC: `Antropometria.fecha` es un DATE a
          // medianoche UTC y construirla en la zona local correría el día.
          fecha: new Date(`${fila.fecha}T00:00:00.000Z`),
          pesoKg,
          ...medidasDe(fila),
        },
      ];
    });

    // Fecha y peso son la identidad y el mínimo de una medición (una por
    // paciente y fecha; sin peso la entidad no se crea). Se avisa acá en vez
    // de dejar que el servidor rechace el lote entero por una fila.
    if (lote.length !== elegidas.length) {
      toast.error(
        "Hay mediciones marcadas sin fecha o sin peso. Completalas o desmarcalas para importar.",
      );
      return;
    }

    importarMediciones.mutate(
      { pacienteId, mediciones: lote },
      {
        onSuccess: (resultado) => {
          const afuera = resultado.resultados.filter(
            (item) => item.estado !== "REGISTRADA",
          );
          if (afuera.length === 0) {
            toast.success(
              `${resultado.registradas} mediciones importadas al historial.`,
            );
          } else {
            toast.warning(
              `${resultado.registradas} importadas. ${afuera.length} quedaron afuera: ${afuera
                .map((item) => `${formatearFecha(item.fecha)} (${item.motivo})`)
                .join("; ")}`,
              { duration: 12000 },
            );
          }
          onTerminado();
        },
      },
    );
  }

  // --- Paso 1: subir la planilla ---------------------------------------------
  if (!filas) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Subí la planilla de evolución del paciente: un Excel (.xlsx), un PDF o
          una foto. La IA lee <span className="font-medium">todas</span> las
          consultas que tenga cargadas —una columna por fecha— y las trae para
          revisar. Nada se guarda hasta que confirmes.
        </p>
        <SubidorArchivo
          contexto="paciente"
          pacienteId={pacienteId}
          accept={ACEPTA_PLANILLA}
          sinVistaPrevia
          onSubido={alSubirPlanilla}
        />
        {interpretarMedicionesDesdeArchivo.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Leyendo la planilla… puede tardar un rato si tiene muchas consultas.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Las columnas sin peso no se importan: sin peso no hay medición. Lo que
          la planilla calcule sola (sumatoria de pliegues, kg bajados, % de
          grasa) tampoco: eso lo recalcula el sistema con cada lectura.
        </p>
      </div>
    );
  }

  const aImportar = filas.filter((fila) => fila.importar).length;

  // --- Paso 2: revisar y confirmar --------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <p className="flex items-center gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
          {filas.length === 1
            ? "1 medición leída de la planilla."
            : `${filas.length} mediciones leídas de la planilla.`}{" "}
          Revisalas antes de importar.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilas(null);
            setNombreEnPlanilla(null);
          }}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Otra planilla
        </Button>
      </div>

      {nombreEnPlanilla && (
        <p className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            La planilla está a nombre de{" "}
            <span className="font-medium">{nombreEnPlanilla}</span>. Verificá
            que sea el paciente de esta ficha: las mediciones se importan acá.
          </span>
        </p>
      )}

      <div className="space-y-2">
        {filas.map((fila, indice) => {
          const cargadas = CAMPOS_MEDIDA.filter(
            (campo) => aNumeroONull(fila.medidas[campo]) !== null,
          );
          return (
            <div
              key={indice}
              className={cn(
                "rounded-md border p-3",
                !fila.importar && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={fila.importar}
                    onChange={(evento) =>
                      cambiarFila(indice, { importar: evento.target.checked })
                    }
                    aria-label="Importar esta medición"
                  />
                  <span className="text-xs text-muted-foreground">
                    Importar
                  </span>
                </label>

                <div className="space-y-1">
                  <Label className="text-xs">Fecha</Label>
                  <Input
                    type="date"
                    className="w-40"
                    value={fila.fecha}
                    onChange={(evento) =>
                      cambiarFila(indice, { fecha: evento.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input
                    inputMode="decimal"
                    className="w-24"
                    value={fila.pesoKg}
                    onChange={(evento) =>
                      cambiarFila(indice, { pesoKg: evento.target.value })
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    cambiarFila(indice, { abierta: !fila.abierta })
                  }
                  className="flex items-center gap-1 pb-2 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={fila.abierta}
                >
                  {fila.abierta ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  {cargadas.length === 1
                    ? "1 medida más"
                    : `${cargadas.length} medidas más`}
                </button>

                {!fila.fecha && (
                  <p className="pb-2 text-xs text-destructive">
                    Sin fecha: completala para poder importarla.
                  </p>
                )}
              </div>

              {fila.abierta && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
                  {CAMPOS_MEDIDA.map((campo) => (
                    <div key={campo} className="space-y-1">
                      <Label className="text-xs">
                        {ETIQUETAS_MEDIDA[campo]}
                      </Label>
                      <Input
                        inputMode="decimal"
                        value={fila.medidas[campo] ?? ""}
                        onChange={(evento) =>
                          cambiarMedida(indice, campo, evento.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onTerminado}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={aImportar === 0 || importarMediciones.isPending}
          onClick={alImportar}
        >
          {importarMediciones.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Importar {aImportar} {aImportar === 1 ? "medición" : "mediciones"}
        </Button>
      </div>
    </div>
  );
}

/** Lo leído por la IA → la fila editable de la tabla de revisión. */
function aFila(medicion: MedicionSugeridaDto): FilaRevision {
  const medidas: Partial<Record<CampoMedida, string>> = {};
  for (const campo of CAMPOS_MEDIDA) {
    const valor = medicion[campo];
    if (valor != null) medidas[campo] = String(valor);
  }
  return {
    // Una medición sin fecha arranca DESMARCADA: importarla sin querer la
    // guardaría con una fecha que nadie eligió.
    importar: medicion.fecha !== null,
    fecha: medicion.fecha ?? "",
    pesoKg: medicion.pesoKg != null ? String(medicion.pesoKg) : "",
    medidas,
    abierta: false,
  };
}

/** Las medidas cargadas de una fila, ya numéricas; las vacías no viajan. */
function medidasDe(fila: FilaRevision): Partial<Record<CampoMedida, number>> {
  const medidas: Partial<Record<CampoMedida, number>> = {};
  for (const campo of CAMPOS_MEDIDA) {
    const valor = aNumeroONull(fila.medidas[campo]);
    if (valor !== null) medidas[campo] = valor;
  }
  return medidas;
}

function aNumeroONull(valor: string | undefined): number | null {
  if (valor === undefined) return null;
  const limpio = valor.trim().replace(",", ".");
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}
