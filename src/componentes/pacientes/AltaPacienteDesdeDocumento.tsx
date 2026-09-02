"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Loader2, RotateCcw } from "lucide-react";
import type { FichaPacienteSugeridaDto } from "@/aplicacion/dtos/paciente.dto";
import { LARGO_MINIMO_PASSWORD } from "@/aplicacion/dtos/password";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";
import { SubidorArchivo } from "@/componentes/comunes/SubidorArchivo";
import { crearEsquemaPaciente } from "./FormularioPaciente";

const SIN_SEXO = "SIN_DATO";

const ETIQUETAS_SEXO: Record<(typeof SEXOS_BIOLOGICOS)[number], string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

const CAMPOS_HISTORIA = [
  { clave: "motivoConsulta", etiqueta: "Motivo de consulta" },
  { clave: "diagnosticos", etiqueta: "Diagnósticos" },
  { clave: "medicacion", etiqueta: "Medicación" },
  { clave: "antecedentesPersonales", etiqueta: "Antecedentes personales" },
  { clave: "antecedentesFamiliares", etiqueta: "Antecedentes familiares" },
  { clave: "habitos", etiqueta: "Hábitos" },
  { clave: "contexto", etiqueta: "Contexto" },
] as const;

/**
 * Alta de un paciente a partir de su ficha en papel (PDF, Word o foto).
 *
 * El documento se sube, la IA lo lee y el formulario queda PRECARGADO: nada se
 * guarda hasta que el profesional revisa y aprieta el botón. Es deliberado y no
 * un paso de más —el email y la contraseña de acceso casi nunca están en una
 * ficha escrita, así que un alta automática tendría que inventarlos—, y además
 * lo que sale de un modelo entra a la historia clínica de una persona real.
 *
 * Lo que el documento traiga además del paciente (historia clínica, alertas
 * alimentarias, medición inicial y laboratorios) se muestra para revisar y se
 * puede descartar por separado antes de guardar.
 */
