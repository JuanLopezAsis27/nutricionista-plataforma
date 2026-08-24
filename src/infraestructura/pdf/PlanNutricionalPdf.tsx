import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";

/**
 * Documento PDF del plan nutricional. La APARIENCIA (color, membrete, pie y qué
 * secciones se muestran) sale de la configuración del profesional; las recetas
 * referenciadas por el plan se imprimen completas al final. Vive en
 * infraestructura: es un adaptador de salida (representación imprimible).
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

const estilos = StyleSheet.create({
  pagina: { padding: 48, paddingBottom: 64, fontSize: 10, color: GRIS_TEXTO, fontFamily: "Helvetica" },
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

  tituloPlan: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  paciente: { fontSize: 11, color: GRIS_SUAVE, marginBottom: 4 },
  descripcion: { fontSize: 10, color: GRIS_SUAVE, marginBottom: 10 },

  metas: { flexDirection: "row", gap: 8, marginBottom: 16 },
  meta: {
    backgroundColor: FONDO_SUAVE,
    borderWidth: 1,
    borderColor: BORDE,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  metaValor: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  metaEtiqueta: { fontSize: 7, color: GRIS_SUAVE, textTransform: "uppercase" },

  franja: { marginBottom: 12 },
  franjaCabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  franjaNombre: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  franjaHora: { fontSize: 9, color: "#ffffff" },
  opcion: { marginBottom: 5, paddingHorizontal: 4 },
  opcionNumero: { fontFamily: "Helvetica-Bold" },
  opcionTexto: { fontSize: 10, lineHeight: 1.4 },
  opcionReceta: { fontSize: 8, color: GRIS_SUAVE, marginTop: 1 },

  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingBottom: 3,
    marginBottom: 6,
  },
  item: { flexDirection: "row", marginBottom: 3 },
  vineta: { width: 12, fontSize: 10 },
  itemTexto: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  equivalenciaTitulo: { fontFamily: "Helvetica-Bold" },

  receta: { marginBottom: 12 },
  recetaNombre: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  recetaMeta: { fontSize: 8, color: GRIS_SUAVE, marginBottom: 3 },
  recetaSubtitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 3, marginBottom: 1 },
  recetaTexto: { fontSize: 9, lineHeight: 1.4 },

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
  plan: PlanSalidaDto;
  nombrePaciente?: string | null;
  /** Recetas referenciadas por el plan, para imprimirlas completas. */
  recetas?: RecetaSalidaDto[];
  /** Configuración del profesional (membrete y apariencia del PDF). */
  config?: ConfiguracionSalidaDto | null;
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

function macro(valor: number | null | undefined, sufijo: string): string | null {
  return valor != null ? `${valor}${sufijo}` : null;
}

/** Renderiza el plan a un buffer PDF (la única API que consume la presentación). */
export async function renderizarPlanPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<PlanNutricionalPdf {...props} />);
}

