"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
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
import { useAutenticacion } from "@/lib/hooks/useAutenticacion";
import { passwordNuevaDto } from "@/aplicacion/dtos/password";
import { avisarError } from "@/lib/errores";

/**
 * Esquema del formulario. Se exporta para poder verificar en un test que no
 * diverge del DTO del servidor.
 *
 * La regla de la contraseña se IMPORTA de `passwordNuevaDto` en vez de
 * reescribirse. Antes había acá un `min(6)` propio mientras el servidor exigía
 * 12: el formulario daba por buena una contraseña que la mutación después
 * rechazaba, y en este flujo eso es especialmente cruel porque el usuario ya
 * perdió el acceso a su cuenta.
 */
export const esquema = z
  .object({
    password: passwordNuevaDto,
    confirmar: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
type Datos = z.infer<typeof esquema>;

/**
 * Formulario para elegir una contraseña nueva a partir del token recibido por
 * email. El token viene en la query (`?token=…`).
 *
 * **El enlace se verifica al abrir la página**, no al guardar. Antes el
 * formulario aparecía siempre y el token recién se validaba al enviar: pasada
 * la hora, el enlace «abría» igual y parecía que no vencía nunca —el usuario
 * completaba las dos contraseñas para recién ahí enterarse—.
 */
export function FormularioRestablecer({ token }: { token: string }) {
  const router = useRouter();
  const { restablecer, verificarToken } = useAutenticacion();
  const [mostrar, setMostrar] = useState(false);
  const [listo, setListo] = useState(false);

  const verificacion = verificarToken(
    { token },
    {
      enabled: token.length > 0,
      retry: false,
      // Una vez abierta, la página no vuelve a preguntar sola: si el enlace
      // vence mientras se escribe, lo dice el guardado (ver `alEnviar`).
      staleTime: Infinity,
      refetchOnWindowFocus: false,
    },
  );

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { password: "", confirmar: "" },
  });

  async function alEnviar(datos: Datos) {
    try {
      await restablecer.mutateAsync({ token, password: datos.password });
      setListo(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (error) {
      avisarError(error, "No se pudo restablecer la contraseña.");
      // Si venció mientras se escribía, la página pasa a decirlo en vez de
      // dejar el formulario como si todavía sirviera.
      void verificacion.refetch();
    }
  }

  if (!token || verificacion.data?.vigente === false) {
    return <EnlaceNoValido sinToken={!token} />;
  }

  if (verificacion.isLoading) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <LogoConsultorio />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        {listo ? (
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Contraseña actualizada</p>
              <p className="text-sm text-muted-foreground">
                Ya podés iniciar sesión con tu contraseña nueva. Te redirigimos…
              </p>
            </div>
            <Button asChild className="w-full">
              <Link href="/login">Ir al inicio de sesión</Link>
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
              <CardDescription>
                Elegí una contraseña nueva para tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(alEnviar)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={mostrar ? "text" : "password"}
                              autoComplete="new-password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setMostrar((v) => !v)}
                              aria-label={
                                mostrar
                                  ? "Ocultar contraseña"
                                  : "Mostrar contraseña"
                              }
                              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                            >
                              {mostrar ? (
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
                  <FormField
                    control={form.control}
                    name="confirmar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repetir contraseña</FormLabel>
                        <FormControl>
                          <Input
                            type={mostrar ? "text" : "password"}
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={restablecer.isPending}
                  >
                    {restablecer.isPending
                      ? "Guardando…"
                      : "Guardar contraseña"}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4" />
                      Volver
                    </Link>
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * El enlace no sirve: falta el token, venció (dura una hora) o ya se usó. No
 * se distingue cuál, igual que el error del servidor, y la salida es la misma
 * en los tres casos: pedir otro.
 */
function EnlaceNoValido({ sinToken }: { sinToken: boolean }) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        <CardContent className="space-y-4 py-8 text-center">
          <p className="font-medium">
            {sinToken ? "Enlace inválido" : "Este enlace ya no sirve"}
          </p>
          <p className="text-sm text-muted-foreground">
            {sinToken
              ? "El enlace de recuperación no es válido. Pedí uno nuevo."
              : "Los enlaces de recuperación vencen a la hora y sirven una sola vez. Pedí uno nuevo."}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/recuperar">Solicitar un enlace nuevo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
