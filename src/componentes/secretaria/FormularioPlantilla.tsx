"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PlantillaSalidaDto } from "@/aplicacion/dtos/secretaria.dto";
import { PLACEHOLDERS_PLANTILLA } from "@/dominio/entidades/PlantillaEmail";
import { useSecretaria } from "@/lib/hooks/useSecretaria";
import {
  renderizarPlantillaCliente,
  renderizarHtmlCliente,
} from "@/lib/plantillaPreview";
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

export const esquema = z.object({
  clave: z
    .string()
    .regex(
      /^[A-Za-z][A-Za-z0-9_]*$/,
      "Identificador en MAYÚSCULAS, ej. SEGUIMIENTO",
    )
    .max(60),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  asunto: z.string().min(1, "El asunto es obligatorio").max(200),
  cuerpoHtml: z.string().min(1, "El cuerpo es obligatorio").max(20_000),
  descripcion: z.string().max(500),
});
type DatosFormulario = z.infer<typeof esquema>;

/** Formulario de creación/edición de plantilla con vista previa en vivo. */
export function FormularioPlantilla({
  plantillaInicial,
  onTerminado,
}: {
  plantillaInicial: PlantillaSalidaDto | null;
  onTerminado: () => void;
}) {
  const { crearPlantilla, actualizarPlantilla } = useSecretaria();
  const esEdicion = Boolean(plantillaInicial);
  const enviando = crearPlantilla.isPending || actualizarPlantilla.isPending;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      clave: plantillaInicial?.clave ?? "",
      nombre: plantillaInicial?.nombre ?? "",
      asunto: plantillaInicial?.asunto ?? "",
      cuerpoHtml: plantillaInicial?.cuerpoHtml ?? "",
      descripcion: plantillaInicial?.descripcion ?? "",
    },
  });

  const asunto = form.watch("asunto");
  const cuerpoHtml = form.watch("cuerpoHtml");

  function insertarPlaceholder(clave: string) {
    const actual = form.getValues("cuerpoHtml");
    form.setValue("cuerpoHtml", `${actual}{{${clave}}}`, { shouldDirty: true });
  }

  function alEnviar(datos: DatosFormulario) {
    const descripcion = datos.descripcion.trim() || null;
    if (plantillaInicial) {
      actualizarPlantilla.mutate(
        {
          id: plantillaInicial.id,
          nombre: datos.nombre,
          asunto: datos.asunto,
          cuerpoHtml: datos.cuerpoHtml,
          descripcion,
        },
        { onSuccess: onTerminado },
      );
    } else {
      crearPlantilla.mutate(
        {
          clave: datos.clave.toUpperCase(),
          nombre: datos.nombre,
          asunto: datos.asunto,
          cuerpoHtml: datos.cuerpoHtml,
          descripcion,
        },
        { onSuccess: onTerminado },
      );
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(alEnviar)}
        className="grid gap-6 md:grid-cols-2"
      >
        {/* Columna de edición */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="clave"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clave</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={esEdicion}
                      className="font-mono uppercase"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Recordatorio de turno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="asunto"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asunto</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Recordatorio de tu turno del {{fecha}}"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cuerpoHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuerpo (HTML)</FormLabel>
                <FormControl>
                  <Textarea rows={9} className="font-mono text-xs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Insertar variable:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS_PLANTILLA.map((p) => (
                <Button
                  key={p.clave}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 font-mono text-xs"
                  title={p.descripcion}
                  onClick={() => insertarPlaceholder(p.clave)}
                >
                  {`{{${p.clave}}}`}
                </Button>
              ))}
            </div>
          </div>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Cuándo se usa esta plantilla"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Columna de vista previa */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Vista previa</p>
          <p className="text-xs text-muted-foreground">Con datos de ejemplo.</p>
          <div className="overflow-hidden rounded-md border">
            <div className="border-b bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Asunto: </span>
              <span className="font-medium">
                {renderizarPlantillaCliente(asunto || "—")}
              </span>
            </div>
            <div
              className="max-h-72 overflow-y-auto bg-white p-3 text-sm text-black"
              // El HTML lo escribe el profesional (contenido de confianza).
              dangerouslySetInnerHTML={{
                __html: renderizarHtmlCliente(cuerpoHtml || "<p>—</p>"),
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTerminado}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Crear plantilla"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