function PlanNutricionalPdf({ plan, nombrePaciente, recetas = [], config }: Props) {
  const color = config?.pdfColorPrimario || CORAL;
  const nombreProfesional = config?.nombreProfesional?.trim() || "Consultorio de Nutrición";
  const subtitulo = config?.pdfSubtitulo?.trim() || null;
  const matricula = config?.matricula?.trim() || null;
  const pieTexto = config?.pdfPieTexto?.trim() || null;
  const mostrarMacros = config?.pdfMostrarMacros ?? true;
  const mostrarEquivalencias = config?.pdfMostrarEquivalencias ?? true;
  const mostrarRecomendaciones = config?.pdfMostrarRecomendaciones ?? true;
  const mostrarRecetas = (config?.pdfMostrarRecetas ?? true) && recetas.length > 0;

  const metas = [
    plan.caloriasMeta != null && { valor: `${plan.caloriasMeta} kcal`, etiqueta: "Calorías" },
    plan.proteinasMetaG != null && { valor: `${plan.proteinasMetaG} g`, etiqueta: "Proteínas" },
    plan.carbohidratosMetaG != null && {
      valor: `${plan.carbohidratosMetaG} g`,
      etiqueta: "Carbohidratos",
    },
    plan.grasasMetaG != null && { valor: `${plan.grasasMetaG} g`, etiqueta: "Grasas" },
  ].filter((meta): meta is { valor: string; etiqueta: string } => Boolean(meta));

  const nutricionales = plan.recomendaciones.filter((r) => r.tipo === "NUTRICIONAL");
  const salud = plan.recomendaciones.filter((r) => r.tipo === "SALUD");

  return (
    <Document title={plan.nombre} author={nombreProfesional}>
      <Page size="A4" style={estilos.pagina}>
        {/* Membrete */}
        <View style={[estilos.membrete, { borderBottomColor: color }]} fixed>
          <View>
            <Text style={[estilos.profesional, { color }]}>{nombreProfesional}</Text>
            {subtitulo && <Text style={estilos.subtituloMembrete}>{subtitulo}</Text>}
            {matricula && <Text style={estilos.subtituloMembrete}>Mat. {matricula}</Text>}
          </View>
          <Text style={estilos.fecha}>{formatearFecha(new Date())}</Text>
        </View>

        {/* Título */}
        <Text style={estilos.tituloPlan}>{plan.nombre}</Text>
        {nombrePaciente && <Text style={estilos.paciente}>Paciente: {nombrePaciente}</Text>}
        {plan.descripcion && <Text style={estilos.descripcion}>{plan.descripcion}</Text>}

        {/* Metas de macros */}
        {mostrarMacros && metas.length > 0 && (
          <View style={estilos.metas}>
            {metas.map((meta) => (
              <View key={meta.etiqueta} style={estilos.meta}>
                <Text style={estilos.metaValor}>{meta.valor}</Text>
                <Text style={estilos.metaEtiqueta}>{meta.etiqueta}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Franjas con opciones */}
        {plan.comidas.map((comida) => (
          <View key={comida.id} style={estilos.franja} wrap={false}>
            <View style={[estilos.franjaCabecera, { backgroundColor: color }]}>
              <Text style={estilos.franjaNombre}>{comida.nombre}</Text>
              {(comida.horaDesde || comida.horaHasta) && (
                <Text style={estilos.franjaHora}>
                  {[comida.horaDesde, comida.horaHasta].filter(Boolean).join(" a ")} hs
                </Text>
              )}
            </View>
            {comida.opciones.map((opcion) => (
              <View key={opcion.id} style={estilos.opcion}>
                <Text style={estilos.opcionTexto}>
                  {comida.opciones.length > 1 && (
                    <Text style={[estilos.opcionNumero, { color }]}>Opción {opcion.numero} · </Text>
                  )}
                  {opcion.contenido}
                </Text>
                {opcion.recetaNombre && (
                  <Text style={estilos.opcionReceta}>Receta: {opcion.recetaNombre}</Text>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Equivalencias */}
        {mostrarEquivalencias && plan.equivalencias.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>Equivalencias</Text>
            {plan.equivalencias.map((equivalencia) => (
              <View key={equivalencia.id} style={estilos.item}>
                <Text style={[estilos.vineta, { color }]}>•</Text>
                <Text style={estilos.itemTexto}>
                  <Text style={estilos.equivalenciaTitulo}>{equivalencia.titulo}: </Text>
                  {equivalencia.detalle}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recomendaciones */}
        {mostrarRecomendaciones && nutricionales.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>Recomendaciones nutricionales</Text>
            {nutricionales.map((recomendacion) => (
              <View key={recomendacion.id} style={estilos.item}>
                <Text style={[estilos.vineta, { color }]}>•</Text>
                <Text style={estilos.itemTexto}>{recomendacion.texto}</Text>
              </View>
            ))}
          </View>
        )}
        {mostrarRecomendaciones && salud.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>Recomendaciones de salud</Text>
            {salud.map((recomendacion) => (
              <View key={recomendacion.id} style={estilos.item}>
                <Text style={[estilos.vineta, { color }]}>•</Text>
                <Text style={estilos.itemTexto}>{recomendacion.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Contactos útiles */}
        {plan.contactosUtiles && (
          <View style={estilos.seccion}>
            <Text style={[estilos.seccionTitulo, { color }]}>Contactos útiles</Text>
            <Text style={estilos.itemTexto}>{plan.contactosUtiles}</Text>
          </View>
        )}

        {/* Recetario: recetas del plan, completas */}
        {mostrarRecetas && (
          <View style={estilos.seccion} break>
            <Text style={[estilos.seccionTitulo, { color }]}>Recetas del plan</Text>
            {recetas.map((receta) => (
              <View key={receta.id} style={estilos.receta} wrap={false}>
                <Text style={estilos.recetaNombre}>{receta.nombre}</Text>
                <Text style={estilos.recetaMeta}>
                  {[
                    receta.porciones != null ? `${receta.porciones} porción(es)` : null,
                    ...(mostrarMacros
                      ? [
                          macro(receta.calorias, " kcal"),
                          macro(receta.proteinasG, " g P"),
                          macro(receta.carbohidratosG, " g C"),
                          macro(receta.grasasG, " g G"),
                        ]
                      : []),
                  ]
                    .filter(Boolean)
                    .join(" · ") + (mostrarMacros ? " (por porción)" : "")}
                </Text>
                {receta.descripcion && (
                  <Text style={estilos.recetaTexto}>{receta.descripcion}</Text>
                )}
                {receta.ingredientes.length > 0 && (
                  <>
                    <Text style={estilos.recetaSubtitulo}>Ingredientes</Text>
                    {receta.ingredientes.map((ing, i) => (
                      <Text key={i} style={estilos.recetaTexto}>
                        • {ing.nombre}
                        {ing.cantidadGramos != null ? ` — ${ing.cantidadGramos} g` : ""}
                      </Text>
                    ))}
                  </>
                )}
                {receta.preparacion && (
                  <>
                    <Text style={estilos.recetaSubtitulo}>Preparación</Text>
                    <Text style={estilos.recetaTexto}>{receta.preparacion}</Text>
                  </>
                )}
                {receta.enlaces.length > 0 && (
                  <>
                    <Text style={estilos.recetaSubtitulo}>Enlaces</Text>
                    {receta.enlaces.map((enlace, i) => (
                      <Text key={i} style={estilos.recetaTexto}>
                        • {enlace}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Pie de página */}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>{pieTexto || nombreProfesional}</Text>
          <Text
            style={estilos.pieTexto}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
