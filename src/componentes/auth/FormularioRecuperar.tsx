"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const esquema = z.object({
  email: z.string().email("Email inválido"),
});
type Datos = z.infer<typeof esquema>;

/**
 * Formulario "¿Olvidaste tu contraseña?": pide el email y dispara el envío del
 * enlace de recuperación. Muestra siempre un mensaje neutro (no revela si el
 * email existe) para no permitir enumeración de cuentas.
 */
export function FormularioRecuperar() {
  const { solicitarRecuperacion } = useAutenticacion();
  const [enviado, setEnviado] = useState(false);

  const form = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { email: "" },
  });

  async function alEnviar(datos: Datos) {
    await solicitarRecuperacion.mutateAsync({ email: datos.email });
    setEnviado(true);
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <LogoConsultorio />
      <Card className="w-full">
        {enviado ? (
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Revisá tu correo</p>
              <p className="text-sm text-muted-foreground">
                Si el email pertenece a una cuenta, te enviamos un enlace para
                elegir una contraseña nueva. Vence en 1 hora.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
              <CardDescription>
                Ingresá tu email y te enviamos un enlace para restablecerla.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(alEnviar)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="vos@ejemplo.com"
                            autoComplete="email"
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
                    disabled={solicitarRecuperacion.isPending}
                  >
                    {solicitarRecuperacion.isPending ? "Enviando…" : "Enviar enlace"}
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
