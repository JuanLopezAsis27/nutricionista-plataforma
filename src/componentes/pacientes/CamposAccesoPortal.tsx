"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import { Wand2 } from "lucide-react";
import {
  passwordNuevaDto,
  LARGO_MINIMO_PASSWORD,
} from "@/aplicacion/dtos/password";
import type { DatosAccesoPortalDto } from "@/aplicacion/dtos/acceso-portal.dto";
import {
  REGLA_NOMBRE_USUARIO,
  esNombreUsuarioValido,
  normalizarNombreUsuario,
} from "@/dominio/servicios/nombreUsuario";
import { useAccesoPortal } from "@/lib/hooks/useAccesoPortal";
import { useRevisionEmail } from "@/lib/hooks/useRevisionEmail";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";

/**
 * Los campos del acceso al portal en un formulario de alta (migración 80):
 * si se le da cuenta, con qué usuario y con qué contraseña.
 *
 * Los comparten el alta normal y el alta desde documento, y los dos validan
 * con `validarCamposAcceso`, que es la misma regla que aplica el servidor:
 *
 * - sin acceso, no se pide nada (ficha sin portal);
 * - con acceso, la contraseña pasa por la política única de la app;
 * - el nombre de usuario es obligatorio solo si el paciente no va a poder
 *   entrar con su email: porque no tiene, o porque ese email ya es el ingreso
 *   de otra cuenta del consultorio (un hermano). Si no, es opcional y la
 *   pantalla ni lo muestra de entrada: parecía obligatorio y confundía.
 */
export const camposAccesoEsquema = {
  darAcceso: z.boolean(),
  nombreUsuario: z.string().optional(),
  password: z.string().optional(),
  /**
   * No se escribe: lo pone `CamposAccesoPortal` según lo que contestó el
   * servidor sobre el email (`useRevisionEmail`), para que la validación del
   * formulario pida el usuario en el mismo caso que lo va a pedir el alta.
   */
  usuarioObligatorio: z.boolean().optional(),
};

/** Los valores que dibuja `CamposAccesoPortal`, más el email del que depende. */
interface ValoresAcceso {
  email?: string;
  darAcceso: boolean;
  nombreUsuario?: string;
  password?: string;
  usuarioObligatorio?: boolean;
  nombre: string;
  apellido: string;
}

/** Regla compartida: ver el comentario de `camposAccesoEsquema`. */
export function validarCamposAcceso(
  datos: Omit<ValoresAcceso, "nombre" | "apellido">,
  ctx: z.RefinementCtx,
): void {
  if (!datos.darAcceso) return;

  const password = passwordNuevaDto.safeParse(datos.password ?? "");
  if (!password.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["password"],
      message: password.error.issues[0]?.message ?? "Contraseña inválida",
    });
  }

  const usuario = normalizarNombreUsuario(datos.nombreUsuario ?? "");
  if (!usuario && !datos.email?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombreUsuario"],
      message:
        "Sin email, elegí un nombre de usuario: es con lo que va a entrar.",
    });
  } else if (!usuario && datos.usuarioObligatorio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombreUsuario"],
      message:
        "Ese email ya lo usa otra cuenta para entrar: elegí un nombre de usuario.",
    });
  } else if (usuario && !esNombreUsuarioValido(usuario)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nombreUsuario"],
      message: REGLA_NOMBRE_USUARIO,
    });
  }
}

/** Lo que viaja al servidor: null si no se le da acceso. */
export function accesoDelFormulario(
  datos: Omit<ValoresAcceso, "nombre" | "apellido" | "email">,
): DatosAccesoPortalDto | null {
  if (!datos.darAcceso) return null;
  const nombreUsuario = normalizarNombreUsuario(datos.nombreUsuario ?? "");
  return {
    nombreUsuario: nombreUsuario || null,
    password: datos.password ?? "",
  };
}

/**
 * Los campos, para poner dentro de un `<Form>` cuyo esquema incluya
 * `camposAccesoEsquema` (y `nombre`, `apellido`, `email`).
 */
