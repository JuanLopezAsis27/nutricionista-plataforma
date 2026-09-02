import {
  Document,
  Page,
  Text,
  View,
  Canvas,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import type { BloqueFaltante } from "@/dominio/servicios/composicionCorporal";
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import {
  ETIQUETAS_ZONA,
  ETIQUETAS_SEGMENTO,
} from "@/dominio/servicios/composicion/distribucion";

/**
 * Documento PDF del dashboard de composición corporal: la misma medición que
 * mira `DashboardComposicion.tsx` en pantalla, en forma de reporte imprimible
 * — con gráficos, no solo tablas.
 *
 * No REUSA los componentes de pantalla (donut, somatocarta, barras): son SVG
 * del DOM, y react-pdf tiene su propio renderer con sus propias primitivas.
 * En cambio, cada gráfico se REDIBUJA con lo que react-pdf sí ofrece:
 *
 * - Las barras (fraccionamiento, distribución, grasa por pliegues, Z-scores)
 *   son `View` con `flex`/`width` proporcional al valor — el mismo mecanismo
 *   de flexbox (Yoga) que ya se usa para el layout del resto del documento,
 *   sin dependencias nuevas.
 * - La evolución y la somatocarta son trayectorias en el plano (fecha→valor,
 *   o endo/ecto→meso/eje) que un ancho proporcional no puede expresar: para
 *   esas dos se usa `Canvas`, que expone el lienzo vectorial de PDFKit
 *   (`moveTo`/`lineTo`/`circle`/`stroke`) por debajo de react-pdf.
 *
 * Cada gráfico va ACOMPAÑADO de su tabla de números exactos, nunca la
 * reemplaza: es el mismo criterio que ya usa `TarjetaDistribucion` en
 * pantalla (barras + tabla auditable debajo).
 *
 * Exclusivo del nutricionista: es el dashboard TÉCNICO —Phantom, somatocarta,
 * índices— que `ComposicionPaciente.tsx` excluye a propósito del portal.
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

/**
 * Paleta propia del PDF para las masas y los tejidos. No es la del tema de
 * pantalla (`paleta.ts`, con variantes claro/oscuro): la infraestructura no
 * puede importar de `componentes` (ver `arquitectura.test.ts`), y un PDF no
 * tiene modo oscuro que respetar.
 */
const COLOR_ADIPOSA = "#f4535e";
const COLOR_MUSCULAR = "#3b82f6";
const COLOR_RESIDUAL = "#a855f7";
const COLOR_OSEA = "#f59e0b";
const COLOR_PIEL = "#94a3b8";
const COLORES_ZONA_ADIPOSA = ["#f4535e", "#fb7185", "#fda4af"];
const COLOR_BIEN = "#22c55e";
const COLOR_ATENCION = "#f59e0b";
const COLOR_ALERTA = "#ef4444";

// Formateadores propios: la infraestructura no puede importar `@/lib/formato`
// (es presentación). Mismos parámetros Intl que allá.
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
function formatearFecha(fecha: Date | string | null | undefined): string {
  return fecha ? formateadorFecha.format(new Date(fecha)) : "—";
}
function formatearMedida(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorMedida.format(valor);
}
function formatearNumero(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorNumero.format(valor);
}
function signo(valor: number | null | undefined): string {
  if (valor == null) return "—";
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}
/** Banda de apartamiento de un Score-Z, por valor absoluto (mismo criterio que `InsigniaZ` en pantalla). */
function colorDeZ(valor: number): string {
  const magnitud = Math.abs(valor);
  return magnitud >= 2
    ? COLOR_ALERTA
    : magnitud >= 1
      ? COLOR_ATENCION
      : COLOR_BIEN;
}

const ETIQUETAS_BLOQUE_FALTANTE: Record<BloqueFaltante["bloque"], string> = {
  FRACCIONAMIENTO: "Fraccionamiento en 5 masas",
  SOMATOTIPO: "Somatotipo",
  ENERGIA: "Metabolismo y peso ideal",
  INDICES: "Índices",
};

const ETIQUETAS_RIESGO: Record<string, string> = {
  BAJO: "Riesgo bajo",
  MODERADO: "Riesgo moderado",
  ALTO: "Riesgo alto",
  MUY_ALTO: "Riesgo muy alto",
};

const ETIQUETAS_GRUPO_PHANTOM: Record<string, string> = {
  BASICOS: "Básicos",
  DIAMETROS: "Diámetros",
  PERIMETROS: "Perímetros",
  PLIEGUES: "Pliegues",
};

const estilos = StyleSheet.create({
  pagina: {
    padding: 48,
    paddingBottom: 64,
    fontSize: 9,
    color: GRIS_TEXTO,
    fontFamily: "Helvetica",
  },
  membrete: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 18,
  },
  profesional: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtituloMembrete: { fontSize: 9, color: GRIS_SUAVE, marginTop: 2 },
  fecha: { fontSize: 9, color: GRIS_SUAVE },

  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  paciente: { fontSize: 11, color: GRIS_SUAVE, marginBottom: 2 },
  subtitulo: { fontSize: 9, color: GRIS_SUAVE, marginBottom: 10 },

  aviso: {
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  avisoTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  avisoTexto: { fontSize: 8, color: GRIS_SUAVE, lineHeight: 1.4 },

  indicadores: { flexDirection: "row", gap: 8, marginBottom: 14 },
  indicador: {
    flex: 1,
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    padding: 8,
  },
  indicadorTitulo: {
    fontSize: 7,
    color: GRIS_SUAVE,
    textTransform: "uppercase",
  },
  indicadorValor: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  indicadorDetalle: { fontSize: 7, color: GRIS_SUAVE, marginTop: 2 },

  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingBottom: 3,
    marginBottom: 6,
  },
  subgrupo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: GRIS_SUAVE,
    backgroundColor: FONDO_SUAVE,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  notaPie: { fontSize: 7, color: GRIS_SUAVE, marginTop: 4, lineHeight: 1.4 },

  filaCabecera: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: GRIS_SUAVE,
    paddingBottom: 3,
    marginTop: 4,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingVertical: 3,
    alignItems: "center",
  },
  colEtiquetaCab: {
    flex: 2,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
    textTransform: "uppercase",
  },
  colEtiqueta: { flex: 2, fontSize: 8 },
  col: {
    flex: 1,
    fontSize: 8,
    textAlign: "right",
  },
  colCab: {
    flex: 1,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
    textAlign: "right",
    textTransform: "uppercase",
  },

  // --- Gráficos de barras (flexbox: sin Canvas) ---------------------------
  celdaBarra: { flex: 2, flexDirection: "row", alignItems: "center", gap: 4 },
  pistaBarra: { flex: 1, height: 7, backgroundColor: FONDO_SUAVE },
  rellenoBarra: { height: 7 },
  celdaBarraTexto: { fontSize: 7, width: 34, textAlign: "right" },

  celdaDivergente: { flex: 2, flexDirection: "row", alignItems: "center" },
  mitadIzquierda: {
    flex: 1,
    height: 7,
    flexDirection: "row-reverse",
    backgroundColor: FONDO_SUAVE,
  },
  mitadDerecha: { flex: 1, height: 7, backgroundColor: FONDO_SUAVE },
  lineaCero: { width: 1, height: 9, backgroundColor: GRIS_SUAVE },

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

  // --- Gráficos de líneas (Canvas) -----------------------------------------
  bloqueGrafico: { marginBottom: 10 },
  tituloGrafico: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },

  pie: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: BORDE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  pieTexto: { fontSize: 8, color: GRIS_SUAVE },
});

