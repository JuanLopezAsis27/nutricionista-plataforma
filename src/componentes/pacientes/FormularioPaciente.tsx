"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type {
  AltaPacienteSalidaDto,
  PacienteSalidaDto,
} from "@/aplicacion/dtos/paciente.dto";
import { SEXOS_BIOLOGICOS } from "@/dominio/servicios/composicionCorporal";
import { usePacientes } from "@/lib/hooks/usePacientes";
import { useEstablecimientos } from "@/lib/hooks/useEstablecimientos";
import { aFechaISO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";
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
import {
  CamposAccesoPortal,
  accesoDelFormulario,
  camposAccesoEsquema,
  validarCamposAcceso,
} from "./CamposAccesoPortal";
import { ResultadoAccesoPortal } from "./ResultadoAccesoPortal";
import { AvisoEmailRepetido } from "./AvisoEmailRepetido";

/**
 * Esquema del formulario de paciente.
 *
 * Se extrae del componente y se exporta para poder verificar en un test que no
 * diverge del DTO que valida el servidor (`crearPacienteConAccesoDto`).
 *
 * La contraseña usa `passwordNuevaDto`, la política única de la app, en vez de
 * una regla propia. Antes había acá un `min(6, "Mínimo 6 caracteres")` mientras
 * el servidor exigía 12 y rechazaba las obvias: el formulario aceptaba lo que
 * la mutación después tiraba, y el nutricionista veía un error que su pantalla
 * decía que no correspondía. Ahora esa regla, y la del nombre de usuario, viven
 * en `validarCamposAcceso` (migración 80: el acceso al portal es opcional).
 *
 * El email es de CONTACTO y opcional (migración 79).
 *
 * @param editando al editar no se piden datos de acceso: la cuenta se
 * administra desde «Acceso al portal», en la ficha.
 */
export function crearEsquemaPaciente(editando: boolean) {
  const esquema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    apellido: z.string().min(1, "El apellido es obligatorio"),
    email: z.union([z.literal(""), z.string().trim().email("Email inválido")]),
    telefono: z.string().optional(),
    fechaNacimiento: z.string().optional(),
    sexo: z.enum([...SEXOS_BIOLOGICOS, SIN_SEXO]),
    /**
     * Id de la sede habitual, o SIN_SEDE. Ver el campo en el formulario.
     *
     * Es OPCIONAL, como en `crearPacienteDto`, y eso no es un detalle: este
     * esquema lo comparten DOS formularios y solo uno dibuja el campo —el alta
     * desde documento no lo muestra—. Mientras fue obligatorio, ahí llegaba
     * `undefined`, Zod lo rechazaba y `handleSubmit` se negaba a llamar al
     * envío. Como el campo no está en pantalla, tampoco había un
     * `<FormMessage>` donde apareciera el motivo: el botón "Crear paciente"
     * simplemente no hacía NADA, sin error en consola ni pedido en la red.
     *
     * Un campo que un consumidor no dibuja no puede ser obligatorio para él.
     * `AltaPacienteDesdeDocumento` además pasa un `onInvalid` a `handleSubmit`,
     * para que un rechazo así no vuelva a ser invisible.
     */
    establecimientoHabitualId: z.string().optional(),
    notas: z.string().optional(),
    ...camposAccesoEsquema,
  });
  return esquema.superRefine((datos, ctx) => {
    if (!editando) validarCamposAcceso(datos, ctx);
  });
}

const ETIQUETAS_SEXO: Record<(typeof SEXOS_BIOLOGICOS)[number], string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
};

/** Valor del select cuando el sexo todavía no se cargó. */
const SIN_SEXO = "SIN_DATO";

/**
 * Valor del select cuando no hay sede habitual.
 *
 * Existe porque «ninguna» es una respuesta válida y frecuente: el paciente que
 * va indistintamente a las dos no tiene una sede habitual, y forzarlo a elegir
 * una convertiría una preferencia en una pertenencia falsa.
 */
const SIN_SEDE = "SIN_SEDE";

interface PropsFormularioPaciente {
  pacienteInicial?: PacienteSalidaDto | null;
  onTerminado: () => void;
}

