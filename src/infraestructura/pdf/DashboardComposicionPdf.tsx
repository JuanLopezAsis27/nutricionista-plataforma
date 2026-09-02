import {
  Document,
  Page,
  Text,
  View,
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
 * mira `DashboardComposicion.tsx` en pantalla, en forma de reporte imprimible.
 *
 * No redibuja los gráficos (donut, somatocarta, barras de Phantom): react-pdf
 * no puede reusar los componentes de pantalla —son SVG del DOM, no las
 * primitivas de este renderer— y reconstruirlos acá sería un motor de
 * gráficos aparte. En su lugar, cada gráfico se vuelca como la TABLA que ya
 * tiene atrás: son los mismos números, auditables, y es justo lo que
 * `filasMedicion.ts` ya eligió para la planilla de una consulta.
 *
 * Exclusivo del nutricionista: es el dashboard TÉCNICO —Phantom, somatocarta,
 * índices— que `ComposicionPaciente.tsx` excluye a propósito del portal.
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

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
              <Text style={estilos.colCab}>% grasa</Text>
              <Text style={estilos.colCab}>Masa grasa (kg)</Text>
              <Text style={estilos.colCab}>M. libre grasa (kg)</Text>
            </View>
            {resultado.grasaPorPliegues.resultados.map((r) => (
              <View key={r.metodo} style={estilos.fila}>
                <Text style={estilos.colEtiqueta}>
                  {r.etiqueta}
                  {r.metodo === actual.metodoGrasa ? " (destacada)" : ""}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(r.porcentajeGrasa)}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(r.masaGrasaKg)}
                </Text>
                <Text style={estilos.col}>
                  {formatearMedida(r.masaLibreGrasaKg)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Fraccionamiento en 5 masas */}
        {resultado.fraccionamiento && (
          <View style={estilos.seccion} wrap={false}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Fraccionamiento en 5 masas (Kerr, 1988)
            </Text>
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
                <View style={estilos.filaCabecera}>
                  <Text style={estilos.colEtiquetaCab}>Zona</Text>
                  <Text style={estilos.colCab}>Σ (mm)</Text>
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
              <View wrap={false}>
                <Text style={estilos.subgrupo}>Tejido muscular</Text>
                <View style={estilos.filaCabecera}>
                  <Text style={estilos.colEtiquetaCab}>Segmento</Text>
                  <Text style={estilos.colCab}>Corregido (cm)</Text>
                  <Text style={estilos.colCab}>%</Text>
                  <Text style={estilos.colCab}>Z</Text>
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
                    <Text style={estilos.col}>
                      {formatearMedida(seg.scoreZ)}
                    </Text>
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
            etiqueta="Σ 6 pliegues"
            valor={resultado.indices.sumatoria6Pliegues}
            unidad="mm"
          />
          <FilaIndice
            etiqueta="Σ 8 pliegues (ISAK)"
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
                      <Text style={estilos.colCab}>Z</Text>
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
                        <Text style={estilos.col}>
                          {formatearMedida(p.scoreZ)}
                        </Text>
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
