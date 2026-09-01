import { Info } from "lucide-react";
import type {
  DistribucionAdiposa,
  DistribucionCorporal,
  DistribucionMuscular,
} from "@/dominio/servicios/composicionCorporal";
import { formatearMedida } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/componentes/ui/card";
import type { TemaComposicion } from "../paleta";
import { FiguraTejidos } from "./FiguraTejidos";

/**
 * Dónde está la adiposidad y dónde el músculo.
 *
 * Es la pregunta que ni el fraccionamiento ni las ecuaciones de pliegues
 * contestan: los dos dan totales, y dos personas con el mismo total pueden
 * tener toda la grasa en el tronco o repartida en las extremidades.
 *
 * La pantalla dice tres cosas, en este orden:
 *
 * 1. **Las barras** comparan cada perímetro con su corregido. Lo que se lee es
 *    la CAÍDA entre los dos: es el tejido adiposo que envuelve el segmento, la
 *    única parte del cuadro que se ve como una diferencia y no como un número.
 * 2. **La figura** reparte los porcentajes de los dos tejidos sobre el cuerpo,
 *    para no tener que traducir «superior» o «pierna» a un lugar.
 * 3. **Las tablas** dan el número exacto, incluido el Score-Z de cada segmento
 *    muscular: el porcentaje dice cómo se reparte el músculo entre los tres,
 *    pero no si el segmento es grande o chico para la referencia —tres
 *    segmentos flacos por igual dan el mismo reparto que tres grandes—.
 */
