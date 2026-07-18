"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { MedicionEvolucionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import { Button } from "@/componentes/ui/button";

interface PropsTabla {
  mediciones: MedicionEvolucionDto[];
  onEditar: (medicion: MedicionEvolucionDto) => void;
  onEliminar: (medicion: MedicionEvolucionDto) => void;
}

/** Filas de la planilla: etiqueta + cómo leer el valor + si es derivada. */
const FILAS: {
  etiqueta: string;
  valor: (m: MedicionEvolucionDto) => number | null;
  derivada?: boolean;
}[] = [
  { etiqueta: "Peso (kg)", valor: (m) => m.pesoKg },
  { etiqueta: "Kg bajados", valor: (m) => m.kgBajadosVsAnterior, derivada: true },
  { etiqueta: "Kg bajados acum.", valor: (m) => m.kgBajadosAcumulados, derivada: true },
  { etiqueta: "Talla (cm)", valor: (m) => m.tallaCm },
  { etiqueta: "P. tricipital", valor: (m) => m.pliegueTricipital },
  { etiqueta: "P. subescapular", valor: (m) => m.pliegueSubescapular },
  { etiqueta: "P. supraespinal", valor: (m) => m.pliegueSupraespinal },
  { etiqueta: "P. abdominal", valor: (m) => m.pliegueAbdominal },
  { etiqueta: "P. muslo", valor: (m) => m.pliegueMuslo },
  { etiqueta: "P. pantorrilla", valor: (m) => m.plieguePantorrilla },
  { etiqueta: "P. bicipital", valor: (m) => m.pliegueBicipital },
  { etiqueta: "P. cresta ilíaca", valor: (m) => m.pliegueCrestaIliaca },
  { etiqueta: "Σ 6 pliegues (mm)", valor: (m) => m.sumatoria6Pliegues, derivada: true },
  { etiqueta: "C. tórax", valor: (m) => m.circTorax },
  { etiqueta: "C. cintura mín.", valor: (m) => m.circCinturaMinima },
  { etiqueta: "C. cintura máx.", valor: (m) => m.circCinturaMaxima },
  { etiqueta: "C. cadera", valor: (m) => m.circCadera },
  { etiqueta: "C. brazo", valor: (m) => m.circBrazo },
  { etiqueta: "C. brazo contraído", valor: (m) => m.circBrazoContraido },
  { etiqueta: "Kg grasa", valor: (m) => m.kgGrasa, derivada: true },
];

/**
 * Planilla de evolución antropométrica, con el mismo layout que el Excel del
 * profesional: una fila por medida y una columna por consulta (fecha).
 * Las filas derivadas (kg bajados, Σ6 pliegues, kg grasa) van resaltadas.
 */
export function TablaAntropometria({ mediciones, onEditar, onEliminar }: PropsTabla) {
  if (mediciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin mediciones registradas. Cargá la primera consulta para empezar a
        ver la evolución.
      </p>
    );
  }

  // Oculta las filas de medidas que no se cargaron en ninguna consulta.
  const filasVisibles = FILAS.filter(
    (fila) => fila.derivada || mediciones.some((m) => fila.valor(m) != null),
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted p-2 text-left font-semibold">
              Medida
            </th>
            {mediciones.map((medicion) => (
              <th key={medicion.id} className="min-w-28 p-2 text-center font-semibold">
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
          {filasVisibles.map((fila) => (
            <tr
              key={fila.etiqueta}
              className={cn("border-b last:border-0", fila.derivada && "bg-accent/50")}
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
                  className="p-2 text-center tabular-nums text-foreground"
                >
                  {formatearNumero(fila.valor(medicion))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
