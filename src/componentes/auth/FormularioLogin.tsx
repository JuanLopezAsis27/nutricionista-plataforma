"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/componentes/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/componentes/ui/form";
import { LogoConsultorio } from "@/componentes/marca/LogoConsultorio";
import {
  CODIGO_LOGIN_BLOQUEADO,
  CODIGO_LOGIN_INACTIVA,
} from "@/lib/autenticacion/codigosLogin";

const esquemaLogin = z.object({
  // Email o nombre de usuario (migración 80): sin validar la forma, igual que
  // el servidor (ver `identificadorLoginDto`).
  identificador: z.string().trim().min(1, "Ingresá tu email o tu usuario"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});
type DatosLogin = z.infer<typeof esquemaLogin>;

/**
 * Traduce el motivo del rechazo a algo que se pueda leer y accionar.
 *
 * El `code` lo pone `authorize` y solo llega en los casos que no revelan si la
 * cuenta existe (ver `auth.ts`). Sin `code` —contraseña incorrecta o email que
 * no está— queda el mensaje de siempre, que es deliberadamente el MISMO para
 * los dos: distinguirlos le diría a cualquiera qué emails tienen cuenta.
 */
function mensajeDeLogin(codigo: string | undefined): string {
  switch (codigo) {
    case CODIGO_LOGIN_BLOQUEADO:
      return "Demasiados intentos fallidos. Por seguridad la cuenta quedó bloqueada un rato; esperá unos minutos y volvé a probar.";
    case CODIGO_LOGIN_INACTIVA:
      return "Tu cuenta está desactivada. Escribile a tu nutricionista para que vuelva a habilitarla.";
    default:
      return "Usuario o contraseña incorrectos.";
  }
}

/** Formulario de inicio de sesión (email o usuario + password). */
export function FormularioLogin() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const form = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { identificador: "", password: "" },
  });

  async function alEnviar(datos: DatosLogin) {
    setEnviando(true);
    try {
      const resultado = await signIn("credentials", {
        identificador: datos.identificador,
        password: datos.password,
        redirect: false,
      });

      if (!resultado || resultado.error) {
        toast.error(mensajeDeLogin(resultado?.code));
        return;
      }

      // Rutea según el rol del usuario autenticado.
      const sesion = await getSession();
      const rol = sesion?.user.rol;
      const destino =
        rol === "SUPERADMIN"
          ? "/admin"
          : rol === "NUTRICIONISTA"
            ? "/dashboard"
            : "/mi-inicio";
      router.replace(destino);
      router.refresh();
    } catch {
      // Si `signIn` lanza (error de red, o una respuesta no-JSON del
      // callback, p. ej. un 500 del server) antes no se limpiaba `enviando`:
      // el botón quedaba en "Ingresando…" para siempre y sin ningún aviso.
      toast.error("No se pudo iniciar sesión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingresá con tu email o tu usuario y tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
              <FormField
                control={form.control}
                name="identificador"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email o usuario</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="vos@ejemplo.com"
                        autoComplete="username"
                        autoCapitalize="none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={mostrarPassword ? "text" : "password"}
                          autoComplete="current-password"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarPassword((v) => !v)}
                          aria-label={
                            mostrarPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        >
                          {mostrarPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Ingresando…" : "Ingresar"}
              </Button>
              <div className="text-center">
                <Link
                  href="/recuperar"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
