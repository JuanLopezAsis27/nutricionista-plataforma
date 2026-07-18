import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";

/**
 * Documento PDF del plan nutricional, con el membrete del profesional.
 * Vive en infraestructura: es un adaptador de salida (representación
 * imprimible), igual que un repositorio lo es hacia la base.
 */

const CORAL = "#F4535E";
const GRIS_TEXTO = "#3f3f46";
const GRIS_SUAVE = "#71717a";
const FONDO_SUAVE = "#fafafa";
const BORDE = "#e4e4e7";

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
    borderBottomColor: CORAL,
    paddingBottom: 10,
    marginBottom: 18,
  },
  profesional: { fontSize: 14, fontFamily: "Helvetica-Bold", color: CORAL },
  subtituloMembrete: { fontSize: 9, color: GRIS_SUAVE, marginTop: 2 },
  fecha: { fontSize: 9, color: GRIS_SUAVE },

  tituloPlan: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  paciente: { fontSize: 11, color: GRIS_SUAVE, marginBottom: 4 },
  descripcion: { fontSize: 10, color: GRIS_SUAVE, marginBottom: 10 },

  metas: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
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
    backgroundColor: CORAL,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  franjaNombre: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  franjaHora: { fontSize: 9, color: "#ffffff" },
  opcion: { marginBottom: 5, paddingHorizontal: 4 },
  opcionNumero: { fontFamily: "Helvetica-Bold", color: CORAL },
  opcionTexto: { fontSize: 10, lineHeight: 1.4 },
  opcionReceta: { fontSize: 8, color: GRIS_SUAVE, marginTop: 1 },

  seccion: { marginTop: 14 },
  seccionTitulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: CORAL,
    borderBottomWidth: 1,
    borderBottomColor: BORDE,
    paddingBottom: 3,
    marginBottom: 6,
  },
  item: { flexDirection: "row", marginBottom: 3 },
  vineta: { width: 12, color: CORAL, fontSize: 10 },
  itemTexto: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  equivalenciaTitulo: { fontFamily: "Helvetica-Bold" },

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
  },
  pieTexto: { fontSize: 8, color: GRIS_SUAVE },
});

const NOMBRE_PROFESIONAL = "Lic. López Asis Nicolás";
const SUBTITULO_PROFESIONAL = "Nutrición deportiva y clínica";

interface Props {
  plan: PlanSalidaDto;
  nombrePaciente?: string | null;
}

function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

/** Renderiza el plan a un buffer PDF (la única API que consume la presentación). */
export async function renderizarPlanPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<PlanNutricionalPdf {...props} />);
}

function PlanNutricionalPdf({ plan, nombrePaciente }: Props) {
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
    <Document title={plan.nombre} author={NOMBRE_PROFESIONAL}>
      <Page size="A4" style={estilos.pagina}>
        {/* Membrete */}
        <View style={estilos.membrete} fixed>
          <View>
            <Text style={estilos.profesional}>{NOMBRE_PROFESIONAL}</Text>
            <Text style={estilos.subtituloMembrete}>{SUBTITULO_PROFESIONAL}</Text>
          </View>
          <Text style={estilos.fecha}>{formatearFecha(new Date())}</Text>
        </View>

        {/* Título */}
        <Text style={estilos.tituloPlan}>{plan.nombre}</Text>
        {nombrePaciente && <Text style={estilos.paciente}>Paciente: {nombrePaciente}</Text>}
        {plan.descripcion && <Text style={estilos.descripcion}>{plan.descripcion}</Text>}

        {/* Metas de macros */}
        {metas.length > 0 && (
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
            <View style={estilos.franjaCabecera}>
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
                    <Text style={estilos.opcionNumero}>Opción {opcion.numero} · </Text>
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
        {plan.equivalencias.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Equivalencias</Text>
            {plan.equivalencias.map((equivalencia) => (
              <View key={equivalencia.id} style={estilos.item}>
                <Text style={estilos.vineta}>•</Text>
                <Text style={estilos.itemTexto}>
                  <Text style={estilos.equivalenciaTitulo}>{equivalencia.titulo}: </Text>
                  {equivalencia.detalle}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Recomendaciones */}
        {nutricionales.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Recomendaciones nutricionales</Text>
            {nutricionales.map((recomendacion) => (
              <View key={recomendacion.id} style={estilos.item}>
                <Text style={estilos.vineta}>•</Text>
                <Text style={estilos.itemTexto}>{recomendacion.texto}</Text>
              </View>
            ))}
          </View>
        )}
        {salud.length > 0 && (
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Recomendaciones de salud</Text>
            {salud.map((recomendacion) => (
              <View key={recomendacion.id} style={estilos.item}>
                <Text style={estilos.vineta}>•</Text>
                <Text style={estilos.itemTexto}>{recomendacion.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Contactos útiles */}
        {plan.contactosUtiles && (
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Contactos útiles</Text>
            <Text style={estilos.itemTexto}>{plan.contactosUtiles}</Text>
          </View>
        )}

        {/* Pie de página */}
        <View style={estilos.pie} fixed>
          <Text style={estilos.pieTexto}>{NOMBRE_PROFESIONAL}</Text>
          <Text
            style={estilos.pieTexto}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
