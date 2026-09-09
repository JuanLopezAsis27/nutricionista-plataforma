import { Canvas, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Los gráficos de los PDF, y los colores y formatos que comparten.
 *
 * react-pdf tiene su propio renderer: los componentes de pantalla (donut,
 * somatocarta, barras) son SVG del DOM y no se pueden reusar acá. Lo que sí se
 * reusa —y por eso vive en este módulo y no adentro de un documento— son las
 * DOS formas de dibujar que este proyecto encontró para react-pdf:
 *
 * - las barras son `View` con `flex` proporcional al valor, el mismo mecanismo
 *   de flexbox (Yoga) que ya arma el layout del documento;
 * - las trayectorias en el plano (fecha → valor) no se pueden expresar con un
 *   ancho proporcional, así que usan `Canvas`, que expone el lienzo vectorial
 *   de PDFKit (`moveTo`/`lineTo`/`circle`/`stroke`) por debajo de react-pdf.
 *
 * Estaban adentro de `DashboardComposicionPdf` cuando ese era el único PDF con
 * gráficos. Al necesitarlos también el PDF del paciente, copiarlos habría
 * dejado dos evoluciones del mismo gráfico que se desalinean en el primer
 * arreglo que se aplique a una sola.
 *
 * Cada gráfico va ACOMPAÑADO de los números exactos —la leyenda de la barra, o
 * el valor escrito sobre cada punto—, nunca los reemplaza.
 */

export const CORAL = "#F4535E";
export const GRIS_TEXTO = "#3f3f46";
export const GRIS_SUAVE = "#71717a";
export const FONDO_SUAVE = "#fafafa";
export const BORDE = "#e4e4e7";

/**
 * Colores de las masas y las zonas. Son los mismos que en pantalla
 * (`componentes/antropometria/paleta`), a mano: la infraestructura no puede
 * importar de presentación.
 */
export const COLOR_ADIPOSA = "#f4535e";
export const COLOR_MUSCULAR = "#3b82f6";
export const COLOR_RESIDUAL = "#a855f7";
export const COLOR_OSEA = "#f59e0b";
export const COLOR_PIEL = "#94a3b8";
export const COLORES_ZONA_ADIPOSA = ["#f4535e", "#fb7185", "#fda4af"];

// Formateadores propios: la infraestructura no puede importar `@/lib/formato`
// (es presentación). Mismos parámetros Intl que allá, para que el PDF lea
// igual que la pantalla.
const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const formateadorMedida = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formateadorNumero = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});
/** Fecha corta (sin año) para las etiquetas del eje X. */
const formateadorFechaCorta = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export function formatearFecha(
  fecha: Date | string | null | undefined,
): string {
  return fecha ? formateadorFecha.format(new Date(fecha)) : "—";
}
export function formatearMedida(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorMedida.format(valor);
}
export function formatearNumero(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorNumero.format(valor);
}
export function formatearFechaCorta(fecha: Date | string): string {
  return formateadorFechaCorta.format(new Date(fecha));
}
/** Diferencia con su signo, para las columnas comparativas. */
export function signo(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}

/**
 * `GRUPOS` y otras etiquetas están pensadas para pantalla ("Σ 6 pliegues"),
 * donde el navegador tiene una fuente Unicode completa. La Helvetica estándar
 * de PDFKit no tiene glifo para la sigma griega y la imprime como "£": acá se
 * cambia SOLO al mostrarla, sin tocar la definición que lee la pantalla.
 */
export function textoPdf(texto: string): string {
  return texto.replace(/Σ/g, "Suma");
}

export const estilosGrafico = StyleSheet.create({
  barraApilada: { flexDirection: "row", height: 16, marginBottom: 6 },
  leyenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 3,
    marginBottom: 10,
  },
  leyendaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  leyendaSwatch: { width: 7, height: 7 },
  leyendaTexto: { fontSize: 7, color: GRIS_SUAVE },
  bloqueGrafico: { marginBottom: 10 },
  tituloGrafico: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 3 },
});

/** Barra 100 % apilada (proporciones por `flex`) + leyenda con sus colores. */
export function BarraApilada({
  segmentos,
}: {
  segmentos: { etiqueta: string; valor: number; color: string }[];
}) {
  return (
    <View>
      <View style={estilosGrafico.barraApilada}>
        {segmentos.map((s) => (
          <View
            key={s.etiqueta}
            style={{ flex: Math.max(0, s.valor), backgroundColor: s.color }}
          />
        ))}
      </View>
      <Leyenda
        entradas={segmentos.map((s) => ({
          etiqueta: `${s.etiqueta} ${formatearMedida(s.valor)} %`,
          color: s.color,
        }))}
      />
    </View>
  );
}

