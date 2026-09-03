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
import { DEFINICIONES_METODO } from "@/dominio/servicios/grasaPorPliegues";
import { GRUPOS } from "@/aplicacion/servicios/evaluacion/filasMedicion";
import { ETIQUETAS_PROTOCOLO } from "@/aplicacion/servicios/evaluacion/resumenMedicion";
import {
  BarraApilada,
  GraficoLineas,
  estilosGrafico,
  formatearFecha,
  formatearMedida,
  formatearNumero,
  textoPdf,
  CORAL,
  GRIS_TEXTO,
  GRIS_SUAVE,
  FONDO_SUAVE,
  BORDE,
  COLOR_ADIPOSA,
  COLOR_MUSCULAR,
  COLOR_RESIDUAL,
  COLOR_OSEA,
  COLOR_PIEL,
} from "./graficosPdf";

/**
 * Documento PDF de UNA medición antropométrica — el que se baja el paciente.
 *
 * La planilla que arma es la MISMA que la ficha en pantalla (`DetalleMedicion`):
 * lee `GRUPOS` de `filasMedicion.ts`, la única definición de la planilla. Así
 * el PDF nunca se desincroniza de lo que se ve al clickear una tarjeta — si se
 * agrega una medida al formulario, las tres vistas la muestran o ninguna.
 *
 * Antes de la planilla van los GRÁFICOS: cómo se reparte el peso y la
 * evolución de la serie. Son los mismos dos que el paciente mira en
 * `ComposicionPaciente`, y sin ellos el PDF era una tabla de cuarenta números
 * crudos —justo lo que esa pantalla evita mostrarle sin interpretación—. Los
 * dibuja `graficosPdf`, el mismo módulo que usa el dashboard del profesional.
 *
 * Lo que NO trae, igual que la pantalla: perfil Phantom, somatocarta e índices
 * técnicos. Eso es lectura profesional y vive en `DashboardComposicionPdf`.
 */

/** Ancho útil de la página (A4, 595,28 pt − 48 pt de margen a cada lado). */
const ANCHO_CONTENIDO = 499;

const estilos = StyleSheet.create({
  pagina: {
    padding: 48,
    paddingBottom: 64,
    fontSize: 10,
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

  observaciones: {
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
    fontSize: 9,
    lineHeight: 1.4,
  },

  grupo: { marginBottom: 10 },
  grupoTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: GRIS_SUAVE,
    backgroundColor: FONDO_SUAVE,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  filaDerivada: { backgroundColor: "#fff7f7" },
  celdaEtiqueta: { flex: 1, fontSize: 9 },
  celdaValor: {
    width: 80,
    fontSize: 9,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  celdaDelta: {
    width: 70,
    fontSize: 9,
    textAlign: "right",
    color: GRIS_SUAVE,
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

  // --- Gráficos ------------------------------------------------------------
  seccionTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
    marginBottom: 6,
  },
  notaGrafico: { fontSize: 8, color: GRIS_SUAVE, marginBottom: 6 },
  filaTabla: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
  },
  filaCabecera: {
    flexDirection: "row",
    backgroundColor: FONDO_SUAVE,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  colFecha: { flex: 1, fontSize: 8 },
  colFechaCab: {
    flex: 1,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
  },
  colNumero: { width: 90, fontSize: 8, textAlign: "right" },
  colNumeroCab: {
    width: 90,
    fontSize: 8,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
  },
});

interface Props {
  medicion: MedicionComposicionDto;
  /** La consulta inmediatamente anterior, para la columna de diferencia. */
  anterior: MedicionComposicionDto | null;
  /**
   * La serie del paciente HASTA esta medición (de la más vieja a esta),
   * incluida. Es lo que dibujan los gráficos de evolución.
   *
   * Va hasta esta y no hasta la última: el PDF de una medición de marzo que
   * mostrara la curva completa hasta hoy diría cosas que en marzo no se
   * sabían, y dos copias del mismo PDF sacadas en fechas distintas no
   * coincidirían.
   */
  serie?: MedicionComposicionDto[];
  nombrePaciente: string;
  config?: ConfiguracionSalidaDto | null;
}

function signo(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}

/** El resultado de grasa de la ecuación destacada de esa medición. */
function grasaDestacada(medicion: MedicionComposicionDto) {
  const resultados = medicion.resultado.grasaPorPliegues.resultados;
  return (
    resultados.find((r) => r.metodo === medicion.metodoGrasa) ??
    resultados[0] ??
    null
  );
}

/** Renderiza la medición a un buffer PDF (la única API que consume la presentación). */
export async function renderizarMedicionPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<MedicionAntropometricaPdf {...props} />);
}

