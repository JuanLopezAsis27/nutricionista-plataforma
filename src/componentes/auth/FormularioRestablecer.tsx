"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
import { useAutenticacion } from "@/lib/hooks/useAutenticacion";

const esquema = z
  .object({
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(72, "La contraseña es demasiado larga"),
    confirmar: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });
type Datos = z.infer<typeof esquema>;

/**
 * Formulario para elegir una contraseña nueva a partir del token recibido por
 * email. El token viene en la query (`?token=…`). Si es inválido o venció, el
 * backend responde con un error genérico.
 */
export function FormularioRestablecer({ token }: { token: string }) {
  const router = useRouter();
  const { restablecer } = useAutenticacion();
  const [mostrar, setMostrar] = useState(false);
  const [listo, setListo] = useState(false);

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
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo restablecer la contraseña.",
      );
    }
  }

  if (!token) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <LogoConsultorio />
        <Card className="w-full">
          <CardContent className="space-y-4 py-8 text-center">
            <p className="font-medium">Enlace inválido</p>
            <p className="text-sm text-muted-foreground">
              El enlace de recuperación no es válido. Pedí uno nuevo.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/recuperar">Solicitar un enlace nuevo</Link>
            </Button>
          </CardContent>
        </Card>
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
