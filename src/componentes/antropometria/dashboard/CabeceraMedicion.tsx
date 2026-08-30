import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/**
 * Qué medición se está mirando y con cuál se la compara, más el selector para
 * cambiarla.
 *
 * El desplegable va al revés que el arreglo —de la más nueva a la más vieja—
 * porque la que se busca casi siempre es una de las últimas.
 */
export function CabeceraMedicion({
  actual,
  anterior,
  mediciones,
  alSeleccionar,
}: {
  actual: MedicionComposicionDto;
  anterior: MedicionComposicionDto | null;
  mediciones: MedicionComposicionDto[];
  alSeleccionar: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="font-semibold">
          Medición del {formatearFecha(actual.fecha)}
        </h3>
        <p className="text-sm text-muted-foreground">
          {actual.edadAnios != null &&
            `${formatearNumero(actual.edadAnios)} años · `}
          {anterior
            ? `Comparada con la del ${formatearFecha(anterior.fecha)}`
            : "Primera medición del paciente"}
        </p>
      </div>
      {mediciones.length > 1 && (
        <Select value={actual.id} onValueChange={alSeleccionar}>
          <SelectTrigger className="w-auto min-w-[12rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...mediciones].reverse().map((m, indice) => (
              <SelectItem key={m.id} value={m.id}>
                {formatearFecha(m.fecha)}
                {indice === 0 && " (última)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