export function AltaPacienteDesdeDocumento({
  onTerminado,
}: {
  onTerminado: () => void;
}) {
  const { interpretarFicha, crearDesdeFicha } = usePacientes();

  const [archivoId, setArchivoId] = useState<string | null>(null);
  const [ficha, setFicha] = useState<FichaPacienteSugeridaDto | null>(null);
  const [conservarHistoria, setConservarHistoria] = useState(true);
  const [conservarMedicion, setConservarMedicion] = useState(true);
  const [alertasDescartadas, setAlertasDescartadas] = useState<Set<number>>(
    new Set(),
  );
  const [labsDescartados, setLabsDescartados] = useState<Set<number>>(
    new Set(),
  );

  const esquema = crearEsquemaPaciente(false);
  type DatosFormulario = z.infer<typeof esquema>;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      fechaNacimiento: "",
      sexo: SIN_SEXO,
      notas: "",
      password: "",
    },
  });

  function alSubirDocumento(archivo: { id: string }) {
    setArchivoId(archivo.id);
    interpretarFicha.mutate(
      { archivoId: archivo.id },
      {
        onSuccess: (leida) => {
          setFicha(leida);
          form.reset({
            nombre: leida.paciente.nombre ?? "",
            apellido: leida.paciente.apellido ?? "",
            email: leida.paciente.email ?? "",
            telefono: leida.paciente.telefono ?? "",
            fechaNacimiento: leida.paciente.fechaNacimiento ?? "",
            sexo: leida.paciente.sexo ?? SIN_SEXO,
            notas: leida.paciente.notas ?? "",
            password: "",
          });
          setConservarHistoria(true);
          setConservarMedicion(true);
          setAlertasDescartadas(new Set());
          setLabsDescartados(new Set());
        },
      },
    );
  }

  function alEnviar(datos: DatosFormulario) {
    if (!ficha) return;

    const historia = conservarHistoria
      ? {
          ...ficha.historiaClinica,
          camposPersonalizados: ficha.camposPersonalizados,
        }
      : null;

    crearDesdeFicha.mutate(
      {
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        password: datos.password ?? "",
        telefono: datos.telefono?.trim() ? datos.telefono : null,
        fechaNacimiento: datos.fechaNacimiento
          ? new Date(datos.fechaNacimiento)
          : null,
        sexo: datos.sexo === SIN_SEXO ? null : datos.sexo,
        notas: datos.notas?.trim() ? datos.notas : null,
        historiaClinica: historia,
        alertas: ficha.alertas.filter(
          (_, indice) => !alertasDescartadas.has(indice),
        ),
        antropometria: conservarMedicion ? ficha.antropometria : null,
        laboratorios: ficha.laboratorios.filter(
          (_, indice) => !labsDescartados.has(indice),
        ),
        archivoId,
      },
      { onSuccess: onTerminado },
    );
  }

  // --- Paso 1: subir el documento --------------------------------------------
  if (!ficha) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Subí la ficha del paciente: un PDF, un Word (.docx) o una foto (JPG,
          PNG, WEBP). La IA la lee y precarga el formulario de alta con todo lo
          que encuentre; nada se guarda hasta que lo revises. El .doc anterior a
          2007 no se puede leer: guardalo como .docx o PDF.
        </p>
        <SubidorArchivo
          contexto="paciente"
          accept="image/jpeg,image/png,image/webp,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          sinVistaPrevia
          onSubido={alSubirDocumento}
        />
        {interpretarFicha.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Leyendo el documento…
          </p>
        )}
      </div>
    );
  }

  const historiaConDatos = CAMPOS_HISTORIA.filter(
    (campo) => ficha.historiaClinica[campo.clave],
  );

  // --- Paso 2: revisar y confirmar --------------------------------------------
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            Documento leído. Revisá los datos antes de guardar.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFicha(null);
              setArchivoId(null);
            }}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Otro documento
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              {!ficha.paciente.email && (
                <p className="text-xs text-muted-foreground">
                  El documento no traía email. Es obligatorio: con él inicia
                  sesión el paciente.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña de acceso del paciente</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fechaNacimiento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de nacimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="sexo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sexo biológico</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SIN_SEXO}>Sin especificar</SelectItem>
                  {SEXOS_BIOLOGICOS.map((sexo) => (
                    <SelectItem key={sexo} value={sexo}>
                      {ETIQUETAS_SEXO[sexo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Lo demás que trajo el documento, para revisar o descartar. */}
        {historiaConDatos.length > 0 && (
          <SeccionRevisable
            titulo="Historia clínica"
            resumen={`${historiaConDatos.length} campo(s) + ${ficha.camposPersonalizados.length} personalizado(s)`}
            conservar={conservarHistoria}
            onCambiar={setConservarHistoria}
          >
            <ul className="space-y-1">
              {historiaConDatos.map((campo) => (
                <li key={campo.clave}>
                  <span className="font-medium">{campo.etiqueta}:</span>{" "}
                  {ficha.historiaClinica[campo.clave]}
                </li>
              ))}
              {ficha.camposPersonalizados.map((campo) => (
                <li key={campo.clave}>
                  <span className="font-medium">{campo.etiqueta}:</span>{" "}
                  {campo.valor}
                </li>
              ))}
            </ul>
          </SeccionRevisable>
        )}

        {ficha.alertas.length > 0 && (
          <ListaRevisable
            titulo="Alertas alimentarias"
            elementos={ficha.alertas.map(
              (alerta) =>
                `${alerta.tipo} · ${alerta.descripcion} (${alerta.severidad})`,
            )}
            descartados={alertasDescartadas}
            onCambiar={setAlertasDescartadas}
          />
        )}

        {ficha.antropometria && (
          <SeccionRevisable
            titulo="Medición inicial"
            resumen={`${ficha.antropometria.pesoKg} kg${
              ficha.antropometria.tallaCm
                ? ` · ${ficha.antropometria.tallaCm} cm`
                : ""
            }`}
            conservar={conservarMedicion}
            onCambiar={setConservarMedicion}
          >
            <p>
              {ficha.antropometria.fecha
                ? `Fecha: ${ficha.antropometria.fecha}`
                : "Sin fecha en el documento: se registra con la fecha de hoy."}
            </p>
          </SeccionRevisable>
        )}

        {ficha.laboratorios.length > 0 && (
          <ListaRevisable
            titulo="Laboratorios"
            elementos={ficha.laboratorios.map(
              (laboratorio) =>
                `${laboratorio.titulo}${laboratorio.fecha ? ` · ${laboratorio.fecha}` : ""}`,
            )}
            descartados={labsDescartados}
            onCambiar={setLabsDescartados}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={crearDesdeFicha.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={crearDesdeFicha.isPending}>
            {crearDesdeFicha.isPending ? "Guardando…" : "Crear paciente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

/** Bloque de un solo dato compuesto que se conserva o se descarta entero. */
function SeccionRevisable({
  titulo,
  resumen,
  conservar,
  onCambiar,
  children,
}: {
  titulo: string;
  resumen: string;
  conservar: boolean;
  onCambiar: (valor: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={conservar}
          onChange={(evento) => onCambiar(evento.target.checked)}
        />
        <span>
          <span className="text-sm font-medium">{titulo}</span>
          <span className="ml-2 text-xs text-muted-foreground">{resumen}</span>
        </span>
      </label>
      <div className="pl-6 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

/** Lista donde cada elemento se conserva o se descarta por separado. */
function ListaRevisable({
  titulo,
  elementos,
  descartados,
  onCambiar,
}: {
  titulo: string;
  elementos: string[];
  descartados: Set<number>;
  onCambiar: (valor: Set<number>) => void;
}) {
  function alternar(indice: number) {
    const copia = new Set(descartados);
    if (copia.has(indice)) {
      copia.delete(indice);
    } else {
      copia.add(indice);
    }
    onCambiar(copia);
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">{titulo}</p>
      <ul className="space-y-1">
        {elementos.map((elemento, indice) => (
          <li key={elemento}>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={!descartados.has(indice)}
                onChange={() => alternar(indice)}
              />
              <span>{elemento}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