function MedicionAntropometricaPdf({
  medicion,
  anterior,
  serie,
  nombrePaciente,
  config,
}: Props) {
  const color = config?.pdfColorPrimario || CORAL;
  const nombreProfesional =
    config?.nombreProfesional?.trim() || "Consultorio de Nutrición";
  const subtituloConfig = config?.pdfSubtitulo?.trim() || null;
  const matricula = config?.matricula?.trim() || null;
  const pieTexto = config?.pdfPieTexto?.trim() || null;

  const metodoDestacado =
    medicion.metodoGrasa != null
      ? DEFINICIONES_METODO[medicion.metodoGrasa].etiqueta
      : null;

  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    filas: grupo.filas.filter(
      (fila) => fila.derivada || fila.valor(medicion) != null,
    ),
  })).filter((grupo) => grupo.filas.some((f) => f.valor(medicion) != null));

  // --- Datos de los gráficos ---
  const fraccionamiento = medicion.resultado.fraccionamiento;
  const grasa = grasaDestacada(medicion);

  // El reparto del peso sale del fraccionamiento de Kerr cuando está —es la
  // partición completa— y, si no, de la ecuación de pliegues, que reparte el
  // peso en dos: lo graso y lo demás. Sin ninguno de los dos no hay barra que
  // dibujar, y una barra de un solo color no dice nada.
  const reparto = fraccionamiento
    ? [
        {
          etiqueta: "Adiposa",
          valor: fraccionamiento.adiposa.porcentaje,
          color: COLOR_ADIPOSA,
        },
        {
          etiqueta: "Muscular",
          valor: fraccionamiento.muscular.porcentaje,
          color: COLOR_MUSCULAR,
        },
        {
          etiqueta: "Residual",
          valor: fraccionamiento.residual.porcentaje,
          color: COLOR_RESIDUAL,
        },
        {
          etiqueta: "Ósea",
          valor: fraccionamiento.osea.porcentaje,
          color: COLOR_OSEA,
        },
        {
          etiqueta: "Piel",
          valor: fraccionamiento.piel.porcentaje,
          color: COLOR_PIEL,
        },
      ]
    : grasa
      ? [
          {
            etiqueta: "Grasa",
            valor: grasa.porcentajeGrasa,
            color: COLOR_ADIPOSA,
          },
          {
            etiqueta: "Libre de grasa",
            valor: 100 - grasa.porcentajeGrasa,
            color: COLOR_MUSCULAR,
          },
        ]
      : null;

  // La serie llega hasta esta medición; si no vino, el PDF es de una sola y no
  // hay evolución que mostrar.
  const evolucion = serie ?? [];
  const hayEvolucion = evolucion.length > 1;
  const fechasEvolucion = evolucion.map((m) => m.fecha);
  const seriePeso = evolucion.map((m) => m.medidas.pesoKg);
  const serieGrasa = evolucion.map(
    (m) => grasaDestacada(m)?.porcentajeGrasa ?? null,
  );
  const hayGrasaEnSerie = serieGrasa.some((v) => v != null);

  return (
    <Document
      title={`Medición del ${formatearFecha(medicion.fecha)}`}
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

        <Text style={estilos.titulo}>
          Medición antropométrica del {formatearFecha(medicion.fecha)}
        </Text>
        <Text style={estilos.paciente}>Paciente: {nombrePaciente}</Text>
        <Text style={estilos.subtitulo}>
          {ETIQUETAS_PROTOCOLO[medicion.protocolo]}
          {metodoDestacado && ` · ecuación destacada: ${metodoDestacado}`}
          {medicion.edadAnios != null &&
            ` · ${formatearNumero(medicion.edadAnios)} años`}
          {anterior
            ? ` · comparada con la del ${formatearFecha(anterior.fecha)}`
            : " · primera medición del paciente"}
        </Text>

        {medicion.observaciones && (
          <Text style={estilos.observaciones}>{medicion.observaciones}</Text>
        )}

        {reparto && (
          <View wrap={false}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Cómo se reparte tu peso
            </Text>
            <BarraApilada segmentos={reparto} />
            <Text style={estilos.notaGrafico}>
              {fraccionamiento
                ? `Fraccionamiento en 5 masas sobre ${formatearMedida(medicion.medidas.pesoKg)} kg.`
                : `Estimado con ${metodoDestacado ?? "la ecuación destacada"} sobre ${formatearMedida(medicion.medidas.pesoKg)} kg: ${formatearMedida(grasa?.masaGrasaKg)} kg de grasa y ${formatearMedida(grasa?.masaLibreGrasaKg)} kg libres de grasa.`}
            </Text>
          </View>
        )}

        {hayEvolucion && (
          <View>
            <Text style={[estilos.seccionTitulo, { color }]}>Tu evolución</Text>

            <View style={estilosGrafico.bloqueGrafico} wrap={false}>
              <Text style={estilosGrafico.tituloGrafico}>Peso (kg)</Text>
              <GraficoLineas
                ancho={ANCHO_CONTENIDO}
                alto={100}
                series={[{ color, valores: seriePeso }]}
                fechas={fechasEvolucion}
                unidad="kg"
              />
            </View>

            {hayGrasaEnSerie && (
              <View style={estilosGrafico.bloqueGrafico} wrap={false}>
                <Text style={estilosGrafico.tituloGrafico}>
                  Grasa corporal (%)
                  {metodoDestacado && ` · ${metodoDestacado}`}
                </Text>
                <GraficoLineas
                  ancho={ANCHO_CONTENIDO}
                  alto={100}
                  series={[{ color: COLOR_ADIPOSA, valores: serieGrasa }]}
                  fechas={fechasEvolucion}
                  unidad="%"
                />
              </View>
            )}

            {/* La tabla acompaña al gráfico, no lo reemplaza: con muchas
                mediciones el gráfico saltea etiquetas para que no se pisen, y
                los números exactos tienen que estar en algún lado. */}
            <View wrap={false}>
              <View style={estilos.filaCabecera}>
                <Text style={estilos.colFechaCab}>Medición</Text>
                <Text style={estilos.colNumeroCab}>Peso (kg)</Text>
                {hayGrasaEnSerie && (
                  <Text style={estilos.colNumeroCab}>Grasa (%)</Text>
                )}
              </View>
              {evolucion.map((m, i) => (
                <View key={m.id} style={estilos.filaTabla}>
                  <Text style={estilos.colFecha}>
                    {formatearFecha(m.fecha)}
                    {i === evolucion.length - 1 ? " · esta" : ""}
                  </Text>
                  <Text style={estilos.colNumero}>
                    {formatearMedida(m.medidas.pesoKg)}
                  </Text>
                  {hayGrasaEnSerie && (
                    <Text style={estilos.colNumero}>
                      {formatearMedida(serieGrasa[i])}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {(reparto || hayEvolucion) && (
          <Text style={[estilos.seccionTitulo, { color }]}>
            Todas tus medidas
          </Text>
        )}

        {grupos.map((grupo) => (
          <View key={grupo.titulo} style={estilos.grupo} wrap={false}>
            <Text style={estilos.grupoTitulo}>{textoPdf(grupo.titulo)}</Text>
            {grupo.filas.map((fila) => {
              const valor = fila.valor(medicion);
              const previo = anterior ? fila.valor(anterior) : null;
              const delta =
                valor != null && previo != null ? valor - previo : null;

              return (
                <View
                  key={fila.etiqueta}
                  style={
                    fila.derivada
                      ? [estilos.fila, estilos.filaDerivada]
                      : estilos.fila
                  }
                >
                  <Text style={estilos.celdaEtiqueta}>
                    {textoPdf(fila.etiqueta)}
                  </Text>
                  <Text style={estilos.celdaValor}>
                    {formatearMedida(valor)}
                  </Text>
                  {anterior && (
                    <Text style={estilos.celdaDelta}>
                      {delta == null || delta === 0 ? "—" : signo(delta)}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}

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