/** Leyenda de colores: un cuadradito y su texto por serie. */
export function Leyenda({
  entradas,
}: {
  entradas: { etiqueta: string; color: string }[];
}) {
  return (
    <View style={estilosGrafico.leyenda}>
      {entradas.map((entrada) => (
        <View key={entrada.etiqueta} style={estilosGrafico.leyendaItem}>
          <View
            style={[
              estilosGrafico.leyendaSwatch,
              { backgroundColor: entrada.color },
            ]}
          />
          <Text style={estilosGrafico.leyendaTexto}>{entrada.etiqueta}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Subconjunto de la API vectorial de PDFKit que expone `Canvas` de react-pdf
 * (`node_modules/@react-pdf/render`: `availableMethods`). react-pdf tipa el
 * parámetro como `any` porque es un wrapper genérico; acá se declara el
 * subconjunto real que usan los gráficos, para no perderlo.
 */
export interface Pintor {
  moveTo(x: number, y: number): Pintor;
  lineTo(x: number, y: number): Pintor;
  circle(x: number, y: number, radio: number): Pintor;
  lineWidth(ancho: number): Pintor;
  strokeColor(color: string): Pintor;
  fillColor(color: string): Pintor;
  stroke(): Pintor;
  fill(): Pintor;
  font(nombre: string): Pintor;
  fontSize(tamano: number): Pintor;
  text(
    texto: string,
    x: number,
    y: number,
    opciones?: { width?: number; align?: "left" | "center" | "right" },
  ): Pintor;
  dash(largo: number, opciones?: { space?: number }): Pintor;
}

/**
 * Gráfico de líneas con sus dos ejes dibujados: el Y con tres marcas de valor
 * (máximo, medio, mínimo) y el X con la fecha bajo cada punto — más el valor
 * de cada serie escrito arriba (o abajo, la segunda serie) de su punto. Con
 * pocos puntos entran todas las etiquetas; con muchos, se saltean a un paso
 * fijo para que no se superpongan, sin dejar nunca afuera al primero ni al
 * último.
 */
export function GraficoLineas({
  ancho,
  alto,
  series,
  fechas,
  unidad,
}: {
  ancho: number;
  alto: number;
  series: { color: string; valores: (number | null)[] }[];
  fechas: Date[];
  unidad?: string;
}) {
  const margenIzq = 40;
  const margenDer = 6;
  const margenSup = 14;
  const margenInf = 14;
  const anchoUtil = ancho - margenIzq - margenDer;
  const altoUtil = alto - margenSup - margenInf;

  const n = Math.max(2, fechas.length, ...series.map((s) => s.valores.length));
  const todos = series.flatMap((s) =>
    s.valores.filter((v): v is number => v != null),
  );
  const minY = Math.min(...todos);
  const maxY = Math.max(...todos);
  const medioY = (minY + maxY) / 2;
  const rango = maxY - minY || 1;

  const xDe = (i: number) =>
    n <= 1 ? margenIzq + anchoUtil / 2 : margenIzq + (i / (n - 1)) * anchoUtil;
  const yDe = (v: number) =>
    margenSup + altoUtil - ((v - minY) / rango) * altoUtil;

  // Índices con etiqueta (fecha + valor): el primero y el último siempre;
  // los del medio, a un paso que deje ~40 pt por etiqueta.
  const maxEtiquetas = Math.max(2, Math.floor(anchoUtil / 40));
  const paso = Math.max(1, Math.ceil(n / maxEtiquetas));
  const llevaEtiqueta = (i: number) => i % paso === 0 || i === n - 1;

  return (
    <Canvas
      style={{ width: ancho, height: alto }}
      paint={(p: Pintor) => {
        // Ejes.
        p.moveTo(margenIzq, margenSup)
          .lineTo(margenIzq, margenSup + altoUtil)
          .lineWidth(0.5)
          .strokeColor(BORDE)
          .stroke();
        p.moveTo(margenIzq, margenSup + altoUtil)
          .lineTo(margenIzq + anchoUtil, margenSup + altoUtil)
          .lineWidth(0.5)
          .strokeColor(BORDE)
          .stroke();

        // Eje Y: valor arriba, en el medio y abajo (sin repetir si la serie
        // es plana, un único valor en toda la medición).
        const marcasY = maxY === minY ? [maxY] : [maxY, medioY, minY];
        p.font("Helvetica").fontSize(6).fillColor(GRIS_SUAVE);
        marcasY.forEach((valor) => {
          const y = yDe(valor);
          p.text(
            `${formatearMedida(valor)}${unidad ? ` ${unidad}` : ""}`,
            0,
            Math.max(0, y - 3),
            { width: margenIzq - 4, align: "right" },
          );
          p.moveTo(margenIzq - 2, y)
            .lineTo(margenIzq, y)
            .lineWidth(0.5)
            .strokeColor(BORDE)
            .stroke();
        });

        // Eje X: fecha bajo cada punto (con el salteo de `llevaEtiqueta`).
        p.font("Helvetica").fontSize(6).fillColor(GRIS_SUAVE);
        fechas.forEach((fecha, i) => {
          if (!llevaEtiqueta(i)) return;
          const x = xDe(i);
          p.text(formatearFechaCorta(fecha), x - 16, margenSup + altoUtil + 3, {
            width: 32,
            align: "center",
          });
        });

        // Series: línea, puntos y el valor sobre (o bajo) cada punto con
        // etiqueta. La segunda serie en adelante escribe el valor ABAJO del
        // punto: dos series que se cruzan no pueden escribir las dos arriba
        // sin superponerse.
        series.forEach((serie, indiceSerie) => {
          const puntos = serie.valores
            .map((v, i): [number, number] | null =>
              v == null ? null : [xDe(i), yDe(v)],
            )
            .filter((pt): pt is [number, number] => pt != null);

          if (puntos.length > 1) {
            p.moveTo(puntos[0]![0], puntos[0]![1]);
            for (const [x, y] of puntos.slice(1)) p.lineTo(x, y);
            p.lineWidth(1.5).strokeColor(serie.color).stroke();
          }
          for (const [x, y] of puntos) {
            p.circle(x, y, 2).fillColor(serie.color).fill();
          }

          p.font("Helvetica-Bold").fontSize(6.5).fillColor(serie.color);
          serie.valores.forEach((v, i) => {
            if (v == null || !llevaEtiqueta(i)) return;
            const x = xDe(i);
            const y = yDe(v);
            const yTexto = indiceSerie === 0 ? y - 10 : y + 4;
            p.text(formatearMedida(v), x - 16, yTexto, {
              width: 32,
              align: "center",
            });
          });
        });

        return null;
      }}
    />
  );
}
