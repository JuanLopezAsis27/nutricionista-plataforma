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

/**
 * Documento PDF de UNA medición antropométrica.
 *
 * La planilla que arma es la MISMA que la ficha en pantalla (`DetalleMedicion`):
 * lee `GRUPOS` de `filasMedicion.ts`, la única definición de la planilla. Así
 * el PDF nunca se desincroniza de lo que se ve al clickear una tarjeta — si se
 * agrega una medida al formulario, las tres vistas la muestran o ninguna.
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

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

function formatearFecha(fecha: Date | string | null | undefined): string {
  return fecha ? formateadorFecha.format(new Date(fecha)) : "—";
}
function formatearMedida(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorMedida.format(valor);
}
function formatearNumero(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorNumero.format(valor);
}

/**
 * `GRUPOS` trae etiquetas pensadas para pantalla ("Σ 6 pliegues"), donde el
 * navegador tiene una fuente Unicode completa. La fuente Helvetica estándar
 * de PDFKit no tiene glifo para la sigma griega y la imprime como "£"; acá se
 * cambia SOLO al mostrarla, sin tocar `filasMedicion.ts` — esa etiqueta la
 * lee también la pantalla, y ahí sí se ve bien.
 */
function textoPdf(texto: string): string {
  return texto.replace(/Σ/g, "Suma");
}

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
});

interface Props {
  medicion: MedicionComposicionDto;
  /** La consulta inmediatamente anterior, para la columna de diferencia. */
  anterior: MedicionComposicionDto | null;
  nombrePaciente: string;
  config?: ConfiguracionSalidaDto | null;
}

function signo(valor: number): string {
  return `${valor > 0 ? "+" : ""}${formatearMedida(valor)}`;
}

/** Renderiza la medición a un buffer PDF (la única API que consume la presentación). */
export async function renderizarMedicionPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<MedicionAntropometricaPdf {...props} />);
}

function MedicionAntropometricaPdf({
  medicion,
  anterior,
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
