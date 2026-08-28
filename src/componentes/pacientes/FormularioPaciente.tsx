"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { aFechaISO } from "@/lib/formato";
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

const ETIQUETAS_SEXO: Record<(typeof SEXOS_BIOLOGICOS)[number], string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

/** Valor del select cuando el sexo todavía no se cargó. */
const SIN_SEXO = "SIN_DATO";

interface PropsFormularioPaciente {
  pacienteInicial?: PacienteSalidaDto | null;
  onTerminado: () => void;
}

/** Formulario reutilizable para crear y editar pacientes. */
export function FormularioPaciente({ pacienteInicial, onTerminado }: PropsFormularioPaciente) {
  const { crear, actualizar } = usePacientes();
  const editando = Boolean(pacienteInicial);

  // En el alta la contraseña es obligatoria (se crea la cuenta del paciente);
  // en la edición no se pide (no se cambia la contraseña acá).
  const esquema = useMemo(
    () =>
      z.object({
        nombre: z.string().min(1, "El nombre es obligatorio"),
        apellido: z.string().min(1, "El apellido es obligatorio"),
        email: z.string().email("Email inválido"),
        telefono: z.string().optional(),
        fechaNacimiento: z.string().optional(),
        sexo: z.enum([...SEXOS_BIOLOGICOS, SIN_SEXO]),
        notas: z.string().optional(),
        password: editando
          ? z.string().optional()
          : z.string().min(6, "Mínimo 6 caracteres"),
      }),
    [editando],
  );
  type DatosFormulario = z.infer<typeof esquema>;

  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: pacienteInicial?.nombre ?? "",
      apellido: pacienteInicial?.apellido ?? "",
      email: pacienteInicial?.email ?? "",
      telefono: pacienteInicial?.telefono ?? "",
      fechaNacimiento: aFechaISO(pacienteInicial?.fechaNacimiento),
      sexo: pacienteInicial?.sexo ?? SIN_SEXO,
      notas: pacienteInicial?.notas ?? "",
      password: "",
    },
  });

  const enviando = crear.isPending || actualizar.isPending;

  function alEnviar(datos: DatosFormulario) {
    const base = {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      telefono: datos.telefono?.trim() ? datos.telefono : null,
      fechaNacimiento: datos.fechaNacimiento ? new Date(datos.fechaNacimiento) : null,
      sexo: datos.sexo === SIN_SEXO ? null : datos.sexo,
      notas: datos.notas?.trim() ? datos.notas : null,
    };

    if (pacienteInicial) {
      actualizar.mutate({ id: pacienteInicial.id, ...base }, { onSuccess: onTerminado });
    } else {
      crear.mutate({ ...base, password: datos.password ?? "" }, { onSuccess: onTerminado });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
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
              <FormMessage />
            </FormItem>
          )}
        />

        {!editando && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña de acceso del paciente</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Mínimo 6 caracteres" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  El paciente iniciará sesión con su email y esta contraseña.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
              <p className="text-xs text-muted-foreground">
                Lo usa la antropometría: el fraccionamiento en 5 masas, el peso
                ideal y el metabolismo basal tienen constantes distintas por sexo.
              </p>
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
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onTerminado} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear paciente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