export function CamposAccesoPortal() {
  const form = useFormContext<ValoresAcceso>();
  const darAcceso = form.watch("darAcceso");
  const email = form.watch("email")?.trim();
  const nombre = form.watch("nombre")?.trim() ?? "";
  const apellido = form.watch("apellido")?.trim() ?? "";

  const { sugerirNombreUsuario } = useAccesoPortal();
  const sugerencia = sugerirNombreUsuario(
    { nombre, apellido },
    { enabled: darAcceso && Boolean(nombre || apellido) },
  );

  // ¿Puede entrar con su email? Sin email, no. Con un email que ya es el
  // ingreso de otra cuenta del consultorio (un hermano), tampoco.
  const revision = useRevisionEmail(email);
  const emailTomado = Boolean(email && revision?.esIngresoDeOtraCuenta);
  const usuarioObligatorio = !email || emailTomado;
  const { setValue } = form;
  useEffect(() => {
    setValue("usuarioObligatorio", usuarioObligatorio);
  }, [usuarioObligatorio, setValue]);

  // Con email propio, el usuario es opcional y va plegado; se despliega a
  // pedido, o solo si ya tiene algo escrito.
  const [quiereUsuario, setQuiereUsuario] = useState(false);
  const usuarioEscrito = Boolean(form.watch("nombreUsuario"));
  const mostrarUsuario = usuarioObligatorio || quiereUsuario || usuarioEscrito;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <FormField
        control={form.control}
        name="darAcceso"
        render={({ field }) => (
          <FormItem className="flex items-start gap-2 space-y-0">
            <FormControl>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={field.value}
                onChange={(evento) => field.onChange(evento.target.checked)}
              />
            </FormControl>
            <div className="space-y-0.5">
              <FormLabel className="font-medium">
                Darle acceso al portal
              </FormLabel>
              <p className="text-xs text-muted-foreground">
                Para ver su plan, sus turnos y cargar su diario. Si no, la ficha
                queda sin portal y se lo podés dar después desde ella.
              </p>
            </div>
          </FormItem>
        )}
      />

      {darAcceso && (
        <>
          <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
            {!email ? (
              <>
                No tiene email: va a entrar con un{" "}
                <strong>nombre de usuario</strong>.
              </>
            ) : emailTomado ? (
              <>
                <strong>{email}</strong> ya es con lo que entra{" "}
                {revision?.ingresoDe ? (
                  <strong>{revision.ingresoDe}</strong>
                ) : (
                  "otra cuenta"
                )}
                . Este paciente va a entrar con un{" "}
                <strong>nombre de usuario</strong>.
              </>
            ) : (
              <>
                Va a entrar con su email, <strong>{email}</strong>.
              </>
            )}
          </p>

          {!mostrarUsuario && (
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setQuiereUsuario(true)}
            >
              Agregar también un nombre de usuario (opcional)
            </button>
          )}

          {mostrarUsuario && (
            <FormField
              control={form.control}
              name="nombreUsuario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre de usuario
                    {usuarioObligatorio ? "" : " (opcional)"}
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        autoCapitalize="none"
                        placeholder={
                          sugerencia.data?.nombreUsuario ?? "juan.perez"
                        }
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    {sugerencia.data?.nombreUsuario && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Usar el sugerido"
                        aria-label="Usar el nombre de usuario sugerido"
                        onClick={() =>
                          form.setValue(
                            "nombreUsuario",
                            sugerencia.data?.nombreUsuario ?? "",
                            { shouldValidate: true },
                          )
                        }
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {usuarioObligatorio
                      ? "Sin un email propio para entrar, no puede recuperar la contraseña solo: se la restablecés vos desde su ficha."
                      : "Otra forma de entrar, además del email."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña de acceso del paciente</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    // Derivado de la constante, no escrito a mano: el
                    // placeholder anterior decía 6 y el servidor exigía 12.
                    placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Queda como provisional: el portal le recomienda cambiarla. Si
                  ya tiene cuenta con otro profesional, no se usa: le llega un
                  código para sumar este consultorio a su cuenta.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
}
