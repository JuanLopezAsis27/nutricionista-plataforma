import { Scale } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { formatearMedida } from "@/lib/formato";
import { Card, CardContent } from "@/componentes/ui/card";

/**
 * Las piezas de presentación que el dashboard repite.
 *
 * `Indicador` aparece 7 veces y `Fila` 14: son el vocabulario visual de la
 * pantalla. Tenerlas acá evita que una corrección de formato se aplique a una
 * sola de sus catorce apariciones.
 */

export function Indicador({
  icono: Icono,
  titulo,
  valor,
  unidad,
  detalle,
  color,
}: {
  icono: typeof Scale;
  titulo: string;
  valor: string;
  unidad: string;
  detalle?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icono
            className="h-3.5 w-3.5"
            style={color ? { color } : undefined}
          />
          {titulo}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {valor}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unidad}
          </span>
        </p>
        {detalle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function Fila({
  etiqueta,
  valor,
  unidad,
  nota,
  destacado,
}: {
  etiqueta: string;
  valor: number | null;
  unidad?: string;
  nota?: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="min-w-0">
        <span className={cn(destacado && "font-semibold")}>{etiqueta}</span>
        {nota && (
          <span className="block text-xs text-muted-foreground">{nota}</span>
        )}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          destacado ? "text-base font-bold" : "font-medium",
        )}
      >
        {formatearMedida(valor)}
        {unidad && valor != null && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unidad}
          </span>
        )}
      </dd>
    </div>
  );
}

/** Antepone el signo al delta: "+1,2" se lee distinto de "1,2". */
export function signo(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}
