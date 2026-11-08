import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  CompetenciaDeAsignacionSalidaDto,
  IngestaSalidaDto,
  PlanificacionSalidaDto,
} from "@/aplicacion/dtos/planificacionDeportiva.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import {
  CAFEINA_MG_KG_HABITUAL,
  ETIQUETA_MODALIDAD_CARRERA,
  type EstadoObjetivo,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { formatearFecha } from "./graficosPdf";

/**
 * Documento PDF de una planificación deportiva: lo que muestra su página
 * (`VistaPlanificacion`), en papel. La carrera, los números por hora contra
 * los objetivos, la línea de tiempo de ingestas como tabla —para imprimirla y
 * llevarla— y lo de antes y después. El membrete y el color salen de la
 * configuración del profesional, como el PDF del plan.
 *
 * Lo bajan el profesional, el paciente desde su portal y el respaldo del
 * consultorio: los tres dibujan este mismo documento.
 *
 * La Helvetica estándar no tiene «≈», «−» ni «≥»: van «aprox.» y «-».
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";
const VERDE = "#047857";
const AMBAR = "#b45309";

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
  paciente: { fontSize: 11, color: GRIS_SUAVE, marginBottom: 4 },
  competencia: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    fontSize: 10,
  },
  competenciaNombre: { fontFamily: "Helvetica-Bold" },
  descripcion: { fontSize: 10, color: GRIS_SUAVE, marginBottom: 6 },

  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingBottom: 3,
    marginBottom: 6,
  },

  datos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dato: {
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  datoValor: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  datoEtiqueta: { fontSize: 7, color: GRIS_SUAVE, textTransform: "uppercase" },

  indicadores: { flexDirection: "row", gap: 6 },
  indicador: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
  },
  indicadorTitulo: {
    fontSize: 7,
    color: GRIS_SUAVE,
    textTransform: "uppercase",
  },
  indicadorValor: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  indicadorDetalle: { fontSize: 7, marginTop: 2, lineHeight: 1.3 },
  aviso: { fontSize: 8, color: AMBAR, marginTop: 5 },
  nota: { fontSize: 8, color: GRIS_SUAVE, marginTop: 5, lineHeight: 1.4 },

  // Sin recuadro exterior: cuando la tabla sigue en la página siguiente, el
  // borde de la primera parte se estiraba hasta el pie como un cuadro vacío.
  tabla: { borderTopWidth: 1, borderTopColor: BORDE },
  filaCabecera: {
    flexDirection: "row",
    backgroundColor: FONDO_SUAVE,
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
  },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
  },
  filaAntes: { backgroundColor: FONDO_SUAVE },
  celdaCabecera: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: GRIS_SUAVE,
    textTransform: "uppercase",
    padding: 4,
  },
  celda: { padding: 4, fontSize: 9, lineHeight: 1.35 },
  momento: { fontFamily: "Helvetica-Bold" },
  notaIngesta: {
    fontFamily: "Helvetica-Oblique",
    color: GRIS_SUAVE,
    marginTop: 2,
  },
  aporte: { fontSize: 8, color: GRIS_SUAVE },
  colMomento: { width: "21%" },
  colHora: { width: "9%" },
  colKm: { width: "11%" },
  colTomar: { width: "38%" },
  colAporta: { width: "21%" },

  texto: { marginBottom: 6 },
  textoTitulo: { fontFamily: "Helvetica-Bold", marginBottom: 1 },
  textoCuerpo: { lineHeight: 1.4 },

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

export interface DatosPdfPlanificacion {
  planificacion: PlanificacionSalidaDto;
  /** Con paciente, el PDF dice de quién es. Una general no lo lleva. */
  nombrePaciente?: string | null;
  /** La competencia para la que se la asignó a ese paciente. */
  competencia?: CompetenciaDeAsignacionSalidaDto | null;
  /** Configuración del profesional (membrete y color). */
  config?: ConfiguracionSalidaDto | null;
}