/** Ancho útil de la página (A4, 595,28 pt − 48 pt de margen a cada lado). */
const ANCHO_CONTENIDO = 499;

interface Props {
  mediciones: MedicionComposicionDto[];
  /** Índice de la medición que se está mirando (por defecto, la última). */
  indiceActual: number;
  nombrePaciente: string;
  config?: ConfiguracionSalidaDto | null;
}

/** Renderiza el dashboard a un buffer PDF (la única API que consume la presentación). */
export async function renderizarDashboardComposicionPdf(
  props: Props,
): Promise<Buffer> {
  return renderToBuffer(<DashboardComposicionPdf {...props} />);
}

function DashboardComposicionPdf({
  mediciones,
  indiceActual,
  nombrePaciente,
  config,
}: Props) {
  const color = config?.pdfColorPrimario || CORAL;
  const nombreProfesional =
    config?.nombreProfesional?.trim() || "Consultorio de Nutrición";
  const subtituloConfig = config?.pdfSubtitulo?.trim() || null;
  const matricula = config?.matricula?.trim() || null;
  const pieTexto = config?.pdfPieTexto?.trim() || null;

  const actual = mediciones[indiceActual]!;
  const anterior = indiceActual > 0 ? mediciones[indiceActual - 1]! : null;
  const { resultado } = actual;
  const hastaActual = mediciones.slice(0, indiceActual + 1);

  const grasaDestacada =
    resultado.grasaPorPliegues.resultados.find(
      (r) => r.metodo === actual.metodoGrasa,
    ) ?? resultado.grasaPorPliegues.resultados[0];
  const metodosDisponibles = [
    ...new Set(
      hastaActual.flatMap((m) =>
        m.resultado.grasaPorPliegues.resultados.map((r) => r.metodo),
      ),
    ),
  ];
  const metodoSerie = grasaDestacada?.metodo ?? metodosDisponibles[0] ?? null;
  const dosComponentesPrimero = actual.protocolo === "DOS_COMPONENTES";
  const conFaltas = resultado.faltantes.filter((f) => f.campos.length > 0);
  const conSomatotipo = hastaActual.filter((m) => m.resultado.somatotipo);

  // --- Series de evolución (peso, %grasa, masas) ---------------------------
  const fechasEvolucion = hastaActual.map((m) => m.fecha);
  const seriePeso = hastaActual.map((m) => m.medidas.pesoKg);
  const serieGrasa = hastaActual.map(
    (m) =>
      m.resultado.grasaPorPliegues.resultados.find(
        (r) => r.metodo === metodoSerie,
      )?.porcentajeGrasa ?? null,
  );
  const serieAdiposaKg = hastaActual.map(
    (m) => m.resultado.fraccionamiento?.adiposa.kg ?? null,
  );
  const serieMuscularKg = hastaActual.map(
    (m) => m.resultado.fraccionamiento?.muscular.kg ?? null,
  );
  const hayGrasaEnSerie = serieGrasa.some((v) => v != null);
  const hayMasasEnSerie =
    serieAdiposaKg.some((v) => v != null) ||
    serieMuscularKg.some((v) => v != null);

  return (
    <Document
      title={`Dashboard de composición — ${nombrePaciente}`}
      author={nombreProfesional}
    >
      <Page size="A4" style={estilos.pagina}>
        <View style={[estilos.membrete, { borderBottomColor: color }]} fixed>
          <View>
            <Text style={[estilos.profesional, { color }]}>
              {nombreProfesional}
            </Text>
            {subtituloConfig && (
              <Text style={estilos.subtituloMembrete}>{subtituloConfig}</Text>
            )}
            {matricula && (
              <Text style={estilos.subtituloMembrete}>Mat. {matricula}</Text>
            )}
          </View>
          <Text style={estilos.fecha}>{formatearFecha(new Date())}</Text>
        </View>

        <Text style={estilos.titulo}>Dashboard de composición corporal</Text>
        <Text style={estilos.paciente}>Paciente: {nombrePaciente}</Text>
        <Text style={estilos.subtitulo}>
          Medición del {formatearFecha(actual.fecha)}
          {actual.edadAnios != null &&
            ` · ${formatearNumero(actual.edadAnios)} años`}
          {anterior
            ? ` · comparada con la del ${formatearFecha(anterior.fecha)}`
            : " · primera medición del paciente"}
        </Text>

        {conFaltas.length > 0 && (
          <View style={estilos.aviso} wrap={false}>
            <Text style={estilos.avisoTitulo}>
              Esta medición no alcanza para todo
            </Text>
            {conFaltas.map((bloque) => (
              <Text key={bloque.bloque} style={estilos.avisoTexto}>
                {ETIQUETAS_BLOQUE_FALTANTE[bloque.bloque]}: falta{" "}
                {bloque.campos.join(", ").toLowerCase()}.
              </Text>
            ))}
          </View>
        )}

        {/* Indicadores clave */}
        <View style={estilos.indicadores} wrap={false}>
          <Indicador
            titulo="Peso"
            valor={`${formatearMedida(actual.medidas.pesoKg)} kg`}
            detalle={
              anterior
                ? `${signo(actual.medidas.pesoKg - anterior.medidas.pesoKg)} kg vs. anterior`
                : undefined
            }
          />
          {dosComponentesPrimero ? (
            <>
              <Indicador
                titulo="Grasa corporal"
                valor={
                  grasaDestacada
                    ? `${formatearMedida(grasaDestacada.porcentajeGrasa)} %`
                    : "—"
                }
                detalle={grasaDestacada?.etiqueta}
              />
              <Indicador
                titulo="Masa libre de grasa"
                valor={
                  grasaDestacada
                    ? `${formatearMedida(grasaDestacada.masaLibreGrasaKg)} kg`
                    : "—"
                }
              />
            </>
          ) : (
            <>
              <Indicador
                titulo="Masa adiposa"
                valor={
                  resultado.fraccionamiento
                    ? `${formatearMedida(resultado.fraccionamiento.adiposa.kg)} kg`
                    : "—"
                }
                detalle={
                  resultado.fraccionamiento
                    ? `${formatearMedida(resultado.fraccionamiento.adiposa.porcentaje)} % del peso`
                    : undefined
                }
              />
              <Indicador
                titulo="Masa muscular"
                valor={
                  resultado.fraccionamiento
                    ? `${formatearMedida(resultado.fraccionamiento.muscular.kg)} kg`
                    : "—"
                }
                detalle={
                  resultado.fraccionamiento
                    ? `${formatearMedida(resultado.fraccionamiento.muscular.porcentaje)} % del peso`
                    : undefined
                }
              />
            </>
          )}
          <Indicador
            titulo={
              resultado.energia?.gastoEnergeticoTotalKcal != null
                ? "Gasto total"
                : "Metabolismo basal"
            }
            valor={
              resultado.energia
                ? `${formatearMedida(resultado.energia.gastoEnergeticoTotalKcal ?? resultado.energia.metabolismoBasalKcal)} kcal`
                : "—"
            }
          />
        </View>

        {/* Grasa por pliegues (2 componentes) */}
        {resultado.grasaPorPliegues.resultados.length > 0 && (
          <View style={estilos.seccion} wrap={false}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Grasa por pliegues (2 componentes)
            </Text>
            <View style={estilos.filaCabecera}>
              <Text style={estilos.colEtiquetaCab}>Ecuación</Text>
              <Text style={[estilos.colCab, { flex: 2 }]}>% grasa</Text>
              <Text style={estilos.colCab}>Masa grasa (kg)</Text>
              <Text style={estilos.colCab}>M. libre grasa (kg)</Text>
            </View>
            {(() => {
              const maxGrasa = Math.max(
                ...resultado.grasaPorPliegues.resultados.map(
                  (r) => r.porcentajeGrasa,
                ),
                1,
              );
              return resultado.grasaPorPliegues.resultados.map((r) => (
                <View key={r.metodo} style={estilos.fila}>
                  <Text style={estilos.colEtiqueta}>
                    {r.etiqueta}
                    {r.metodo === actual.metodoGrasa ? " (destacada)" : ""}
                  </Text>
                  <CeldaBarraPorcentaje
                    valor={r.porcentajeGrasa}
                    max={maxGrasa * 1.15}
                    color={
                      r.metodo === actual.metodoGrasa ? color : COLOR_ADIPOSA
                    }
                  />
                  <Text style={estilos.col}>
                    {formatearMedida(r.masaGrasaKg)}
                  </Text>
                  <Text style={estilos.col}>
                    {formatearMedida(r.masaLibreGrasaKg)}
                  </Text>
                </View>
              ));
            })()}
          </View>
        )}

        {/* Fraccionamiento en 5 masas */}
        {resultado.fraccionamiento && (
          <View style={estilos.seccion} wrap={false}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Fraccionamiento en 5 masas (Kerr, 1988)
            </Text>
            <BarraApilada
              segmentos={(
                [
                  ["Adiposa", resultado.fraccionamiento.adiposa, COLOR_ADIPOSA],
                  [
                    "Muscular",
                    resultado.fraccionamiento.muscular,
                    COLOR_MUSCULAR,
                  ],
                  [
                    "Residual",
                    resultado.fraccionamiento.residual,
                    COLOR_RESIDUAL,
                  ],
                  ["Ósea", resultado.fraccionamiento.osea, COLOR_OSEA],
                  ["Piel", resultado.fraccionamiento.piel, COLOR_PIEL],
                ] as const
              ).map(([etiqueta, masa, color]) => ({
                etiqueta,
                valor: masa.porcentaje,
                color,
              }))}
            />
            <View style={estilos.filaCabecera}>
              <Text style={estilos.colEtiquetaCab}>Masa</Text>
              <Text style={estilos.colCab}>Kg</Text>
              <Text style={estilos.colCab}>%</Text>
              <Text style={estilos.colCab}>Z (Phantom)</Text>
              <Text style={estilos.colCab}>Vs. anterior</Text>
            </View>
            {(
              [
                ["adiposa", "Adiposa"],
                ["muscular", "Muscular"],
                ["residual", "Residual"],
                ["osea", "Ósea"],
                ["piel", "Piel"],
              ] as const
            ).map(([clave, etiqueta]) => {
              const masa = resultado.fraccionamiento![clave];
              const previa = anterior?.resultado.fraccionamiento?.[clave];
              return (
                <View key={clave} style={estilos.fila}>
                  <Text style={estilos.colEtiqueta}>{etiqueta}</Text>
                  <Text style={estilos.col}>{formatearMedida(masa.kg)}</Text>
                  <Text style={estilos.col}>
                    {formatearMedida(masa.porcentaje)}
                  </Text>
                  <Text style={estilos.col}>
                    {formatearMedida(masa.scoreZ)}
                  </Text>
                  <Text style={estilos.col}>
                    {previa ? signo(masa.kg - previa.kg) : "—"}
                  </Text>
                </View>
              );
            })}
            <Text style={estilos.notaPie}>
              Peso estructurado{" "}
              {formatearMedida(resultado.fraccionamiento.pesoEstructuradoKg)} kg
              · diferencia con la balanza{" "}
              {formatearMedida(
                resultado.fraccionamiento.diferenciaPorcentaje * 100,
              )}{" "}
              %.
            </Text>
          </View>
        )}

        {/* Distribución adiposa y muscular */}
        {(resultado.distribucion.adiposa ||
          resultado.distribucion.muscular) && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Distribución adiposa y muscular (dónde está, no cuánto hay)
            </Text>
            {resultado.distribucion.adiposa && (
              <View wrap={false}>
                <Text style={estilos.subgrupo}>Tejido adiposo</Text>
                <BarraApilada
                  segmentos={resultado.distribucion.adiposa.zonas.map(
                    (zona, i) => ({
                      etiqueta: ETIQUETAS_ZONA[zona.zona] ?? zona.etiqueta,
                      valor: zona.porcentaje,
                      color:
                        COLORES_ZONA_ADIPOSA[i % COLORES_ZONA_ADIPOSA.length]!,
                    }),
                  )}
                />
                <View style={estilos.filaCabecera}>
                  <Text style={estilos.colEtiquetaCab}>Zona</Text>
                  <Text style={estilos.colCab}>Suma (mm)</Text>
                  <Text style={estilos.colCab}>%</Text>
                </View>
                {resultado.distribucion.adiposa.zonas.map((zona) => (
                  <View key={zona.zona} style={estilos.fila}>
                    <Text style={estilos.colEtiqueta}>
                      {ETIQUETAS_ZONA[zona.zona] ?? zona.etiqueta} —{" "}
                      {zona.sitios.map((s) => s.etiqueta).join(" · ")}
                    </Text>
                    <Text style={estilos.col}>
                      {formatearMedida(zona.sumaMm)}
                    </Text>
                    <Text style={estilos.col}>
                      {formatearMedida(zona.porcentaje)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {resultado.distribucion.muscular && (
              <View wrap={false} style={{ marginTop: 10 }}>
                <Text style={estilos.subgrupo}>Tejido muscular</Text>
                <Text style={estilos.notaPie}>
                  Perímetro medido (gris) vs. corregido sin el pliegue del
                  segmento (azul), en la misma escala.
                </Text>
                {(() => {
                  const maximo = Math.max(
                    ...resultado.distribucion.muscular.segmentos.map(
                      (s) => s.perimetroCm,
                    ),
                    1,
                  );
                  return resultado.distribucion.muscular.segmentos.map(
                    (seg) => (
                      <View key={seg.segmento} style={{ marginTop: 4 }}>
                        <Text style={estilos.leyendaTexto}>
                          {ETIQUETAS_SEGMENTO[seg.segmento] ?? seg.etiqueta}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <BarraPorcentaje
                            valor={seg.perimetroCm}
                            max={maximo * 1.1}
                            color={GRIS_SUAVE}
                          />
                          <Text style={estilos.celdaBarraTexto}>
                            {formatearMedida(seg.perimetroCm)}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 1,
                          }}
                        >
                          <BarraPorcentaje
                            valor={seg.corregidoCm}
                            max={maximo * 1.1}
                            color={COLOR_MUSCULAR}
                          />
                          <Text style={estilos.celdaBarraTexto}>
                            {formatearMedida(seg.corregidoCm)}
                          </Text>
                        </View>
                      </View>
                    ),
                  );
                })()}
                <View style={[estilos.filaCabecera, { marginTop: 8 }]}>
                  <Text style={estilos.colEtiquetaCab}>Segmento</Text>
                  <Text style={estilos.colCab}>Corregido (cm)</Text>
                  <Text style={estilos.colCab}>%</Text>
                  <Text style={[estilos.colCab, { flex: 2 }]}>Z</Text>
                </View>
                {resultado.distribucion.muscular.segmentos.map((seg) => (
                  <View key={seg.segmento} style={estilos.fila}>
                    <Text style={estilos.colEtiqueta}>
                      {ETIQUETAS_SEGMENTO[seg.segmento] ?? seg.etiqueta}
                    </Text>
                    <Text style={estilos.col}>
                      {formatearMedida(seg.corregidoCm)}
                    </Text>
                    <Text style={estilos.col}>
                      {formatearMedida(seg.porcentaje)}
                    </Text>
                    <CeldaBarraDivergente valor={seg.scoreZ} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Evolución (solo con más de una medición) */}
        {hastaActual.length > 1 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Evolución
              {metodoSerie &&
                ` · % graso por ${DEFINICIONES_METODO[metodoSerie].etiqueta}`}
            </Text>

            <View style={estilos.bloqueGrafico} wrap={false}>
              <Text style={estilos.tituloGrafico}>Peso (kg)</Text>
              <GraficoLineas
                ancho={ANCHO_CONTENIDO}
                alto={100}
                series={[{ color, valores: seriePeso }]}
                fechas={fechasEvolucion}
                unidad="kg"
              />
            </View>

            {hayGrasaEnSerie && (
              <View style={estilos.bloqueGrafico} wrap={false}>
                <Text style={estilos.tituloGrafico}>% graso</Text>
                <GraficoLineas
                  ancho={ANCHO_CONTENIDO}
                  alto={100}
                  series={[{ color: COLOR_ADIPOSA, valores: serieGrasa }]}
                  fechas={fechasEvolucion}
                  unidad="%"
                />
              </View>
            )}

            {hayMasasEnSerie && (
              <View style={estilos.bloqueGrafico} wrap={false}>
                <Text style={estilos.tituloGrafico}>
                  Masa adiposa y muscular (kg)
                </Text>
                <GraficoLineas
                  ancho={ANCHO_CONTENIDO}
                  alto={100}
                  series={[
                    { color: COLOR_ADIPOSA, valores: serieAdiposaKg },
                    { color: COLOR_MUSCULAR, valores: serieMuscularKg },
                  ]}
                  fechas={fechasEvolucion}
                  unidad="kg"
                />
                <View style={estilos.leyenda}>
                  <View style={estilos.leyendaItem}>
                    <View
                      style={[
                        estilos.leyendaSwatch,
                        { backgroundColor: COLOR_ADIPOSA },
                      ]}
                    />
                    <Text style={estilos.leyendaTexto}>Masa adiposa</Text>
                  </View>
                  <View style={estilos.leyendaItem}>
                    <View
                      style={[
                        estilos.leyendaSwatch,
                        { backgroundColor: COLOR_MUSCULAR },
                      ]}
                    />
                    <Text style={estilos.leyendaTexto}>Masa muscular</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={estilos.filaCabecera}>
              <Text style={estilos.colEtiquetaCab}>Fecha</Text>
              <Text style={estilos.colCab}>Peso (kg)</Text>
              <Text style={estilos.colCab}>% grasa</Text>
              <Text style={estilos.colCab}>Adiposa (kg / Z)</Text>
              <Text style={estilos.colCab}>Muscular (kg / Z)</Text>
            </View>
            {hastaActual.map((m) => {
              const grasa = m.resultado.grasaPorPliegues.resultados.find(
                (r) => r.metodo === metodoSerie,
              );
              const frac = m.resultado.fraccionamiento;
              return (
                <View key={m.id} style={estilos.fila} wrap={false}>
                  <Text style={estilos.colEtiqueta}>
                    {formatearFecha(m.fecha)}
                  </Text>
                  <Text style={estilos.col}>
                    {formatearMedida(m.medidas.pesoKg)}
                  </Text>
                  <Text style={estilos.col}>
                    {grasa ? formatearMedida(grasa.porcentajeGrasa) : "—"}
                  </Text>
                  <Text style={estilos.col}>
                    {frac
                      ? `${formatearMedida(frac.adiposa.kg)} / ${formatearMedida(frac.adiposa.scoreZ)}`
                      : "—"}
                  </Text>
                  <Text style={estilos.col}>
                    {frac
                      ? `${formatearMedida(frac.muscular.kg)} / ${formatearMedida(frac.muscular.scoreZ)}`
                      : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Somatotipo */}
        {resultado.somatotipo && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Somatotipo (Heath &amp; Carter, 1990)
            </Text>
            <View wrap={false}>
              <GraficoSomatocarta
                ancho={300}
                alto={260}
                puntos={conSomatotipo.map((m) => ({
                  x: m.resultado.somatotipo!.x,
                  y: m.resultado.somatotipo!.y,
                }))}
                colorDestacado={color}
              />
              <Text style={estilos.notaPie}>
                Recorrido de las consultas hasta la actual (punto grande). Eje
                X: ectomorfia menos endomorfia · Eje Y: 2×mesomorfia menos
                (endomorfia + ectomorfia).
              </Text>
            </View>
            <View style={estilos.filaCabecera}>
              <Text style={estilos.colEtiquetaCab}>Fecha</Text>
              <Text style={estilos.colCab}>Endomorfia</Text>
              <Text style={estilos.colCab}>Mesomorfia</Text>
              <Text style={estilos.colCab}>Ectomorfia</Text>
            </View>
            {conSomatotipo.map((m) => (
              <View key={m.id} style={estilos.fila} wrap={false}>
                <Text style={estilos.colEtiqueta}>
                  {formatearFecha(m.fecha)}
                  {m.id === actual.id ? " (actual)" : ""}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(m.resultado.somatotipo!.endomorfia)}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(m.resultado.somatotipo!.mesomorfia)}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(m.resultado.somatotipo!.ectomorfia)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Índices */}
        <View style={estilos.seccion} wrap={false}>
          <Text style={[estilos.seccionTitulo, { color }]}>Índices</Text>
          <FilaIndice
            etiqueta="IMC"
            valor={resultado.indices.imc}
            unidad="kg/m²"
          />
          <FilaIndice
            etiqueta="Índice cintura/cadera"
            valor={resultado.indices.indiceCinturaCadera}
            nota={
              resultado.indices.riesgoCinturaCadera
                ? ETIQUETAS_RIESGO[resultado.indices.riesgoCinturaCadera]
                : undefined
            }
          />
          <FilaIndice
            etiqueta="Suma 6 pliegues"
            valor={resultado.indices.sumatoria6Pliegues}
            unidad="mm"
          />
          <FilaIndice
            etiqueta="Suma 8 pliegues (ISAK)"
            valor={resultado.indices.sumatoria8Pliegues}
            unidad="mm"
          />
          <FilaIndice
            etiqueta="Índice músculo/óseo"
            valor={resultado.indices.indiceMusculoOseo}
          />
          <FilaIndice
            etiqueta="Índice adiposo/muscular"
            valor={resultado.indices.indiceAdiposoMuscular}
          />
          <FilaIndice
            etiqueta="Índice córmico"
            valor={resultado.indices.indiceCormico}
            unidad="%"
            nota="Talla sentado / talla"
          />
          <FilaIndice
            etiqueta="Superficie corporal"
            valor={resultado.indices.superficieCorporalM2}
            unidad="m²"
            nota="Du Bois, 1916"
          />
          <FilaIndice
            etiqueta="Índice muscular/lastre"
            valor={resultado.indices.indiceMuscularLastre}
          />
        </View>

        {/* Energía */}
        {resultado.energia && (
          <View style={estilos.seccion} wrap={false}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Energía y peso de referencia
            </Text>
            <FilaIndice
              etiqueta="Peso ideal (OMS)"
              valor={resultado.energia.pesoIdealKg}
              unidad="kg"
              nota={`Rango ${formatearMedida(resultado.energia.pesoIdealMinKg)}–${formatearMedida(resultado.energia.pesoIdealMaxKg)} kg`}
            />
            <FilaIndice
              etiqueta="Masa libre de grasa"
              valor={resultado.energia.masaLibreGrasaKg}
              unidad="kg"
            />
            <FilaIndice
              etiqueta="Metabolismo basal (Harris & Benedict)"
              valor={resultado.energia.metabolismoBasalKcal}
              unidad="kcal"
            />
            <FilaIndice
              etiqueta="MB (Cunningham)"
              valor={resultado.energia.metabolismoCunninghamKcal}
              unidad="kcal"
            />
            <FilaIndice
              etiqueta="MB (Kleiber)"
              valor={resultado.energia.metabolismoKleiberKcal}
              unidad="kcal"
            />
            <FilaIndice
              etiqueta="Gasto energético total"
              valor={resultado.energia.gastoEnergeticoTotalKcal}
              unidad="kcal"
              nota={
                resultado.energia.factorActividad != null
                  ? `Factor ${formatearMedida(resultado.energia.factorActividad)}`
                  : undefined
              }
            />
          </View>
        )}

        {/* Perfil Phantom */}
        {resultado.phantom.length > 0 && (
          <View style={estilos.seccion} break>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Proporcionalidad Phantom
            </Text>
            <Text style={estilos.notaPie}>
              La barra es el Score-Z contra el humano de referencia Phantom:
              cuanto más se aleja del centro, más se aparta la medida.
            </Text>
            {(["BASICOS", "DIAMETROS", "PERIMETROS", "PLIEGUES"] as const).map(
              (grupo) => {
                const puntos = resultado.phantom.filter(
                  (p) => p.grupo === grupo,
                );
                if (puntos.length === 0) return null;
                return (
                  <View key={grupo} wrap={false}>
                    <Text style={estilos.subgrupo}>
                      {ETIQUETAS_GRUPO_PHANTOM[grupo]}
                    </Text>
                    <View style={estilos.filaCabecera}>
                      <Text style={estilos.colEtiquetaCab}>Variable</Text>
                      <Text style={estilos.colCab}>Valor</Text>
                      <Text style={estilos.colCab}>Ajustado</Text>
                      <Text style={[estilos.colCab, { flex: 2 }]}>Z</Text>
                    </View>
                    {puntos.map((p) => (
                      <View key={p.variable} style={estilos.fila}>
                        <Text style={estilos.colEtiqueta}>{p.etiqueta}</Text>
                        <Text style={estilos.col}>
                          {formatearMedida(p.valor)}
                        </Text>
                        <Text style={estilos.col}>
                          {formatearMedida(p.valorAjustado)}
                        </Text>
                        <CeldaBarraDivergente valor={p.scoreZ} />
                      </View>
                    ))}
                  </View>
                );
              },
            )}
          </View>
        )}

        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>{pieTexto || nombreProfesional}</Text>
          <Text
            style={estilos.pieTexto}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <View style={estilos.indicador}>
      <Text style={estilos.indicadorTitulo}>{titulo}</Text>
      <Text style={estilos.indicadorValor}>{valor}</Text>
      {detalle && <Text style={estilos.indicadorDetalle}>{detalle}</Text>}
    </View>
  );
}

function FilaIndice({
  etiqueta,
  valor,
  unidad,
  nota,
}: {
  etiqueta: string;
  valor: number | null;
  unidad?: string;
  nota?: string;
}) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.colEtiqueta}>{etiqueta}</Text>
      <Text style={[estilos.col, { flex: 2 }]}>
        {formatearMedida(valor)}
        {unidad && valor != null ? ` ${unidad}` : ""}
        {nota ? ` — ${nota}` : ""}
      </Text>
    </View>
  );
}

/** Barra horizontal 0 → `max`, del ancho disponible de su contenedor. */
function BarraPorcentaje({
  valor,
  max,
  color,
}: {
  valor: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0;
  return (
    <View style={estilos.pistaBarra}>
      <View
        style={[
          estilos.rellenoBarra,
          { width: `${pct}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

/** Celda de tabla: barra + valor numérico, para la columna `%` de una fila. */
function CeldaBarraPorcentaje({
  valor,
  max,
  color,
}: {
  valor: number;
  max: number;
  color: string;
}) {
  return (
    <View style={estilos.celdaBarra}>
      <BarraPorcentaje valor={valor} max={max} color={color} />
      <Text style={estilos.celdaBarraTexto}>{formatearMedida(valor)}</Text>
    </View>
  );
}

/**
 * Celda de tabla para un Score-Z: barra que crece desde el centro hacia la
 * izquierda (negativo) o la derecha (positivo), escala fija ±3 —a partir de
 * ahí el apartamiento ya es extremo, y una escala que se estirara con el
 * valor más grande de la tabla haría que el mismo Z se vea distinto en dos
 * PDF diferentes—. El color es la banda de apartamiento (mismo criterio que
 * `InsigniaZ` en pantalla).
 */
function CeldaBarraDivergente({ valor }: { valor: number | null }) {
  if (valor == null) {
    return <Text style={[estilos.col, { flex: 2 }]}>—</Text>;
  }
  const ESCALA_MAXIMA = 3;
  const magnitud = Math.min(100, (Math.abs(valor) / ESCALA_MAXIMA) * 100);
  const color = colorDeZ(valor);
  return (
    <View style={estilos.celdaDivergente}>
      <View style={estilos.mitadIzquierda}>
        {valor < 0 && (
          <View
            style={{ width: `${magnitud}%`, height: 7, backgroundColor: color }}
          />
        )}
      </View>
      <View style={estilos.lineaCero} />
      <View style={estilos.mitadDerecha}>
        {valor > 0 && (
          <View
            style={{ width: `${magnitud}%`, height: 7, backgroundColor: color }}
          />
        )}
      </View>
      <Text style={estilos.celdaBarraTexto}>{signo(valor)}</Text>
    </View>
  );
}

/** Barra 100% apilada (proporciones por `flex`) + leyenda con sus colores. */
function BarraApilada({
  segmentos,
}: {
  segmentos: { etiqueta: string; valor: number; color: string }[];
}) {
  return (
    <View>
      <View style={estilos.barraApilada}>
        {segmentos.map((s) => (
          <View
            key={s.etiqueta}
            style={{ flex: Math.max(0, s.valor), backgroundColor: s.color }}
          />
        ))}
      </View>
      <View style={estilos.leyenda}>
        {segmentos.map((s) => (
          <View key={s.etiqueta} style={estilos.leyendaItem}>
            <View
              style={[estilos.leyendaSwatch, { backgroundColor: s.color }]}
            />
            <Text style={estilos.leyendaTexto}>
              {s.etiqueta} {formatearMedida(s.valor)} %
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Subconjunto de la API vectorial de PDFKit que expone `Canvas` de react-pdf
 * (`node_modules/@react-pdf/render`: `availableMethods`). react-pdf tipa el
 * parámetro como `any` porque es un wrapper genérico; acá se declara el
 * subconjunto real que usan los gráficos de este archivo, para no perderlo.
 */
interface Pintor {
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

/** Fecha corta (sin año) para las etiquetas del eje X: el año ya está en la fecha de la medición del encabezado y en la tabla de abajo. */
const formateadorFechaCorta = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
function formatearFechaCorta(fecha: Date | string): string {
  return formateadorFechaCorta.format(new Date(fecha));
}

/**
 * Gráfico de líneas con sus dos ejes dibujados: el Y con tres marcas de valor
 * (máximo, medio, mínimo) y el X con la fecha bajo cada punto — más el valor
 * de cada serie escrito arriba (o abajo, la segunda serie) de su punto. Con
 * pocos puntos entran todas las etiquetas; con muchos, se saltean a un paso
 * fijo para que no se superpongan, sin dejar nunca afuera al primero ni al
 * último.
 */
function GraficoLineas({
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

/**
 * Somatocarta: recorrido de los puntos (x, y) del somatotipo en el tiempo,
 * sobre el triángulo de referencia de Heath & Carter (endo abajo-izquierda,
 * meso arriba, ecto abajo-derecha) — igual que `Somatocarta.tsx` en pantalla,
 * mismos vértices y mismo rango fijo (X [−9, 9], Y [−10, 16]: fijo y no
 * autoescalado, para que el mismo punto signifique el mismo lugar en la carta
 * entre dos consultas o dos pacientes).
 */
function GraficoSomatocarta({
  ancho,
  alto,
  puntos,
  colorDestacado,
}: {
  ancho: number;
  alto: number;
  puntos: { x: number; y: number }[];
  colorDestacado: string;
}) {
  const relleno = 16;
  const rangoX: [number, number] = [-9, 9];
  const rangoY: [number, number] = [-10, 16];
  const aX = (x: number) =>
    relleno +
    ((x - rangoX[0]) / (rangoX[1] - rangoX[0])) * (ancho - 2 * relleno);
  const aY = (y: number) =>
    alto -
    relleno -
    ((y - rangoY[0]) / (rangoY[1] - rangoY[0])) * (alto - 2 * relleno);

  return (
    <Canvas
      style={{ width: ancho, height: alto, backgroundColor: FONDO_SUAVE }}
      paint={(p: Pintor) => {
        // Ejes que cruzan por (0, 0).
        p.moveTo(aX(rangoX[0]), aY(0))
          .lineTo(aX(rangoX[1]), aY(0))
          .lineWidth(0.5)
          .strokeColor(BORDE)
          .stroke();
        p.moveTo(aX(0), aY(rangoY[0]))
          .lineTo(aX(0), aY(rangoY[1]))
          .lineWidth(0.5)
          .strokeColor(BORDE)
          .stroke();

        if (puntos.length > 1) {
          p.moveTo(aX(puntos[0]!.x), aY(puntos[0]!.y));
          for (const punto of puntos.slice(1)) {
            p.lineTo(aX(punto.x), aY(punto.y));
          }
          p.lineWidth(1).strokeColor(GRIS_SUAVE).stroke();
        }

        puntos.forEach((punto, i) => {
          const esUltimo = i === puntos.length - 1;
          p.circle(aX(punto.x), aY(punto.y), esUltimo ? 3.5 : 2)
            .fillColor(esUltimo ? colorDestacado : GRIS_SUAVE)
            .fill();
        });

        // Triángulo de referencia (los tres tipos extremos) y sus vértices,
        // por encima de todo lo demás — así no hace falta "desactivar" el
        // punteado para las líneas sólidas que ya se dibujaron.
        p.moveTo(aX(0), aY(14))
          .lineTo(aX(-7), aY(-7))
          .lineTo(aX(7), aY(-7))
          .lineTo(aX(0), aY(14))
          .lineWidth(1)
          .strokeColor(GRIS_SUAVE)
          .dash(4, { space: 3 })
          .stroke();

        p.font("Helvetica-Bold").fontSize(6.5).fillColor(GRIS_TEXTO);
        p.text("MESOMORFIA", aX(-9), Math.max(0, aY(15.6)), {
          width: aX(9) - aX(-9),
          align: "center",
        });
        p.text("ENDOMORFIA", aX(-9), aY(-8.6), { width: 60, align: "left" });
        p.text("ECTOMORFIA", aX(9) - 60, aY(-8.6), {
          width: 60,
          align: "right",
        });

        return null;
      }}
    />
  );
}