export function TarjetaDistribucion({
  distribucion,
  tema,
}: {
  distribucion: DistribucionCorporal;
  tema: TemaComposicion;
}) {
  const { adiposa, muscular } = distribucion;
  if (adiposa == null && muscular == null) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Distribución adiposa y muscular{" "}
          <span className="font-normal text-muted-foreground">
            (dónde está, no cuánto hay)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
          {muscular != null ? (
            <BarrasPerimetros muscular={muscular} tema={tema} />
          ) : (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Los perímetros corregidos necesitan, en al menos dos segmentos, el
              perímetro y el pliegue del mismo segmento.
            </p>
          )}
          <ResumenTejidos adiposa={adiposa} muscular={muscular} tema={tema} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <TablaAdiposa adiposa={adiposa} tema={tema} />
          <TablaMuscular muscular={muscular} tema={tema} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Perímetro crudo y corregido de cada segmento, en una escala común.
 *
 * La escala es ÚNICA para las seis barras —y arranca en cero— porque lo que se
 * compara es cuánto se acorta cada perímetro al descontarle su pliegue. Con un
 * eje por segmento, o empezando en el mínimo, esa caída se vería del mismo
 * tamaño en un brazo y en un muslo.
 */
function BarrasPerimetros({
  muscular,
  tema,
}: {
  muscular: DistribucionMuscular;
  tema: TemaComposicion;
}) {
  const maximo = Math.max(...muscular.segmentos.map((s) => s.perimetroCm));
  // Techo en la decena siguiente: los rótulos del eje quedan redondos y la
  // barra más larga no toca el borde.
  const tope = Math.max(10, Math.ceil(maximo / 10) * 10);
  const marcas = Array.from({ length: tope / 10 + 1 }, (_, i) => i * 10);

  const filas = muscular.segmentos.flatMap((s) => [
    {
      clave: `${s.segmento}-crudo`,
      etiqueta: `${s.etiquetaPerimetro} (cm)`,
      valor: s.perimetroCm,
      corregido: false,
    },
    {
      clave: `${s.segmento}-corregido`,
      etiqueta: `${s.etiqueta} corregido (cm)`,
      valor: s.corregidoCm,
      corregido: true,
    },
  ]);

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {filas.map((fila) => (
          <li key={fila.clave} className="flex items-center gap-2 text-sm">
            <span
              className="w-[9.5rem] shrink-0 truncate text-right text-[11px] text-muted-foreground"
              title={fila.etiqueta}
            >
              {fila.etiqueta}
            </span>
            <div className="relative h-4 flex-1 rounded-sm bg-muted/40">
              {/* La grilla vive DENTRO del carril para que los rótulos del eje
                  y las barras compartan exactamente el mismo ancho. */}
              {marcas.slice(1, -1).map((marca) => (
                <span
                  key={marca}
                  aria-hidden
                  className="absolute inset-y-0 w-px"
                  style={{
                    left: `${(marca / tope) * 100}%`,
                    backgroundColor: tema.grilla,
                  }}
                />
              ))}
              <span
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${(fila.valor / tope) * 100}%`,
                  backgroundColor: fila.corregido
                    ? tema.masas.muscular
                    : tema.tintaSuave,
                }}
              >
                <span className="sr-only">
                  {formatearMedida(fila.valor)} cm
                </span>
              </span>
            </div>
            <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {formatearMedida(fila.valor)}
            </span>
          </li>
        ))}
      </ul>

      {/* Eje: alineado con el carril, no con la fila entera. */}
      <div className="flex items-center gap-2">
        <span className="w-[9.5rem] shrink-0" aria-hidden />
        <div className="relative h-4 flex-1">
          {marcas.map((marca) => (
            <span
              key={marca}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
              style={{ left: `${(marca / tope) * 100}%` }}
            >
              {marca}
            </span>
          ))}
        </div>
        <span className="w-14 shrink-0" aria-hidden />
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-[11px] text-muted-foreground">
        <Leyenda color={tema.tintaSuave} texto="Perímetro medido" />
        <Leyenda
          color={tema.masas.muscular}
          texto="Corregido (sin el pliegue del segmento)"
        />
      </div>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-2 w-2 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      {texto}
    </span>
  );
}

/** La figura con los dos repartos, uno a cada lado. */
function ResumenTejidos({
  adiposa,
  muscular,
  tema,
}: {
  adiposa: DistribucionAdiposa | null;
  muscular: DistribucionMuscular | null;
  tema: TemaComposicion;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <ColumnaTejido
        titulo="Tejido adiposo"
        color={tema.masas.adiposa}
        alineacion="derecha"
        entradas={(adiposa?.zonas ?? []).map((z) => ({
          clave: z.zona,
          etiqueta: z.etiqueta,
          porcentaje: z.porcentaje,
        }))}
      />
      <FiguraTejidos
        colorAdiposo={tema.masas.adiposa}
        colorMuscular={tema.masas.muscular}
      />
      <ColumnaTejido
        titulo="Tejido muscular"
        color={tema.masas.muscular}
        alineacion="izquierda"
        entradas={(muscular?.segmentos ?? []).map((s) => ({
          clave: s.segmento,
          etiqueta: s.etiqueta,
          porcentaje: s.porcentaje,
        }))}
      />
    </div>
  );
}

function ColumnaTejido({
  titulo,
  color,
  alineacion,
  entradas,
}: {
  titulo: string;
  color: string;
  alineacion: "izquierda" | "derecha";
  entradas: { clave: string; etiqueta: string; porcentaje: number }[];
}) {
  const alDerecha = alineacion === "derecha";
  return (
    <div
      className={cn(
        "min-w-0 space-y-2",
        alDerecha ? "text-right" : "text-left",
      )}
    >
      {/* El rótulo va SIEMPRE, con o sin datos: es lo que dice de qué lado
          está cada tejido cuando el color solo no alcanza. */}
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color }}
      >
        {titulo}
      </p>
      {entradas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin medidas</p>
      ) : (
        <dl className="space-y-1.5">
          {entradas.map((entrada) => (
            <div key={entrada.clave}>
              <dt className="text-[11px] text-muted-foreground">
                {entrada.etiqueta}
              </dt>
              <dd className="text-base font-bold tabular-nums">
                {formatearMedida(entrada.porcentaje)} %
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function TablaAdiposa({
  adiposa,
  tema,
}: {
  adiposa: DistribucionAdiposa | null;
  tema: TemaComposicion;
}) {
  if (adiposa == null) {
    return (
      <Bloque titulo="Tejido adiposo" color={tema.masas.adiposa}>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Hacen falta pliegues de al menos dos zonas: con una sola, el reparto
          da 100 % y no dice nada.
        </p>
      </Bloque>
    );
  }

  return (
    <Bloque titulo="Tejido adiposo" color={tema.masas.adiposa}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 text-left font-medium">Zona</th>
            <th className="py-1.5 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {adiposa.zonas.map((zona) => (
            <tr key={zona.zona} className="border-b last:border-0">
              <td className="py-2.5">
                {zona.etiqueta}
                {/* Qué pliegues la componen: sin esto, "Central 35,87 %" no se
                    puede auditar contra la planilla. */}
                <span className="block text-[11px] text-muted-foreground">
                  {zona.sitios.map((s) => s.etiqueta).join(" · ")} ·{" "}
                  {formatearMedida(zona.sumaMm)} mm
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {formatearMedida(zona.porcentaje)} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground">
        Σ de pliegues medidos: {formatearMedida(adiposa.totalMm)} mm.
      </p>
    </Bloque>
  );
}

function TablaMuscular({
  muscular,
  tema,
}: {
  muscular: DistribucionMuscular | null;
  tema: TemaComposicion;
}) {
  if (muscular == null) {
    return (
      <Bloque titulo="Tejido muscular" color={tema.masas.muscular}>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Cada segmento necesita su perímetro y el pliegue del mismo segmento:
          corregirlo a medias metería el tejido adiposo en el reparto.
        </p>
      </Bloque>
    );
  }

  return (
    <Bloque titulo="Tejido muscular" color={tema.masas.muscular}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 text-left font-medium">Segmento</th>
            <th className="py-1.5 text-right font-medium">P. corregido (cm)</th>
            <th className="py-1.5 text-right font-medium">%</th>
            <th className="py-1.5 text-right font-medium">Z</th>
          </tr>
        </thead>
        <tbody>
          {muscular.segmentos.map((segmento) => (
            <tr key={segmento.segmento} className="border-b last:border-0">
              <td className="py-2.5">{segmento.etiqueta}</td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {formatearMedida(segmento.corregidoCm)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                {formatearMedida(segmento.porcentaje)} %
              </td>
              <td className="py-2.5 text-right">
                <InsigniaZ valor={segmento.scoreZ} tema={tema} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground">
        Z = desvíos respecto del humano de referencia Phantom, con la medida
        escalada a 170,18 cm.
      </p>
    </Bloque>
  );
}

/**
 * El Score-Z como pastilla, con la banda de apartamiento en el color.
 *
 * Las bandas son por VALOR ABSOLUTO: un Z de −2,5 se aparta de la referencia
 * tanto como uno de +2,5, y en proporcionalidad eso es lo que se mira. El color
 * nunca va solo —el número está escrito adentro y el `title` dice la banda—,
 * que es la regla del dashboard para cualquier codificación por color.
 */
function InsigniaZ({
  valor,
  tema,
}: {
  valor: number | null;
  tema: TemaComposicion;
}) {
  if (valor == null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="El Score-Z necesita la talla para escalar la medida a la referencia."
      >
        —
      </span>
    );
  }

  const magnitud = Math.abs(valor);
  const { color, banda } =
    magnitud >= 2
      ? { color: tema.alerta, banda: "apartamiento grande (≥ 2 DE)" }
      : magnitud >= 1
        ? { color: tema.atencion, banda: "apartamiento moderado (1 a 2 DE)" }
        : { color: tema.bien, banda: "dentro de la referencia (< 1 DE)" };

  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
      style={{ backgroundColor: color }}
      title={`Score-Z ${formatearMedida(valor)}: ${banda}.`}
    >
      {valor > 0 ? "+" : ""}
      {formatearMedida(valor)}
    </span>
  );
}

function Bloque({
  titulo,
  color,
  children,
}: {
  titulo: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color }}
      >
        {titulo}
      </p>
      {children}
    </div>
  );
}
