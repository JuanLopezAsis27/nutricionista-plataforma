"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { CampoPersonalizadoHistoriaDto } from "@/aplicacion/dtos/evaluacion.dto";
import { useEvaluacion } from "@/lib/hooks/useEvaluacion";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Label } from "@/componentes/ui/label";
import { Skeleton } from "@/componentes/ui/skeleton";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { formatearFecha } from "@/lib/formato";

const CAMPOS = [
  { nombre: "motivoConsulta", etiqueta: "Motivo de consulta" },
  { nombre: "diagnosticos", etiqueta: "Diagnósticos" },
  { nombre: "medicacion", etiqueta: "Medicación" },
  { nombre: "antecedentesPersonales", etiqueta: "Antecedentes personales" },
  { nombre: "antecedentesFamiliares", etiqueta: "Antecedentes familiares" },
  { nombre: "habitos", etiqueta: "Hábitos (actividad, sueño, consumo)" },
  { nombre: "contexto", etiqueta: "Contexto (trabajo, horarios, entorno)" },
] as const;

type NombreCampo = (typeof CAMPOS)[number]["nombre"];
type DatosFormulario = Record<NombreCampo, string>;

/** Prefijo de la clave de un campo suelto, cargado solo en este paciente. */
const PREFIJO_SUELTO = "suelto-";

/**
 * Formulario de historia clínica del paciente.
 *
 * Además de los siete campos fijos muestra los personalizados, que son de dos
 * clases y conviven a propósito:
 *
 * - Los **del consultorio** (Configuración → Historia clínica) aparecen en
 *   todos los pacientes y son los que se pueden comparar entre fichas.
 * - Los **sueltos** se agregan acá, valen solo para este paciente y sirven
 *   para lo que aparece una vez y no justifica sumarlo a los 300 restantes.
 *
 * Los dos se guardan igual —clave, etiqueta y valor— así que un campo del
 * consultorio que después se borre sigue mostrándose con su nombre.
 */
