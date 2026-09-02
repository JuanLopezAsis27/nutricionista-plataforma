import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  HistoriaClinicaSalidaDto,
  AlertaAlimentariaSalidaDto,
  LaboratorioSalidaDto,
} from "@/aplicacion/dtos/evaluacion.dto";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import type {
  TipoAlertaAlimentaria,
  SeveridadAlerta,
} from "@/dominio/entidades/AlertaAlimentaria";

/**
 * Documento PDF de la Evaluación Integral de un paciente: historia clínica,
 * alertas alimentarias (intolerancias/alergias/restricciones) y laboratorios.
 *
 * Exclusivo del nutricionista — es la misma barrera que ya tiene el router de
 * Evaluación (`miComposicion` es la ÚNICA parte que el portal del paciente
 * puede leer). No confundir con `MedicionAntropometricaPdf`, que sí baja al
 * paciente: acá vive lo clínico que no es una medida corporal.
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

// Formateador y etiquetas propias: la infraestructura no puede importar
// `@/lib/formato` (es presentación). Mismo formato de fecha que allá.
const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
function formatearFecha(fecha: Date | string | null | undefined): string {
  return fecha ? formateadorFecha.format(new Date(fecha)) : "—";
}

const ETIQUETAS_TIPO_ALERTA: Record<TipoAlertaAlimentaria, string> = {
  ALERGIA: "Alergia",
  INTOLERANCIA: "Intolerancia",
  RESTRICCION: "Restricción",
};
const ETIQUETAS_SEVERIDAD: Record<SeveridadAlerta, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  SEVERA: "Severa",
};

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
  datosPaciente: { fontSize: 9, color: GRIS_SUAVE, marginBottom: 14 },

  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingBottom: 3,
    marginBottom: 6,
  },
  vacio: { fontSize: 9, color: GRIS_SUAVE, fontStyle: "italic" },

  campo: { marginBottom: 6 },
  campoEtiqueta: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  campoValor: { fontSize: 10, lineHeight: 1.4 },

  tarjeta: {
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  tarjetaCabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  tarjetaTitulo: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  tarjetaMeta: { fontSize: 8, color: GRIS_SUAVE },
  tarjetaTexto: { fontSize: 9, lineHeight: 1.4, color: GRIS_TEXTO },

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
  paciente: PacienteSalidaDto;
  historiaClinica: HistoriaClinicaSalidaDto | null;
  alertas: AlertaAlimentariaSalidaDto[];
  laboratorios: LaboratorioSalidaDto[];
  config?: ConfiguracionSalidaDto | null;
}

const CAMPOS_HISTORIA: {
  clave: keyof HistoriaClinicaSalidaDto;
  etiqueta: string;
}[] = [
  { clave: "motivoConsulta", etiqueta: "Motivo de consulta" },
  { clave: "diagnosticos", etiqueta: "Diagnósticos" },
  { clave: "medicacion", etiqueta: "Medicación" },
  { clave: "antecedentesPersonales", etiqueta: "Antecedentes personales" },
  { clave: "antecedentesFamiliares", etiqueta: "Antecedentes familiares" },
  { clave: "habitos", etiqueta: "Hábitos" },
  { clave: "contexto", etiqueta: "Contexto" },
];

/** Renderiza la evaluación a un buffer PDF (la única API que consume la presentación). */
export async function renderizarEvaluacionPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<EvaluacionPacientePdf {...props} />);
}

function EvaluacionPacientePdf({
  paciente,
  historiaClinica,
  alertas,
  laboratorios,
  config,
}: Props) {
  const color = config?.pdfColorPrimario || CORAL;
  const nombreProfesional =
    config?.nombreProfesional?.trim() || "Consultorio de Nutrición";
  const subtituloConfig = config?.pdfSubtitulo?.trim() || null;
  const matricula = config?.matricula?.trim() || null;
  const pieTexto = config?.pdfPieTexto?.trim() || null;
  const nombrePaciente = `${paciente.nombre} ${paciente.apellido}`;

  const camposHistoriaConValor = historiaClinica
    ? CAMPOS_HISTORIA.filter((c) => historiaClinica[c.clave])
    : [];

  return (
    <Document
      title={`Evaluación de ${nombrePaciente}`}
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

        <Text style={estilos.titulo}>Evaluación integral</Text>
        <Text style={estilos.datosPaciente}>
          {nombrePaciente} · {paciente.email}
          {paciente.telefono && ` · ${paciente.telefono}`}
          {paciente.fechaNacimiento &&
            ` · Nac. ${formatearFecha(paciente.fechaNacimiento)}`}
        </Text>

        {/* Alertas alimentarias */}
        <View style={estilos.seccion}>
          <Text style={[estilos.seccionTitulo, { color }]}>
            Alertas alimentarias
          </Text>
          {alertas.length === 0 ? (
            <Text style={estilos.vacio}>
              Sin alertas alimentarias registradas.
            </Text>
          ) : (
            alertas.map((alerta) => (
              <View key={alerta.id} style={estilos.tarjeta} wrap={false}>
                <View style={estilos.tarjetaCabecera}>
                  <Text style={estilos.tarjetaTitulo}>
                    {ETIQUETAS_TIPO_ALERTA[alerta.tipo]}: {alerta.descripcion}
                  </Text>
                  <Text style={estilos.tarjetaMeta}>
                    {ETIQUETAS_SEVERIDAD[alerta.severidad]}
                  </Text>
                </View>
                {alerta.notas && (
                  <Text style={estilos.tarjetaTexto}>{alerta.notas}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Historia clínica */}
        <View style={estilos.seccion}>
          <Text style={[estilos.seccionTitulo, { color }]}>
            Historia clínica
          </Text>
          {!historiaClinica ||
          (camposHistoriaConValor.length === 0 &&
            historiaClinica.camposPersonalizados.length === 0) ? (
            <Text style={estilos.vacio}>Sin historia clínica cargada.</Text>
          ) : (
            <>
              {camposHistoriaConValor.map((c) => (
                <View key={c.clave} style={estilos.campo} wrap={false}>
                  <Text style={estilos.campoEtiqueta}>{c.etiqueta}</Text>
                  <Text style={estilos.campoValor}>
                    {historiaClinica[c.clave] as string}
                  </Text>
                </View>
              ))}
              {historiaClinica.camposPersonalizados.map((campo) => (
                <View key={campo.clave} style={estilos.campo} wrap={false}>
                  <Text style={estilos.campoEtiqueta}>{campo.etiqueta}</Text>
                  <Text style={estilos.campoValor}>{campo.valor}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Laboratorios */}
        <View style={estilos.seccion}>
          <Text style={[estilos.seccionTitulo, { color }]}>Laboratorios</Text>
          {laboratorios.length === 0 ? (
            <Text style={estilos.vacio}>Sin laboratorios registrados.</Text>
          ) : (
            laboratorios.map((lab) => (
              <View key={lab.id} style={estilos.tarjeta} wrap={false}>
                <View style={estilos.tarjetaCabecera}>
                  <Text style={estilos.tarjetaTitulo}>{lab.titulo}</Text>
                  <Text style={estilos.tarjetaMeta}>
                    {formatearFecha(lab.fecha)}
                  </Text>
                </View>
                {lab.notas && (
                  <Text style={estilos.tarjetaTexto}>{lab.notas}</Text>
                )}
                {lab.adjuntos.length > 0 && (
                  <Text style={estilos.tarjetaMeta}>
                    {lab.adjuntos.length} archivo(s) adjunto(s) — disponibles en
                    la app
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

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