/** Formulario reutilizable para crear y editar pacientes. */
export function FormularioPaciente({
  pacienteInicial,
  onTerminado,
}: PropsFormularioPaciente) {
  const { crear, actualizar } = usePacientes();
  // Después del alta, lo que hay que entregarle a la persona (credenciales o
  // código). Se muestra acá mismo, antes de cerrar.
  const [alta, setAlta] = useState<{
    resultado: AltaPacienteSalidaDto;
    contrasena: string | null;
  } | null>(null);
  const { listar: listarSedes } = useEstablecimientos();
  const sedes = listarSedes().data ?? [];
  const editando = Boolean(pacienteInicial);

  // En el alta se pregunta por el acceso al portal; en la edición no (la
  // cuenta se administra desde la ficha).
  const esquema = useMemo(() => crearEsquemaPaciente(editando), [editando]);
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
      establecimientoHabitualId:
        pacienteInicial?.establecimientoHabitualId ?? SIN_SEDE,
      notas: pacienteInicial?.notas ?? "",
      darAcceso: true,
      nombreUsuario: "",
      usuarioObligatorio: false,
      password: "",
    },
  });

  const enviando = crear.isPending || actualizar.isPending;

  function alEnviar(datos: DatosFormulario) {
    const base = {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email.trim() || null,
      telefono: datos.telefono?.trim() ? datos.telefono : null,
      fechaNacimiento: datos.fechaNacimiento
        ? new Date(datos.fechaNacimiento)
        : null,
      sexo: datos.sexo === SIN_SEXO ? null : datos.sexo,
      establecimientoHabitualId:
        !datos.establecimientoHabitualId ||
        datos.establecimientoHabitualId === SIN_SEDE
          ? null
          : datos.establecimientoHabitualId,
      notas: datos.notas?.trim() ? datos.notas : null,
    };

    if (pacienteInicial) {
      actualizar.mutate(
        {
          id: pacienteInicial.id,
          ...base,
          // Testigo del bloqueo optimista: la versión que se abrió. Este
          // formulario manda TODOS sus campos en cada guardado, así que sin
          // esto dos personas editando la misma ficha se pisan en silencio —
          // el que guarda segundo devuelve a su valor viejo todo lo que el
          // primero haya cambiado.
          actualizadoEn: pacienteInicial.actualizadoEn,
        },
        { onSuccess: onTerminado },
      );
    } else {
      const acceso = accesoDelFormulario(datos);
      crear.mutate(
        { ...base, acceso },
        {
          onSuccess: (resultado) => {
            if (resultado.acceso.tipo === "SIN_CUENTA") onTerminado();
            else setAlta({ resultado, contrasena: acceso?.password ?? null });
          },
        },
      );
    }
  }

  if (alta) {
    return (
      <ResultadoAccesoPortal
        nombrePaciente={`${alta.resultado.nombre} ${alta.resultado.apellido}`}
        resultado={alta.resultado.acceso}
        contrasena={alta.contrasena}
        onListo={onTerminado}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
        {/* En el alta, dos columnas en desktop: los datos a la izquierda y el
            acceso al portal a la derecha. Abajo de todo, en una sola columna,
            quedaba fuera de la vista y un profesional nuevo no lo encontraba. */}
        <div
          className={cn(
            !editando && "grid gap-6 md:grid-cols-2 md:items-start",
          )}
        >
          <div className="space-y-4">
            {!editando && <TituloSeccion>Datos del paciente</TituloSeccion>}
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
                  <FormLabel>Email de contacto</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Opcional. Es a dónde le escribimos (bienvenida,
                    recordatorios); sin email, esos avisos no le llegan por este
                    medio. Puede ser el de un familiar y repetirse entre
                    pacientes.
                  </p>
                  <AvisoEmailRepetido
                    email={field.value}
                    pacienteId={pacienteInicial?.id}
                  />
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
                  <p className="text-xs text-muted-foreground">
                    Lo usa la antropometría: el fraccionamiento en 5 masas, el
                    peso ideal y el metabolismo basal tienen constantes
                    distintas por sexo.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Con una sola sede no se pregunta: no hay preferencia que expresar. */}
            {sedes.length > 1 && (
              <FormField
                control={form.control}
                name="establecimientoHabitualId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Establecimiento habitual</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SIN_SEDE}>
                          Sin preferencia
                        </SelectItem>
                        {sedes.map((sede) => (
                          <SelectItem key={sede.id} value={sede.id}>
                            {sede.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Solo precarga el formulario de turno. El paciente puede
                      atenderse en cualquier establecimiento.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
          </div>

          {!editando && (
            <div className="space-y-4 md:border-l md:pl-6">
              <TituloSeccion>Acceso al portal</TituloSeccion>
              <CamposAccesoPortal />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
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
              : editando
                ? "Guardar cambios"
                : "Crear paciente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function TituloSeccion({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>
  );
}