export function FormularioHistoriaClinica({
  pacienteId,
}: {
  pacienteId: string;
}) {
  const {
    obtenerHistoria,
    guardarHistoria,
    interpretarHistoriaDesdeArchivo,
    obtenerCamposHistoria,
  } = useEvaluacion();
  const historia = obtenerHistoria({ pacienteId });
  const definidos = obtenerCamposHistoria();

  const form = useForm<DatosFormulario>({
    defaultValues: Object.fromEntries(
      CAMPOS.map((c) => [c.nombre, ""]),
    ) as DatosFormulario,
  });

  /**
   * Los campos personalizados NO se copian a estado al llegar la query: se
   * derivan de ella en cada render y el estado guarda solo lo que el
   * profesional tocó (`ediciones`, `agregados`, `quitados`).
   *
   * Es la regla de las copias congeladas: un `setValores(...)` dentro de un
   * effect deja la pantalla mostrando lo que había cuando se montó, y este
   * componente muestra datos que él mismo modifica. Las claves son dinámicas
   * —dependen de lo que el consultorio defina—, así que tampoco pueden vivir
   * en react-hook-form como los siete fijos.
   */
  const [ediciones, setEdiciones] = useState<Record<string, string>>({});
  const [agregados, setAgregados] = useState<
    { clave: string; etiqueta: string }[]
  >([]);
  const [quitados, setQuitados] = useState<Set<string>>(new Set());
  const [etiquetaNueva, setEtiquetaNueva] = useState("");

  // Los siete campos fijos sí van por react-hook-form, que necesita el reset.
  useEffect(() => {
    if (!historia.data) return;
    form.reset(
      Object.fromEntries(
        CAMPOS.map((c) => [c.nombre, historia.data?.[c.nombre] ?? ""]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al llegar datos
  }, [historia.data]);

  const guardados = historia.data?.camposPersonalizados ?? [];
  const valorGuardado = new Map(
    guardados.map((campo) => [campo.clave, campo.valor]),
  );
  const valorDe = (clave: string) =>
    ediciones[clave] ?? valorGuardado.get(clave) ?? "";

  // Un campo guardado que ya no está definido por el consultorio se sigue
  // mostrando: es información clínica escrita, y no puede desaparecer de la
  // ficha porque alguien reordenó el formulario en Configuración.
  const clavesDefinidas = new Set(
    (definidos.data ?? []).map((campo) => campo.clave),
  );
  const sueltos = [
    ...guardados
      .filter((campo) => !clavesDefinidas.has(campo.clave))
      .map((campo) => ({ clave: campo.clave, etiqueta: campo.etiqueta })),
    ...agregados,
  ].filter((campo) => !quitados.has(campo.clave));

  if (historia.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  // Sube el documento y precarga el formulario con lo que la IA pudo leer.
  // No guarda nada solo: el profesional revisa y aprieta "Guardar".
  function alSubirDocumento(archivo: { id: string }) {
    interpretarHistoriaDesdeArchivo.mutate(
      { pacienteId, archivoId: archivo.id },
      {
        onSuccess: (sugerido) => {
          let algunCampo = false;
          for (const campo of CAMPOS) {
            const valor = sugerido[campo.nombre];
            if (valor) {
              form.setValue(campo.nombre, valor);
              algunCampo = true;
            }
          }
          toast[algunCampo ? "success" : "info"](
            algunCampo
              ? "Campos sugeridos por IA. Revisalos antes de guardar."
              : "La IA no encontró datos para completar en el documento.",
          );
        },
      },
    );
  }

  function agregarSuelto() {
    const etiqueta = etiquetaNueva.trim();
    if (!etiqueta) return;
    setAgregados((previos) => [
      ...previos,
      {
        clave: `${PREFIJO_SUELTO}${crypto.randomUUID().slice(0, 8)}`,
        etiqueta,
      },
    ]);
    setEtiquetaNueva("");
  }

  function quitarSuelto(clave: string) {
    setAgregados((previos) => previos.filter((campo) => campo.clave !== clave));
    setQuitados((previos) => new Set(previos).add(clave));
    setEdiciones((previos) => {
      const copia = { ...previos };
      delete copia[clave];
      return copia;
    });
  }

  function alEnviar(datos: DatosFormulario) {
    const personalizados: CampoPersonalizadoHistoriaDto[] = [
      ...(definidos.data ?? []).map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.nombre,
        valor: valorDe(campo.clave).trim(),
      })),
      ...sueltos.map((campo) => ({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        valor: valorDe(campo.clave).trim(),
      })),
    ].filter((campo) => campo.valor.length > 0);

    guardarHistoria.mutate({
      pacienteId,
      ...Object.fromEntries(
        CAMPOS.map((c) => [c.nombre, datos[c.nombre].trim() || null]),
      ),
      camposPersonalizados: personalizados,
    });
  }

  const personalizados = [
    ...(definidos.data ?? []).map((campo) => ({
      clave: campo.clave,
      etiqueta: campo.nombre,
      ayuda: campo.descripcion,
      suelto: false,
    })),
    ...sueltos.map((campo) => ({
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      ayuda: null,
      suelto: true,
    })),
  ];

  return (
    <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Historia clínica</h3>
        {historia.data && (
          <span className="text-xs text-muted-foreground">
            Última actualización: {formatearFecha(historia.data.actualizadoEn)}
          </span>
        )}
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Subir documento</p>
        <p className="text-xs text-muted-foreground">
          Subí el documento de historia clínica: una foto (JPG, PNG, WEBP), un
          PDF o un Word (.docx). Queda guardado en la ficha del paciente y la IA
          sugiere los campos de abajo (no se guarda nada solo: revisá y apretá
          &quot;Guardar historia clínica&quot;). El .doc viejo, anterior a 2007,
          no se puede leer: guardalo como .docx o PDF.
        </p>
        <SubidorArchivo
          contexto="paciente"
          pacienteId={pacienteId}
          accept="image/jpeg,image/png,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          sinVistaPrevia
          onSubido={alSubirDocumento}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((campo) => (
          <div key={campo.nombre} className="space-y-2">
            <Label htmlFor={campo.nombre}>{campo.etiqueta}</Label>
            <Textarea
              id={campo.nombre}
              rows={3}
              {...form.register(campo.nombre)}
              placeholder="—"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Campos personalizados</p>
          <p className="text-xs text-muted-foreground">
            Los definidos en Configuración aparecen en todos tus pacientes. Los
            que agregues acá valen solo para esta ficha.
          </p>
        </div>

        {personalizados.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {personalizados.map((campo) => (
              <div key={campo.clave} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={campo.clave}>{campo.etiqueta}</Label>
                  {campo.suelto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => quitarSuelto(campo.clave)}
                      aria-label={`Quitar ${campo.etiqueta}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <Textarea
                  id={campo.clave}
                  rows={2}
                  placeholder="—"
                  value={valorDe(campo.clave)}
                  onChange={(evento) =>
                    setEdiciones((previos) => ({
                      ...previos,
                      [campo.clave]: evento.target.value,
                    }))
                  }
                />
                {campo.ayuda && (
                  <p className="text-xs text-muted-foreground">{campo.ayuda}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="campo-suelto-nuevo">
              Agregar un campo solo para este paciente
            </Label>
            <Input
              id="campo-suelto-nuevo"
              value={etiquetaNueva}
              maxLength={80}
              placeholder="Nombre del campo"
              onChange={(evento) => setEtiquetaNueva(evento.target.value)}
              onKeyDown={(evento) => {
                // Enter agrega el campo en vez de enviar la historia entera.
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  agregarSuelto();
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={agregarSuelto}
            disabled={!etiquetaNueva.trim()}
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={guardarHistoria.isPending}>
          {guardarHistoria.isPending
            ? "Guardando…"
            : "Guardar historia clínica"}
        </Button>
      </div>
    </form>
  );
}