/** Renderiza la planificación a un buffer PDF (la única API que consume la presentación). */
export async function renderizarPlanificacionPdf(
  datos: DatosPdfPlanificacion,
): Promise<Buffer> {
  return renderToBuffer(<PlanificacionDeportivaPdf {...datos} />);
}

// --- Formato: el mismo que la pantalla (`planificacion-deportiva/presentacion`) --

/** «12,5»: coma decimal y un decimal como mucho, como en la pantalla. */
function numero(valor: number | null | undefined, sufijo = ""): string {
  if (valor == null) return "—";
  return `${String(Math.round(valor * 10) / 10).replace(".", ",")}${sufijo}`;
}

/** 225 → «3:45 h»; 50 → «50 min». */
function textoDuracion(minutos: number | null | undefined): string {
  if (minutos == null) return "—";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}:${String(m).padStart(2, "0")} h`;
}

/** 5.33 → «5:20 /km». */
function textoRitmo(minPorKm: number | null | undefined): string | null {
  if (minPorKm == null || !Number.isFinite(minPorKm) || minPorKm <= 0) {
    return null;
  }
  let minutos = Math.floor(minPorKm);
  let segundos = Math.round((minPorKm - minutos) * 60);
  if (segundos === 60) {
    minutos += 1;
    segundos = 0;
  }
  return `${minutos}:${String(segundos).padStart(2, "0")} /km`;
}

/** Cuándo se toma, como lo vive el corredor. */
function momento(ingesta: IngestaSalidaDto): string {
  if (ingesta.minuto < 0) {
    return `${ingesta.tiempo.replace("-", "")} antes de largar`;
  }
  if (ingesta.minuto === 0) return "En la largada";
  return `${ingesta.tiempo} de carrera`;
}

/** El km cargado, o el aproximado a ritmo parejo (solo en calle). */
function km(ingesta: IngestaSalidaDto): string {
  if (ingesta.km != null) return numero(ingesta.km);
  if (ingesta.kmEstimado != null) return `${numero(ingesta.kmEstimado)} aprox.`;
  return "";
}

function aporte(ingesta: IngestaSalidaDto): string {
  return [
    ingesta.macros.carbohidratosG != null &&
      `${numero(ingesta.macros.carbohidratosG)} g de carbohidratos`,
    ingesta.macros.calorias != null && `${ingesta.macros.calorias} kcal`,
    ingesta.liquidosMl != null && `${ingesta.liquidosMl} ml`,
    ingesta.cafeinaMg != null && `${numero(ingesta.cafeinaMg)} mg de cafeína`,
    ingesta.sodioMg != null && `${numero(ingesta.sodioMg)} mg de sodio`,
  ]
    .filter(Boolean)
    .join(" · ");
}

const TEXTO_ESTADO: Record<EstadoObjetivo, string> = {
  DEBAJO: "por debajo del objetivo",
  CUMPLE: "en el objetivo",
  ENCIMA: "por encima del objetivo",
};

function PlanificacionDeportivaPdf({
  planificacion: p,
  nombrePaciente,
  competencia,
  config,
}: DatosPdfPlanificacion) {
  const color = config?.pdfColorPrimario || CORAL;
  const nombreProfesional =
    config?.nombreProfesional?.trim() || "Consultorio de Nutrición";
  const subtitulo = config?.pdfSubtitulo?.trim() || null;
  const matricula = config?.matricula?.trim() || null;
  const pieTexto = config?.pdfPieTexto?.trim() || null;

  const c = p.carrera;
  const { durante, antes, cafeina } = p.resumen;
  const ritmo = textoRitmo(c?.ritmoMinPorKm);
  const cafeinaAlta =
    cafeina.mgPorKg != null && cafeina.mgPorKg > CAFEINA_MG_KG_HABITUAL.maximo;
  const tramoLargo =
    p.resumen.intervaloMaximoMin != null &&
    p.resumen.intervaloMaximoMin > 60 &&
    durante.cantidad > 0;

  const datosCarrera = c
    ? [
        {
          etiqueta: "Distancia",
          valor: `${numero(c.distanciaKm, " km")} · ${ETIQUETA_MODALIDAD_CARRERA[c.modalidad]}`,
        },
        {
          etiqueta: "Duración estimada",
          valor: textoDuracion(c.duracionEstimadaMin),
        },
        ritmo && { etiqueta: "Ritmo", valor: ritmo },
        c.horaLargada && { etiqueta: "Largada", valor: `${c.horaLargada} h` },
        c.temperaturaEstimadaC != null && {
          etiqueta: "Temperatura",
          valor: numero(c.temperaturaEstimadaC, " °C"),
        },
        (c.desnivelPositivoM != null || c.desnivelNegativoM != null) && {
          etiqueta: "Desnivel",
          valor: [
            c.desnivelPositivoM != null && `+${c.desnivelPositivoM} m`,
            c.desnivelNegativoM != null && `-${c.desnivelNegativoM} m`,
          ]
            .filter(Boolean)
            .join(" / "),
        },
      ].filter((d): d is { etiqueta: string; valor: string } => Boolean(d))
    : [];

  const indicadores: {
    titulo: string;
    valor: string;
    detalle: string;
    estado: EstadoObjetivo | null;
    textoEstado?: string;
  }[] = [
    {
      titulo: "Carbohidratos",
      valor: numero(durante.porHora.carbohidratosG, " g/h"),
      detalle:
        c?.carbohidratosObjetivoGH != null
          ? `Objetivo ${numero(c.carbohidratosObjetivoGH, " g/h")}`
          : `${numero(durante.macros.carbohidratosG, " g")} en total`,
      estado: p.resumen.carbohidratos,
    },
    {
      titulo: "Líquidos",
      valor: numero(durante.porHora.liquidosMl, " ml/h"),
      detalle:
        c?.liquidosObjetivoMlH != null
          ? `Objetivo ${numero(c.liquidosObjetivoMlH, " ml/h")}`
          : `${numero(durante.liquidosMl, " ml")} en total`,
      estado: p.resumen.liquidos,
    },
    {
      titulo: "Sodio",
      valor: numero(durante.porHora.sodioMg, " mg/h"),
      detalle:
        c?.sodioObjetivoMgH != null
          ? `Objetivo ${numero(c.sodioObjetivoMgH, " mg/h")}`
          : durante.sodioMg != null
            ? `${numero(durante.sodioMg, " mg")} en total`
            : "Ningún alimento trae sodio",
      estado: p.resumen.sodio,
    },
    {
      titulo: "Energía",
      valor: numero(durante.porHora.calorias, " kcal/h"),
      detalle: `${numero(durante.macros.calorias, " kcal")} en total`,
      estado: null,
    },
    {
      // «Ingestas en carrera» no entra en la tarjeta y se cortaba en sílabas;
      // la sección ya dice «Durante la carrera».
      titulo: "Ingestas",
      valor: String(durante.cantidad),
      detalle:
        p.resumen.intervaloMaximoMin != null
          ? `Mayor tramo sin ingerir: ${textoDuracion(p.resumen.intervaloMaximoMin)}`
          : "—",
      estado: null,
    },
    {
      titulo: "Cafeína",
      valor:
        cafeina.mgPorKg != null
          ? numero(cafeina.mgPorKg, " mg/kg")
          : numero(cafeina.totalMg, " mg"),
      detalle:
        cafeina.totalMg == null
          ? "Ningún alimento trae cafeína"
          : [
              cafeina.mgPorKg != null &&
                `${numero(cafeina.totalMg, " mg")} para ${numero(p.pesoReferenciaKg, " kg")}`,
              cafeina.porHoraMg != null &&
                `${cafeina.porHoraMg} mg/h en carrera`,
            ]
              .filter(Boolean)
              .join(" · "),
      estado: cafeinaAlta ? "ENCIMA" : null,
      textoEstado: cafeinaAlta
        ? `por encima de ${CAFEINA_MG_KG_HABITUAL.maximo} mg/kg`
        : undefined,
    },
  ];

  const duracion = c?.duracionEstimadaMin ?? null;
  const nota = [
    duracion != null && duracion > 0
      ? `Por hora = lo que se toma entre la largada y la llegada, dividido por la duración estimada (${textoDuracion(duracion)}).`
      : "Sin duración estimada no hay valores por hora.",
    antes.cantidad > 0 &&
      `Antes de largar: ${antes.cantidad} ${antes.cantidad === 1 ? "ingesta" : "ingestas"} · ${numero(antes.macros.carbohidratosG, " g")} de carbohidratos${antes.liquidosMl != null ? ` · ${numero(antes.liquidosMl, " ml")}` : ""}${antes.sodioMg != null ? ` · ${numero(antes.sodioMg, " mg")} de sodio` : ""}${cafeina.antesMg != null ? ` · ${numero(cafeina.antesMg, " mg")} de cafeína` : ""}. No cuentan para los valores por hora (la cafeína sí suma al total).`,
  ]
    .filter(Boolean)
    .join(" ");

  const textos = c
    ? [
        { titulo: "Estrategia previa", texto: c.estrategiaPrevia },
        { titulo: "Puestos de abastecimiento", texto: c.puestosAbastecimiento },
        { titulo: "Recuperación", texto: c.recuperacion },
      ].filter((t): t is { titulo: string; texto: string } => Boolean(t.texto))
    : [];

  return (
    <Document title={p.nombre} author={nombreProfesional}>
      <Page size="A4" style={estilos.pagina}>
        {/* Membrete */}
        <View style={[estilos.membrete, { borderBottomColor: color }]} fixed>
          <View>
            <Text style={[estilos.profesional, { color }]}>
              {nombreProfesional}
            </Text>
            {subtitulo && (
              <Text style={estilos.subtituloMembrete}>{subtitulo}</Text>
            )}
            {matricula && (
              <Text style={estilos.subtituloMembrete}>Mat. {matricula}</Text>
            )}
          </View>
          <Text style={estilos.fecha}>{formatearFecha(new Date())}</Text>
        </View>

        {/* Título */}
        <Text style={estilos.titulo}>{p.nombre}</Text>
        {nombrePaciente && (
          <Text style={estilos.paciente}>Paciente: {nombrePaciente}</Text>
        )}
        {competencia && (
          <Text style={[estilos.competencia, { borderColor: color }]}>
            <Text style={estilos.competenciaNombre}>{competencia.nombre}</Text>
            {` · ${formatearFecha(competencia.fecha)}`}
            {competencia.lugar ? ` · ${competencia.lugar}` : ""}
          </Text>
        )}
        {p.descripcion && (
          <Text style={estilos.descripcion}>{p.descripcion}</Text>
        )}

        {/* La carrera */}
        {datosCarrera.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>La carrera</Text>
            <View style={estilos.datos}>
              {datosCarrera.map((dato) => (
                <View key={dato.etiqueta} style={estilos.dato}>
                  <Text style={estilos.datoValor}>{dato.valor}</Text>
                  <Text style={estilos.datoEtiqueta}>{dato.etiqueta}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Los números por hora */}
        <View style={estilos.seccion} wrap={false}>
          <Text style={[estilos.seccionTitulo, { color }]}>
            Durante la carrera
          </Text>
          <View style={estilos.indicadores}>
            {indicadores.map((indicador) => {
              const tono =
                indicador.estado === "CUMPLE"
                  ? VERDE
                  : indicador.estado
                    ? AMBAR
                    : null;
              const leyenda = indicador.estado
                ? (indicador.textoEstado ?? TEXTO_ESTADO[indicador.estado])
                : null;
              return (
                <View
                  key={indicador.titulo}
                  style={[
                    estilos.indicador,
                    { borderColor: tono ?? BORDE },
                    tono ? {} : { backgroundColor: FONDO_SUAVE },
                  ]}
                >
                  <Text style={estilos.indicadorTitulo}>
                    {indicador.titulo}
                  </Text>
                  <Text
                    style={[
                      estilos.indicadorValor,
                      tono ? { color: tono } : {},
                    ]}
                  >
                    {indicador.valor}
                  </Text>
                  <Text style={estilos.indicadorDetalle}>
                    {indicador.detalle}
                    {leyenda ? ` · ${leyenda}` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
          {cafeinaAlta && (
            <Text style={estilos.aviso}>
              La cafeína supera el rango habitual de las guías (
              {CAFEINA_MG_KG_HABITUAL.minimo} a {CAFEINA_MG_KG_HABITUAL.maximo}{" "}
              mg/kg).
            </Text>
          )}
          {tramoLargo && (
            <Text style={estilos.aviso}>
              Hay un tramo de {textoDuracion(p.resumen.intervaloMaximoMin)} sin
              ninguna ingesta.
            </Text>
          )}
          <Text style={estilos.nota}>{nota}</Text>
        </View>

        {/* La línea de tiempo, como tabla para imprimir y llevar */}
        <View style={estilos.seccion}>
          <Text style={[estilos.seccionTitulo, { color }]}>
            Plan de ingestas
          </Text>
          {p.ingestas.length === 0 ? (
            <Text style={estilos.nota}>Todavía no hay ingestas cargadas.</Text>
          ) : (
            <View style={estilos.tabla}>
              <View style={estilos.filaCabecera} fixed>
                <Text style={[estilos.celdaCabecera, estilos.colMomento]}>
                  Cuándo
                </Text>
                <Text style={[estilos.celdaCabecera, estilos.colHora]}>
                  Hora
                </Text>
                <Text style={[estilos.celdaCabecera, estilos.colKm]}>Km</Text>
                <Text style={[estilos.celdaCabecera, estilos.colTomar]}>
                  Qué tomar
                </Text>
                <Text style={[estilos.celdaCabecera, estilos.colAporta]}>
                  Aporta
                </Text>
              </View>
              {p.ingestas.map((ingesta) => (
                <View
                  key={ingesta.id}
                  style={[
                    estilos.fila,
                    ingesta.minuto < 0 ? estilos.filaAntes : {},
                  ]}
                  wrap={false}
                >
                  <Text
                    style={[estilos.celda, estilos.momento, estilos.colMomento]}
                  >
                    {momento(ingesta)}
                  </Text>
                  <Text style={[estilos.celda, estilos.colHora]}>
                    {ingesta.hora ?? ""}
                  </Text>
                  <Text style={[estilos.celda, estilos.colKm]}>
                    {km(ingesta)}
                  </Text>
                  <View style={[estilos.celda, estilos.colTomar]}>
                    {ingesta.alimentos.map((a) => (
                      <Text key={a.id}>
                        {a.nombre}
                        {a.cantidadTexto ? ` — ${a.cantidadTexto}` : ""}
                      </Text>
                    ))}
                    {ingesta.notas && (
                      <Text style={estilos.notaIngesta}>{ingesta.notas}</Text>
                    )}
                  </View>
                  <Text
                    style={[estilos.celda, estilos.aporte, estilos.colAporta]}
                  >
                    {aporte(ingesta)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Antes y después */}
        {textos.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>
              Antes y después
            </Text>
            {textos.map((t) => (
              <View key={t.titulo} style={estilos.texto} wrap={false}>
                <Text style={estilos.textoTitulo}>{t.titulo}</Text>
                <Text style={estilos.textoCuerpo}>{t.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pie de página */}
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
